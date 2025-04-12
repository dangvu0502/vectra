import { aql } from 'arangojs';
// Removed ArrayCursor type import as it seems problematic
import path from 'path';
// Removed duplicate: import { aql } from 'arangojs';
import { arangoDbClient, getEdgesCollection, getNodesCollection } from '../../core/arangodb/client.js';
import { DocumentNotFoundError } from '../../shared/errors.js';
import type { File as DbFileType } from '../file/file.schema';
import { llmProcessingQueue } from '@/core/queue/queues'; // Import the BullMQ queue
import type { LlmJobData } from '@/core/queue/queues';

// Define types for clarity
type ChunkMetadata = Record<string, any> & {
  h1?: string;
  h2?: string;
  h3?: string;
  h4?: string;
  h5?: string;
  h6?: string;
  chunk_text?: string; // Ensure chunk_text is part of the type if used
};

type ChunkData = {
  vectorId: string;
  metadata: ChunkMetadata; // Use the more specific type
};

type GraphTraversalDirection = 'any' | 'inbound' | 'outbound';

type GraphTraversalParams = {
  startNodeVectraIds: string[];
  graphDepth?: number;
  graphRelationshipTypes?: string[] | null;
  graphTraversalDirection?: GraphTraversalDirection; // Add direction parameter
};

type GraphTraversalResultItem = {
  start_node_vectra_id: string;
  start_node_data: any;
  neighbors: any[];
};

export class ArangoDbService {
  private static instance: ArangoDbService | null = null;
  private nodesCollection;
  private edgesCollection; // Add edges collection

  private constructor() {
    this.nodesCollection = getNodesCollection();
    this.edgesCollection = getEdgesCollection(); // Initialize edges collection
  }

  static getInstance(): ArangoDbService {
    if (!ArangoDbService.instance) {
      ArangoDbService.instance = new ArangoDbService();
    }
    return ArangoDbService.instance;
  }

  // --- Graph Update Methods ---

  async upsertGraphDataForFile(file: DbFileType, insertedChunkData: ChunkData[]): Promise<void> {
    if (!insertedChunkData || insertedChunkData.length === 0) {
      console.log(`ArangoDB: No chunk data provided for file ${file.id}, skipping graph update.`);
      return;
    }

    const now = new Date().toISOString();
    const documentNodeKey = `doc_${file.id}`;

    try {
      // 1. Upsert Document Node
      const documentNodeData = {
        vectra_id: file.id,
        node_type: 'document',
        name: file.filename,
        metadata: {
          original_metadata: file.metadata || {},
          created_at: file.created_at.toISOString(),
          file_type: path.extname(file.filename).toLowerCase(),
          user_id: file.user_id,
        },
        updatedAt: now,
      };
      // Use UPSERT AQL command for atomicity and clarity
      const upsertDocQuery = aql`
        UPSERT { _key: ${documentNodeKey} }
        INSERT {
          _key: ${documentNodeKey},
          createdAt: ${now},
          vectra_id: ${documentNodeData.vectra_id},
          node_type: ${documentNodeData.node_type},
          name: ${documentNodeData.name},
          metadata: ${documentNodeData.metadata},
          updatedAt: ${now}
        }
        UPDATE {
          updatedAt: ${now},
          name: ${documentNodeData.name},
          metadata: ${documentNodeData.metadata}
        }
        IN ${this.nodesCollection}
        RETURN NEW
      `;
      // Execute the query directly
      const docResult = await arangoDbClient.query(upsertDocQuery);
      const upsertedDoc = await docResult.all();
      if (upsertedDoc && upsertedDoc.length > 0) { // Check if NEW was returned
        console.log(`ArangoDB: Upserted document node ${documentNodeKey}`);
      } else {
         console.error(`ArangoDB: FAILED to upsert document node ${documentNodeKey}`);
         // Consider throwing an error here if doc upsert is critical
         // Let's ensure it throws if the document node fails, as it's fundamental
         if (!upsertedDoc || upsertedDoc.length === 0) {
             throw new Error(`ArangoDB: FAILED to upsert document node ${documentNodeKey}`);
         }
      }


      // 2. Delete Orphaned Chunk Nodes/Edges (Reinstated)
      const newChunkKeys = new Set(insertedChunkData.map(c => `chunk_${c.vectorId}`));
      // Use direct interpolation for collection names here as well for consistency
      const deleteOrphansQuery = aql`
        LET doc = DOCUMENT(${this.nodesCollection}, ${documentNodeKey})
        FILTER doc != null
        LET existingChunks = (
          FOR v, e IN 1..1 OUTBOUND doc ${this.edgesCollection}
            FILTER e.relationship_type == 'contains'
            RETURN { nodeKey: v._key, edgeKey: e._key }
        )
        LET orphans = (
          FOR item IN existingChunks
            FILTER item.nodeKey NOT IN ${Array.from(newChunkKeys)}
            RETURN item
        )
        FOR orphan IN orphans
          REMOVE { _key: orphan.edgeKey } IN ${this.edgesCollection} OPTIONS { ignoreErrors: true }
          REMOVE { _key: orphan.nodeKey } IN ${this.nodesCollection} OPTIONS { ignoreErrors: true }
        RETURN LENGTH(orphans)
      `;
      // Execute directly
      const deleteCursor = await arangoDbClient.query(deleteOrphansQuery);
      const deletedCount = (await deleteCursor.all())[0] || 0;
      if (deletedCount > 0) {
        console.log(`ArangoDB: Deleted ${deletedCount} orphaned chunk nodes/edges for file ${file.id}`);
      }

      // 3. Process Headers and Create Structural Nodes/Edges
      const headerHierarchy: Record<string, { nodeKey: string; parentKey: string | null; level: number; title: string }> = {};
      const sectionUpsertPromises: Promise<any>[] = [];
      let lastHeaderKeys: (string | null)[] = [null, null, null, null, null, null]; // Track last seen header at each level

      // First pass: Identify unique headers and their hierarchy
      insertedChunkData.forEach(chunk => {
        let currentParentKey: string | null = documentNodeKey; // Start with document as parent
        for (let level = 1; level <= 6; level++) {
          const headerKey = `h${level}` as keyof ChunkMetadata;
          const headerTitle = chunk.metadata[headerKey];

          if (headerTitle) {
            // Normalize title for key generation (simple example)
            const normalizedTitle = headerTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
            const sectionNodeKey = `section_l${level}_${documentNodeKey}_${normalizedTitle}`;

            if (!headerHierarchy[sectionNodeKey]) {
               const parentNodeKey = lastHeaderKeys[level - 1] || documentNodeKey; // Link to previous level's header or doc
               headerHierarchy[sectionNodeKey] = {
                 nodeKey: sectionNodeKey,
                 parentKey: parentNodeKey,
                 level: level,
                 title: headerTitle
               };
               lastHeaderKeys[level] = sectionNodeKey; // Update last seen key for this level
               // Reset lower levels
               for (let j = level + 1; j <= 6; j++) {
                   lastHeaderKeys[j] = null;
               }
            }
             currentParentKey = sectionNodeKey; // This header becomes the parent for subsequent levels/chunks under it
          } else {
            // If no header at this level, subsequent levels link to the last known parent
             lastHeaderKeys[level] = currentParentKey;
          }
        }
      });

       // Second pass: Upsert section nodes and 'has_section' edges
       for (const sectionKey in headerHierarchy) {
           const sectionInfo = headerHierarchy[sectionKey];
           const sectionNodeData = {
               node_type: 'section',
               name: sectionInfo.title,
               metadata: { level: sectionInfo.level, title: sectionInfo.title },
               updatedAt: now,
           };

           // Upsert Section Node
           const upsertSectionQuery = aql`
               UPSERT { _key: ${sectionKey} }
               INSERT {
                 _key: ${sectionKey}, createdAt: ${now}, node_type: ${sectionNodeData.node_type},
                 name: ${sectionNodeData.name}, metadata: ${sectionNodeData.metadata}, updatedAt: ${sectionNodeData.updatedAt}
               }
               UPDATE { updatedAt: ${now}, name: ${sectionNodeData.name}, metadata: ${sectionNodeData.metadata} }
               IN ${this.nodesCollection} RETURN NEW`;
           sectionUpsertPromises.push(
               arangoDbClient.query(upsertSectionQuery).catch((err: any) => {
                   console.error(`ArangoDB: FAILED to upsert section node ${sectionKey}`, err); throw err;
               })
           );

           // Upsert 'has_section' Edge (or 'contains' if parent is document)
           if (sectionInfo.parentKey) {
               const parentNodeId = sectionInfo.parentKey.startsWith('doc_')
                   ? `${this.nodesCollection.name}/${sectionInfo.parentKey}`
                   : `${this.nodesCollection.name}/${sectionInfo.parentKey}`; // Assuming sections are also in nodesCollection
               const childNodeId = `${this.nodesCollection.name}/${sectionKey}`;
               const relationshipType = sectionInfo.parentKey.startsWith('doc_') ? 'has_section' : 'has_subsection'; // Or just use 'has_child' ? Let's stick to plan for now.
               const structEdgeKey = `edge_${sectionInfo.parentKey}_${relationshipType}_${sectionKey}`;
               const structEdgeData = { _from: parentNodeId, _to: childNodeId, relationship_type: relationshipType, updatedAt: now };

               const upsertStructEdgeQuery = aql`
                   UPSERT { _key: ${structEdgeKey} }
                   INSERT {
                     _key: ${structEdgeKey}, createdAt: ${now}, _from: ${structEdgeData._from}, _to: ${structEdgeData._to},
                     relationship_type: ${structEdgeData.relationship_type}, updatedAt: ${structEdgeData.updatedAt}
                   }
                   UPDATE { updatedAt: ${now} }
                   IN ${this.edgesCollection}`;
               sectionUpsertPromises.push(
                   arangoDbClient.query(upsertStructEdgeQuery).catch((err: any) => {
                       console.error(`ArangoDB: FAILED to upsert structural edge ${structEdgeKey}`, err); throw err;
                   })
               );
           }
       }
       // Wait for all section/structural edge upserts before proceeding to chunks
       await Promise.all(sectionUpsertPromises);
       console.log(`ArangoDB: Completed upserting ${Object.keys(headerHierarchy).length} section nodes and structural edges for file ${file.id}`);


      // 4. Upsert Chunk Nodes and 'contains' Edges (linking to sections) + Enqueue Jobs
      const chunkUpsertPromises: Promise<any>[] = [];

      for (const chunkData of insertedChunkData) {
        const chunkNodeKey = `chunk_${chunkData.vectorId}`;
        const chunkNodeData = {
          vectra_id: chunkData.vectorId, // Keep original vector ID reference
          node_type: 'chunk', // Keep node type as chunk
          name: `Chunk of ${file.filename}`, // Keep original name or derive from section?
          metadata: chunkData.metadata, // Includes original metadata + headers
          text_snippet: chunkData.metadata?.chunk_text?.substring(0, 100) || '', // Keep snippet
          updatedAt: now,
        };

        // Determine parent section node for this chunk
        let parentSectionKey: string | null = null;
        for (let level = 6; level >= 1; level--) {
            const headerKey = `h${level}` as keyof ChunkMetadata;
            const headerTitle = chunkData.metadata[headerKey];
            if (headerTitle) {
                const normalizedTitle = headerTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
                parentSectionKey = `section_l${level}_${documentNodeKey}_${normalizedTitle}`;
                break; // Found the most specific header
            }
        }
        // Fallback to document node if no headers found for chunk (should be rare with markdown strategy)
        const parentNodeKey = parentSectionKey || documentNodeKey;
        const parentNodeId = `${this.nodesCollection.name}/${parentNodeKey}`;
        const chunkNodeId = `${this.nodesCollection.name}/${chunkNodeKey}`;

        // Define 'contains' edge from section/document to chunk
        const containsEdgeKey = `edge_${parentNodeKey}_contains_${chunkNodeKey}`;
        const containsEdgeData = {
          _from: parentNodeId,
          _to: chunkNodeId,
          relationship_type: 'contains',
          updatedAt: now,
        };


        // Upsert Chunk Node (same as before)
         const upsertChunkQuery = aql`
           UPSERT { _key: ${chunkNodeKey} }
           INSERT {
             _key: ${chunkNodeKey}, createdAt: ${now}, vectra_id: ${chunkNodeData.vectra_id}, node_type: ${chunkNodeData.node_type},
             name: ${chunkNodeData.name}, metadata: ${chunkNodeData.metadata}, text_snippet: ${chunkNodeData.text_snippet}, updatedAt: ${now}
           }
           UPDATE {
             updatedAt: ${now}, name: ${chunkNodeData.name}, metadata: ${chunkNodeData.metadata}, text_snippet: ${chunkNodeData.text_snippet}
           }
           IN ${this.nodesCollection}
           RETURN NEW`;

        // Chain the 'contains' edge upsert and job enqueues after successful chunk upsert
        const chunkProcessingPromise = arangoDbClient.query(upsertChunkQuery)
          .then(async (cursor) => {
            const upsertedChunk = await cursor.next();
            if (!upsertedChunk) {
              throw new Error(`ArangoDB: Failed to confirm upsert for chunk node ${chunkNodeKey}`);
            }
            console.log(`ArangoDB: Upserted chunk node ${chunkNodeKey}`);

            // Upsert the 'contains' edge from section/document to chunk
            const upsertContainsEdgeQuery = aql`
              UPSERT { _key: ${containsEdgeKey} }
              INSERT {
                _key: ${containsEdgeKey}, createdAt: ${now}, _from: ${containsEdgeData._from}, _to: ${containsEdgeData._to},
                relationship_type: ${containsEdgeData.relationship_type}, updatedAt: ${now}
              }
              UPDATE { updatedAt: ${now} }
              IN ${this.edgesCollection}`;
            await arangoDbClient.query(upsertContainsEdgeQuery);
            console.log(`ArangoDB: Upserted 'contains' edge ${containsEdgeKey}`);

            // --- Enqueue LLM Jobs (Relationship + Entity) ---
            const textForLlm = chunkNodeData.metadata?.chunk_text || chunkNodeData.text_snippet;
            if (textForLlm) {
              // Relationship Job
              const relJobData: LlmJobData = {
                jobType: 'relationshipExtraction',
                chunkId: chunkNodeKey,
                chunkText: textForLlm,
              };
              try {
                await llmProcessingQueue.add(`rel_${chunkNodeKey}`, relJobData);
                console.log(`ArangoDB: Enqueued relationship extraction job for chunk ${chunkNodeKey}`);
              } catch (queueError) {
                console.error(`ArangoDB: FAILED to enqueue relationship job for chunk ${chunkNodeKey}`, queueError);
              }

              // Entity Job
              const entityJobData: LlmJobData = {
                jobType: 'entityExtraction',
                chunkId: chunkNodeKey,
                chunkText: textForLlm,
              };
              try {
                await llmProcessingQueue.add(`ent_${chunkNodeKey}`, entityJobData);
                console.log(`ArangoDB: Enqueued entity extraction job for chunk ${chunkNodeKey}`);
              } catch (queueError) {
                console.error(`ArangoDB: FAILED to enqueue entity job for chunk ${chunkNodeKey}`, queueError);
              }
            } else {
               console.warn(`ArangoDB: No text found for chunk ${chunkNodeKey}, skipping LLM job enqueues.`);
            }
            // --- End Enqueue ---

          })
          .catch((err: any) => {
            console.error(`ArangoDB: FAILED operation for chunk ${chunkNodeKey} or its edge/jobs`, err);
            throw err; // Propagate error to Promise.all
          });

        chunkUpsertPromises.push(chunkProcessingPromise); // Add chunk processing promise to array

      } // End chunk loop

      // Wait for all chunk/edge/job processing and log success/failure
      try {
          await Promise.all(chunkUpsertPromises); // Wait for all chunk-related promises
          console.log(`ArangoDB: Successfully completed processing for ${insertedChunkData.length} chunks (including edge creation and job enqueues) for file ${file.id}`);
      } catch(promiseAllError) {
          console.error(`ArangoDB: At least one chunk processing operation failed for file ${file.id}`, promiseAllError);
          throw promiseAllError; // Ensure the overall method fails if any part fails
      }
      // Note: Verification step was removed for debugging, consider re-adding if needed

    } catch (error) {
      console.error(`ArangoDB Error in upsertGraphDataForFile for file ${file.id}: ${error instanceof Error ? error.message : error}`);
      // Optionally re-throw or handle more gracefully
      throw error;
    }
  }

  async deleteGraphDataForFile(fileId: string): Promise<void> {
    const documentNodeKey = `doc_${fileId}`;
    const documentNodeId = `${this.nodesCollection.name}/${documentNodeKey}`;

    try {
      const query = aql`
        LET doc = DOCUMENT(${documentNodeId})
        FILTER doc != null
        LET containedChunks = (
          FOR v, e IN 1..1 OUTBOUND doc ${this.edgesCollection}
            FILTER e.relationship_type == 'contains'
            RETURN { node: v, edge: e }
        )
        FOR item IN containedChunks
          REMOVE item.edge IN ${this.edgesCollection} OPTIONS { ignoreErrors: true }
          REMOVE item.node IN ${this.nodesCollection} OPTIONS { ignoreErrors: true }
        REMOVE doc IN ${this.nodesCollection}
        RETURN {
          removedDoc: doc._key,
          removedChunks: LENGTH(containedChunks)
        }
      `;

      const cursor = await arangoDbClient.query(query);
      const result = await cursor.all();

      if (result.length > 0 && result[0]) {
        console.log(`ArangoDB: Removed document node ${result[0].removedDoc} and ${result[0].removedChunks} associated chunk nodes/edges for file ${fileId}`);
      } else {
        console.log(`ArangoDB: Document node for file ${fileId} not found or already removed.`);
      }
    } catch (error) {
      console.error(`ArangoDB Error deleting graph data for file ${fileId}: ${error instanceof Error ? error.message : error}`);
      // Optionally re-throw or handle more gracefully
      throw error;
    }
  }

  async createEdge(edgeData: { _from: string; _to: string; [key: string]: any }): Promise<any> {
    try {
      // Add createdAt/updatedAt timestamps if not provided
      const now = new Date().toISOString();
      const dataToInsert = {
        ...edgeData,
        createdAt: edgeData.createdAt || now,
        updatedAt: edgeData.updatedAt || now,
      };
      // Use insert, assuming edges are unique based on _from, _to, and type,
      // or handle potential duplicates if needed (e.g., UPSERT or check first)
      const result = await this.edgesCollection.save(dataToInsert, { returnNew: true });
      console.log(`ArangoDB: Created edge from ${edgeData._from} to ${edgeData._to} with type ${edgeData.type || 'unknown'}`);
      return result.new;
    } catch (error) {
      console.error(`ArangoDB Error creating edge: ${error instanceof Error ? error.message : error}`, edgeData);
      // Decide on error handling: re-throw, return null, etc.
      throw error; // Re-throw for the worker to potentially handle retries
    }
  }

  // --- Graph Query Methods ---

  async performGraphTraversal(params: GraphTraversalParams): Promise<GraphTraversalResultItem[]> {
    // Destructure the new parameter with a default value
    const { startNodeVectraIds, graphDepth, graphRelationshipTypes, graphTraversalDirection = 'any' } = params;

    if (!startNodeVectraIds || startNodeVectraIds.length === 0) {
      return [];
    }
    console.log(`DEBUG: performGraphTraversal received vector IDs: ${JSON.stringify(startNodeVectraIds)}`); // Log received IDs

    try {
      // Define bind variables (collections are handled implicitly by aql tag)
      const bindVars = {
        nodeVectraIds: startNodeVectraIds,
        graphDepth: graphDepth ?? 1,
        graphRelationshipTypes: graphRelationshipTypes && graphRelationshipTypes.length > 0 ? graphRelationshipTypes : null,
      };

      // Select the correct AQL query object based on direction
      let query: ReturnType<typeof aql>; // Explicitly type query
      if (graphTraversalDirection === 'inbound') {
        query = aql`
          LET startNodes = (FOR node IN ${this.nodesCollection} FILTER node.node_type == 'chunk' AND node.vectra_id IN @nodeVectraIds RETURN node)
          FOR startNode IN startNodes
            LET neighbors = (
              FOR v, e, p IN 0..@graphDepth INBOUND startNode ${this.edgesCollection}
                OPTIONS { uniqueVertices: "global", bfs: true }
                FILTER @graphRelationshipTypes == null OR e.relationship_type IN @graphRelationshipTypes
                FILTER v._key != startNode._key
                RETURN DISTINCT { _key: v._key, node_type: v.node_type, name: v.name, vectra_id: v.vectra_id, metadata: v.metadata, relationship_type: e.relationship_type, depth: LENGTH(p.edges) }
            )
            RETURN { start_node_vectra_id: startNode.vectra_id, start_node_data: { arangodb_key: startNode._key, arangodb_node_type: startNode.node_type, arangodb_name: startNode.name, arangodb_text_snippet: startNode.text_snippet }, neighbors: neighbors }
        `;
      } else if (graphTraversalDirection === 'outbound') {
        query = aql`
          LET startNodes = (FOR node IN ${this.nodesCollection} FILTER node.node_type == 'chunk' AND node.vectra_id IN @nodeVectraIds RETURN node)
          FOR startNode IN startNodes
            LET neighbors = (
              FOR v, e, p IN 0..@graphDepth OUTBOUND startNode ${this.edgesCollection}
                OPTIONS { uniqueVertices: "global", bfs: true }
                FILTER @graphRelationshipTypes == null OR e.relationship_type IN @graphRelationshipTypes
                FILTER v._key != startNode._key
                RETURN DISTINCT { _key: v._key, node_type: v.node_type, name: v.name, vectra_id: v.vectra_id, metadata: v.metadata, relationship_type: e.relationship_type, depth: LENGTH(p.edges) }
            )
            RETURN { start_node_vectra_id: startNode.vectra_id, start_node_data: { arangodb_key: startNode._key, arangodb_node_type: startNode.node_type, arangodb_name: startNode.name, arangodb_text_snippet: startNode.text_snippet }, neighbors: neighbors }
        `;
      } else { // Default to 'any'
        query = aql`
          LET startNodes = (FOR node IN ${this.nodesCollection} FILTER node.node_type == 'chunk' AND node.vectra_id IN @nodeVectraIds RETURN node)
          FOR startNode IN startNodes
            LET neighbors = (
              FOR v, e, p IN 0..@graphDepth ANY startNode ${this.edgesCollection}
                OPTIONS { uniqueVertices: "global", bfs: true }
                FILTER @graphRelationshipTypes == null OR e.relationship_type IN @graphRelationshipTypes
                FILTER v._key != startNode._key
                RETURN DISTINCT { _key: v._key, node_type: v.node_type, name: v.name, vectra_id: v.vectra_id, metadata: v.metadata, relationship_type: e.relationship_type, depth: LENGTH(p.edges) }
            )
            RETURN { start_node_vectra_id: startNode.vectra_id, start_node_data: { arangodb_key: startNode._key, arangodb_node_type: startNode.node_type, arangodb_name: startNode.name, arangodb_text_snippet: startNode.text_snippet }, neighbors: neighbors }
        `;
      }

      // Merge our explicit bind variables into the query object's bindVars
      query.bindVars = { ...query.bindVars, ...bindVars };

      // Execute the query using the combined query object
      const cursor = await arangoDbClient.query(query); // Pass only the query object
      // Explicitly cast the result to the expected type
      const results = (await cursor.all()) as GraphTraversalResultItem[];
      console.log(`DEBUG: performGraphTraversal (direction: ${graphTraversalDirection}) found ${results.length} items matching input IDs.`);
      return results;

    } catch (error) {
      console.error(`ArangoDB Error during graph traversal: ${error instanceof Error ? error.message : error}`);
      // Return empty array or re-throw depending on desired error handling
      return [];
    }
  }

  // --- Direct Node Access ---

  async getNodeByKey(nodeKey: string): Promise<any> {
    try {
      // Use AQL for more flexibility if needed later, or direct document fetch
      // const query = aql`
      //   FOR node IN ${this.nodesCollection}
      //     FILTER node._key == ${nodeKey}
      //     LIMIT 1
      //     RETURN node
      // `;
      // const cursor = await arangoDbClient.query(query);
      // const node = await cursor.next();

      // Direct fetch is simpler if just getting by key
      const node = await this.nodesCollection.document(nodeKey);

      // Note: arangojs driver throws an error if document not found, so this check might be redundant
      // but kept for explicit clarity before the catch block handles the driver's error.
      if (!node) {
         throw new DocumentNotFoundError(`ArangoDB node with key "${nodeKey}" not found.`); // Corrected error type here
      }
      return node;
    } catch (error: any) {
      // Handle ArangoDB's specific "document not found" error
      if (error.isArangoError && error.errorNum === 1202) { // 1202 is ERROR_ARANGO_DOCUMENT_NOT_FOUND
         throw new DocumentNotFoundError(`ArangoDB node with key "${nodeKey}" not found.`); // Use DocumentNotFoundError
      }
      console.error(`Error fetching ArangoDB node ${nodeKey}:`, error);
      // Re-throw other errors or wrap them
      throw new Error(`Failed to fetch ArangoDB node: ${error.message || 'Unknown error'}`);
    }
  }
}

export const arangoDbService = ArangoDbService.getInstance();
