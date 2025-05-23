import { aql } from 'arangojs';
import path from 'path';
import { arangoDbClient, getEdgesCollection, getNodesCollection } from '../../database/arangodb/client';
import type { File as DbFileType } from '../file/file.schema';
import { llmProcessingQueue } from '@/database/redis/queues';
import type { LlmJobData } from '@/database/redis/queues';
import { DocumentNotFoundError } from '@/shared/errors';

// TODO: Refactor complex methods (upsertGraphDataForFile, performGraphTraversal) for clarity.
// TODO: Replace console.log/error with a proper, configurable logger.

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
  metadata: ChunkMetadata;
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
  private edgesCollection;

  private constructor() {
    this.nodesCollection = getNodesCollection();
    this.edgesCollection = getEdgesCollection();
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
      const docResult = await arangoDbClient.query(upsertDocQuery);
      const upsertedDoc = await docResult.all();
      if (!upsertedDoc || upsertedDoc.length === 0) {
         throw new Error(`ArangoDB: FAILED to upsert document node ${documentNodeKey}`);
      }
      console.log(`ArangoDB: Upserted document node ${documentNodeKey}`);


      // 2. Delete Orphaned Chunk Nodes/Edges
      const newChunkKeys = new Set(insertedChunkData.map(c => `chunk_${c.vectorId}`));
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
      const deleteCursor = await arangoDbClient.query(deleteOrphansQuery);
      const deletedCount = (await deleteCursor.all())[0] || 0;
      if (deletedCount > 0) {
        console.log(`ArangoDB: Deleted ${deletedCount} orphaned chunk nodes/edges for file ${file.id}`);
      }

      // 3. Process Headers and Create Structural Nodes/Edges
      const headerHierarchy: Record<string, { nodeKey: string; parentKey: string | null; level: number; title: string }> = {};
      const sectionUpsertPromises: Promise<any>[] = [];
      let lastHeaderKeys: (string | null)[] = [null, null, null, null, null, null];

      insertedChunkData.forEach(chunk => {
        let currentParentKey: string | null = documentNodeKey;
        for (let level = 1; level <= 6; level++) {
          const headerKey = `h${level}` as keyof ChunkMetadata;
          const headerTitle = chunk.metadata[headerKey];

          if (headerTitle) {
            const normalizedTitle = headerTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
            const sectionNodeKey = `section_l${level}_${documentNodeKey}_${normalizedTitle}`;

            if (!headerHierarchy[sectionNodeKey]) {
               const parentNodeKey = lastHeaderKeys[level - 1] || documentNodeKey;
               headerHierarchy[sectionNodeKey] = {
                 nodeKey: sectionNodeKey,
                 parentKey: parentNodeKey,
                 level: level,
                 title: headerTitle
               };
               lastHeaderKeys[level] = sectionNodeKey;
               for (let j = level + 1; j <= 6; j++) {
                   lastHeaderKeys[j] = null;
               }
            }
             currentParentKey = sectionNodeKey;
          } else {
             lastHeaderKeys[level] = currentParentKey;
          }
        }
      });

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
               const relationshipType = sectionInfo.parentKey.startsWith('doc_') ? 'has_section' : 'has_subsection';
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
       await Promise.all(sectionUpsertPromises);
       console.log(`ArangoDB: Completed upserting ${Object.keys(headerHierarchy).length} section nodes and structural edges for file ${file.id}`);


      // 4. Upsert Chunk Nodes and 'contains' Edges (linking to sections) + Enqueue Jobs
      const chunkUpsertPromises: Promise<any>[] = [];

      for (const chunkData of insertedChunkData) {
        const chunkNodeKey = `chunk_${chunkData.vectorId}`;
        const chunkNodeData = {
          vectra_id: chunkData.vectorId,
          node_type: 'chunk',
          name: `Chunk of ${file.filename}`,
          metadata: chunkData.metadata,
          text_snippet: chunkData.metadata?.chunk_text?.substring(0, 100) || '',
          updatedAt: now,
        };

        let parentSectionKey: string | null = null;
        for (let level = 6; level >= 1; level--) {
            const headerKey = `h${level}` as keyof ChunkMetadata;
            const headerTitle = chunkData.metadata[headerKey];
            if (headerTitle) {
                const normalizedTitle = headerTitle.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 50);
                parentSectionKey = `section_l${level}_${documentNodeKey}_${normalizedTitle}`;
                break;
            }
        }
        const parentNodeKey = parentSectionKey || documentNodeKey;
        const parentNodeId = `${this.nodesCollection.name}/${parentNodeKey}`;
        const chunkNodeId = `${this.nodesCollection.name}/${chunkNodeKey}`;

        const containsEdgeKey = `edge_${parentNodeKey}_contains_${chunkNodeKey}`;
        const containsEdgeData = {
          _from: parentNodeId,
          _to: chunkNodeId,
          relationship_type: 'contains',
          updatedAt: now,
        };

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

        const chunkProcessingPromise = arangoDbClient.query(upsertChunkQuery)
          .then(async (cursor) => {
            const upsertedChunk = await cursor.next();
            if (!upsertedChunk) {
              throw new Error(`ArangoDB: Failed to confirm upsert for chunk node ${chunkNodeKey}`);
            }
            console.log(`ArangoDB: Upserted chunk node ${chunkNodeKey}`);

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

            const textForLlm = chunkNodeData.metadata?.chunk_text || chunkNodeData.text_snippet;
            if (textForLlm) {
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

          })
          .catch((err: any) => {
            console.error(`ArangoDB: FAILED operation for chunk ${chunkNodeKey} or its edge/jobs`, err);
            throw err;
          });

        chunkUpsertPromises.push(chunkProcessingPromise);

      }

      try {
          await Promise.all(chunkUpsertPromises);
          console.log(`ArangoDB: Successfully completed processing for ${insertedChunkData.length} chunks for file ${file.id}`);
      } catch(promiseAllError) {
          console.error(`ArangoDB: At least one chunk processing operation failed for file ${file.id}`, promiseAllError);
          throw promiseAllError;
      }

    } catch (error) {
      console.error(`ArangoDB Error in upsertGraphDataForFile for file ${file.id}: ${error instanceof Error ? error.message : error}`);
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
      throw error;
    }
  }

  async createEdge(edgeData: { _from: string; _to: string; [key: string]: any }): Promise<any> {
    try {
      const now = new Date().toISOString();
      const dataToInsert = {
        ...edgeData,
        createdAt: edgeData.createdAt || now,
        updatedAt: edgeData.updatedAt || now,
      };
      const result = await this.edgesCollection.save(dataToInsert, { returnNew: true });
      console.log(`ArangoDB: Created edge from ${edgeData._from} to ${edgeData._to} with type ${edgeData.type || 'unknown'}`);
      return result.new;
    } catch (error) {
      console.error(`ArangoDB Error creating edge: ${error instanceof Error ? error.message : error}`, edgeData);
      throw error;
    }
  }

  // --- Graph Query Methods ---

  async performGraphTraversal(params: GraphTraversalParams): Promise<GraphTraversalResultItem[]> {
    const { startNodeVectraIds, graphDepth, graphRelationshipTypes, graphTraversalDirection = 'any' } = params;

    if (!startNodeVectraIds || startNodeVectraIds.length === 0) {
      return [];
    }
    console.log(`DEBUG: performGraphTraversal received vector IDs: ${JSON.stringify(startNodeVectraIds)}`);

    try {
      const bindVars = {
        nodeVectraIds: startNodeVectraIds,
        graphDepth: graphDepth ?? 1,
        graphRelationshipTypes: graphRelationshipTypes && graphRelationshipTypes.length > 0 ? graphRelationshipTypes : null,
      };

      let query: ReturnType<typeof aql>;
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

      query.bindVars = { ...query.bindVars, ...bindVars };

      const cursor = await arangoDbClient.query(query);
      const results = (await cursor.all()) as GraphTraversalResultItem[];
      console.log(`DEBUG: performGraphTraversal (direction: ${graphTraversalDirection}) found ${results.length} items matching input IDs.`);
      return results;

    } catch (error) {
      console.error(`ArangoDB Error during graph traversal: ${error instanceof Error ? error.message : error}`);
      return []; // Return empty on error for now
    }
  }

  async getNodeByKey(nodeKey: string): Promise<any> {
    try {
      const node = await this.nodesCollection.document(nodeKey);
      // arangojs driver throws an error if document not found, which is caught below.
      // This explicit check is redundant if the catch block correctly identifies ArangoDB's not_found error.
      // if (!node) {
      //    throw new DocumentNotFoundError(`ArangoDB node with key "${nodeKey}" not found.`);
      // }
      return node;
    } catch (error: any) {
      if (error.isArangoError && error.errorNum === 1202) { // 1202 is ERROR_ARANGO_DOCUMENT_NOT_FOUND
         throw new DocumentNotFoundError(`ArangoDB node with key "${nodeKey}" not found.`);
      }
      console.error(`Error fetching ArangoDB node ${nodeKey}:`, error);
      throw new Error(`Failed to fetch ArangoDB node: ${error.message || 'Unknown error'}`);
    }
  }
}

export const arangoDbService = ArangoDbService.getInstance();
