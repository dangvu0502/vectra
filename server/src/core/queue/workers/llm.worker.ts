import { Worker, Job } from 'bullmq';
import { env } from '@/config/environment';
import { LLM_PROCESSING_QUEUE_NAME, getRedisConnectionOptions } from '../queues'; // Import queue name and connection helper
import type { LlmJobData } from '../queues'; // Type-only import for job data
import { arangoDbService } from '@/modules/arangodb/arangodb.service'; // Assuming service export
import { cogito } from '@/core/llm-adapter'; // Assuming LLM adapter export
// Potentially import vector search functionality if needed for finding related chunks
// import { FileEmbeddingService } from '@/modules/file/file.embedding.service';

console.log('Initializing LLM Processing Worker...');

// Define the processor function that handles each job
const processLlmJob = async (job: Job<LlmJobData>) => {
  const { jobType, chunkId, chunkText } = job.data;
  console.log(`Processing job ${job.id} - Type: ${jobType}, Chunk ID: ${chunkId}`);

  try {
    if (jobType === 'relationshipExtraction') {
      // --- Relationship Extraction Logic ---
      console.log(`[Job ${job.id}] Starting relationship extraction for chunk ${chunkId}`);

      // 1. (Optional) Find related chunks via vector search
      //    - This might involve calling a method like FileEmbeddingService.findSimilarChunks(chunkId or chunkText)
      //    - Let's assume for now we operate only on the given chunk or have another mechanism

      // 2. Prepare prompt for LLM
      //    - Example prompt structure (needs refinement based on LLM capabilities and desired output format)
      const prompt = `Analyze the following text chunk (ID: ${chunkId}):\n\n"${chunkText}"\n\nIdentify semantic relationships (like "cites", "explains", "contradicts", "elaborates_on") it might have with other concepts or potential related text chunks. If possible, identify the related concept or chunk ID. Format the output as JSON: [{"relationship": "type", "targetConcept": "...", "targetChunkId": "optional_id"}]`;

      // 3. Call LLM (cogito) using the 'doGenerate' method with structured prompt
      console.log(`[Job ${job.id}] Calling LLM for relationship extraction...`);
      // Assuming 'doGenerate' expects LanguageModelV1CallOptions
      // and returns an object with a 'text' property containing the response.
      const llmResponse = await cogito.doGenerate({
         inputFormat: 'messages', // Specify input format
         mode: { type: 'regular' }, // Specify generation mode
         prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }] // Pass structured prompt
      });
      console.log(`[Job ${job.id}] LLM response received.`);

      // 4. Parse LLM response
      //    - Needs robust parsing and error handling for potentially malformed JSON
      let relationships: { relationship: string; targetConcept?: string; targetChunkId?: string }[] = [];
      try {
        // Assuming llmResponse.text contains the JSON string
        relationships = JSON.parse(llmResponse.text || '[]');
        if (!Array.isArray(relationships)) throw new Error("LLM response is not an array");
        console.log(`[Job ${job.id}] Parsed ${relationships.length} relationships.`);
      } catch (parseError) {
        console.error(`[Job ${job.id}] Failed to parse LLM relationship response:`, parseError, "Response:", llmResponse.text);
        // Decide how to handle parse errors: skip, retry, log?
        // For now, we'll just log and continue without creating edges.
      }


      // 5. Store relationships as edges in ArangoDB
      for (const rel of relationships) {
        if (rel.relationship && (rel.targetConcept || rel.targetChunkId)) {
          // Construct edge data
          const edgeData = {
            _from: `vb_nodes/${chunkId}`, // Assuming chunk nodes have keys like chunkId in vb_nodes
            _to: rel.targetChunkId ? `vb_nodes/${rel.targetChunkId}` : `vb_entities/${rel.targetConcept}`, // Need entity node handling if target is concept
            type: rel.relationship,
            source: 'llm_extraction',
            // Add other metadata? timestamp? confidence?
          };
          console.log(`[Job ${job.id}] Attempting to create edge:`, edgeData);
          // TODO: Add check if target node (_to) exists before creating edge? Or handle potential errors in createEdge.
          // TODO: Define how entity nodes (`vb_entities/*`) are created/managed if target is a concept.
          try {
            await arangoDbService.createEdge(edgeData); // Call the service method
          } catch (edgeError) {
             console.error(`[Job ${job.id}] Failed to create edge:`, edgeError, "Data:", edgeData);
             // Decide if this failure should fail the whole job or just be logged
          }
        } else {
           console.warn(`[Job ${job.id}] Skipping invalid relationship data from LLM:`, rel);
        }
      }
      console.log(`[Job ${job.id}] Finished relationship extraction.`);

    } else if (jobType === 'entityExtraction') {
      // --- Entity Extraction Logic (Placeholder) ---
      console.log(`[Job ${job.id}] Starting entity extraction for chunk ${chunkId}`);
      // 1. Prepare prompt for LLM to extract entities (e.g., technical terms, names)
      // 2. Call LLM
      // 3. Parse response
      // 4. Create/update entity nodes in ArangoDB (e.g., in a 'vb_entities' collection)
      // 1. Prepare prompt for LLM
      const entityPrompt = `Extract key entities (like technical terms, names, locations, organizations) from the following text chunk (ID: ${chunkId}):\n\n"${chunkText}"\n\nFormat the output as a JSON array of strings: ["entity1", "entity2", ...]`;

      // 2. Call LLM
      console.log(`[Job ${job.id}] Calling LLM for entity extraction...`);
      const entityResponse = await cogito.doGenerate({
         inputFormat: 'messages',
         mode: { type: 'regular' },
         prompt: [{ role: 'user', content: [{ type: 'text', text: entityPrompt }] }]
      });
      console.log(`[Job ${job.id}] LLM entity response received.`);

      // 3. Parse response
      let entities: string[] = [];
      try {
        entities = JSON.parse(entityResponse.text || '[]');
        if (!Array.isArray(entities)) throw new Error("LLM entity response is not an array");
        console.log(`[Job ${job.id}] Parsed ${entities.length} entities.`);
      } catch (parseError) {
        console.error(`[Job ${job.id}] Failed to parse LLM entity response:`, parseError, "Response:", entityResponse.text);
        // Continue without creating entities/edges for this job on parse failure
      }

      // 4. Create/update entity nodes in ArangoDB (e.g., in a 'vb_entities' collection)
      //    - This requires a new collection and potentially an upsert method in ArangoDbService
      //    - For now, we'll just log the intent.
      const entityNodeIds: string[] = []; // Store potential entity node IDs
      for (const entityName of entities) {
         const entityNodeKey = `entity_${entityName.replace(/\s+/g, '_').toLowerCase()}`; // Example key generation
         console.log(`[Job ${job.id}] TODO: Upsert entity node: ${entityNodeKey} with name: ${entityName}`);
         // const upsertedEntityNode = await arangoDbService.upsertEntityNode(entityNodeKey, entityName);
         // if (upsertedEntityNode) entityNodeIds.push(upsertedEntityNode._id); // Assuming _id is returned
         entityNodeIds.push(`vb_entities/${entityNodeKey}`); // Placeholder ID
      }

      // 5. Create 'mentions' edges from chunk node to entity nodes
      for (const entityNodeId of entityNodeIds) {
         const edgeData = {
           _from: `vb_nodes/${chunkId}`,
           _to: entityNodeId, // Use the (placeholder) entity node ID
           type: 'mentions',
           source: 'llm_extraction',
         };
         console.log(`[Job ${job.id}] Attempting to create 'mentions' edge:`, edgeData);
         try {
           await arangoDbService.createEdge(edgeData);
         } catch (edgeError) {
           console.error(`[Job ${job.id}] Failed to create 'mentions' edge:`, edgeError, "Data:", edgeData);
         }
      }
      console.log(`[Job ${job.id}] Finished entity extraction processing.`);

    } else {
      console.warn(`[Job ${job.id}] Unknown job type received: ${jobType}`);
    }

    console.log(`[Job ${job.id}] Completed successfully.`);
    // Return value is optional, can be used for logging or further processing
    return { success: true };

  } catch (error) {
    console.error(`[Job ${job.id}] Failed to process job:`, error);
    // Re-throw the error to let BullMQ handle retries/failure based on queue settings
    throw error;
  }
};

// Create the worker instance
const worker = new Worker<LlmJobData>(
  LLM_PROCESSING_QUEUE_NAME,
  processLlmJob,
  {
    connection: getRedisConnectionOptions(), // Use the same connection logic as the queue
    concurrency: 5, // Process up to 5 jobs concurrently (adjust as needed)
    limiter: { // Optional: Rate limiting if needed (e.g., for external APIs)
      max: 10, // Max 10 jobs
      duration: 1000, // per 1 second
    },
  }
);

// --- Worker Event Listeners ---
worker.on('completed', (job: Job, result: any) => {
  console.log(`Worker completed job ${job.id} with result:`, result);
});

worker.on('failed', (job: Job | undefined, error: Error) => {
  // Job might be undefined if the error happened before the job instance was fully processed
  const jobId = job ? job.id : 'unknown';
  console.error(`Worker failed job ${jobId}:`, error);
});

worker.on('error', (error) => {
  console.error('Worker encountered an error:', error);
});

worker.on('active', (job: Job) => {
  console.log(`Worker started processing job ${job.id}`);
});

console.log('LLM Processing Worker initialized and listening for jobs.');

// Graceful shutdown for the worker
const shutdownWorker = async () => {
  console.log('Closing LLM Processing Worker...');
  await worker.close();
  console.log('LLM Processing Worker closed.');
};

process.on('SIGINT', shutdownWorker);
process.on('SIGTERM', shutdownWorker);
