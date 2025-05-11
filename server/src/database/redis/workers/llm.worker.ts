import { arangoDbService } from '@/modules/arangodb/arangodb.service';
import { Job, Worker } from 'bullmq';
import type { LlmJobData } from '../queues';
import { LLM_PROCESSING_QUEUE_NAME, getRedisConnectionOptions } from '../queues';
import { languageModel } from '@/connectors/llm/adapter';

// console.log('Initializing LLM Processing Worker...'); // Initialization logged by actual start or bootstrap

const processLlmJob = async (job: Job<LlmJobData>) => {
  const { jobType, chunkId, chunkText } = job.data;
  console.log(`Processing job ${job.id} - Type: ${jobType}, Chunk ID: ${chunkId}`);

  try {
    if (jobType === 'relationshipExtraction') {
      // --- Relationship Extraction Logic ---
      console.log(`[Job ${job.id}] Starting relationship extraction for chunk ${chunkId}`);

      // TODO: Consider optional step: Find related chunks via vector search for richer context.
      
      // Prepare prompt for LLM (example structure, refine based on LLM and desired JSON output)
      const prompt = `Analyze the following text chunk (ID: ${chunkId}):\n\n"${chunkText}"\n\nIdentify semantic relationships (like "cites", "explains", "contradicts", "elaborates_on") it might have with other concepts or potential related text chunks. If possible, identify the related concept or chunk ID. Format the output as JSON: [{"relationship": "type", "targetConcept": "...", "targetChunkId": "optional_id"}]`;

      console.log(`[Job ${job.id}] Calling LLM for relationship extraction...`);
      const llmResponse = await languageModel.doGenerate({
         inputFormat: 'messages',
         mode: { type: 'regular' },
         prompt: [{ role: 'user', content: [{ type: 'text', text: prompt }] }]
      });
      console.log(`[Job ${job.id}] LLM response received.`);

      // Parse LLM response (needs robust error handling for malformed JSON)
      let relationships: { relationship: string; targetConcept?: string; targetChunkId?: string }[] = [];
      try {
        relationships = JSON.parse(llmResponse.text || '[]');
        if (!Array.isArray(relationships)) throw new Error("LLM response is not an array");
        console.log(`[Job ${job.id}] Parsed ${relationships.length} relationships.`);
      } catch (parseError) {
        console.error(`[Job ${job.id}] Failed to parse LLM relationship response:`, parseError, "Response:", llmResponse.text);
        // On parse error, log and continue without creating edges for this job.
      }

      // Store relationships as edges in ArangoDB
      for (const rel of relationships) {
        if (rel.relationship && (rel.targetConcept || rel.targetChunkId)) {
          const edgeData = {
            _from: `vb_nodes/${chunkId}`, // Assuming chunk nodes are prefixed and use chunkId as key
            _to: rel.targetChunkId ? `vb_nodes/${rel.targetChunkId}` : `vb_entities/${rel.targetConcept}`, // TODO: Define entity node creation/management
            type: rel.relationship,
            source: 'llm_extraction',
            // Consider adding timestamp, confidence score, etc.
          };
          console.log(`[Job ${job.id}] Attempting to create edge:`, edgeData);
          // TODO: Add check if target node (_to) exists before creating edge or handle errors.
          try {
            await arangoDbService.createEdge(edgeData);
          } catch (edgeError) {
             console.error(`[Job ${job.id}] Failed to create edge:`, edgeError, "Data:", edgeData);
             // Log error but don't fail the entire job for a single edge creation failure.
          }
        } else {
           console.warn(`[Job ${job.id}] Skipping invalid relationship data from LLM:`, rel);
        }
      }
      console.log(`[Job ${job.id}] Finished relationship extraction.`);

    } else if (jobType === 'entityExtraction') {
      // --- Entity Extraction Logic (Placeholder) ---
      console.log(`[Job ${job.id}] Starting entity extraction for chunk ${chunkId}`);
      // TODO: Implement full entity extraction:
      // 1. Prepare prompt for LLM.
      // 2. Call LLM.
      // 3. Parse response.
      // 4. Create/update entity nodes in ArangoDB (e.g., in 'vb_entities' collection).
      // 5. Create 'mentions' edges from chunk to entities.
      const entityPrompt = `Extract key entities (like technical terms, names, locations, organizations) from the following text chunk (ID: ${chunkId}):\n\n"${chunkText}"\n\nFormat the output as a JSON array of strings: ["entity1", "entity2", ...]`;

      console.log(`[Job ${job.id}] Calling LLM for entity extraction...`);
      const entityResponse = await languageModel.doGenerate({
         inputFormat: 'messages',
         mode: { type: 'regular' },
         prompt: [{ role: 'user', content: [{ type: 'text', text: entityPrompt }] }]
      });
      console.log(`[Job ${job.id}] LLM entity response received.`);

      let entities: string[] = [];
      try {
        entities = JSON.parse(entityResponse.text || '[]');
        if (!Array.isArray(entities)) throw new Error("LLM entity response is not an array");
        console.log(`[Job ${job.id}] Parsed ${entities.length} entities.`);
      } catch (parseError) {
        console.error(`[Job ${job.id}] Failed to parse LLM entity response:`, parseError, "Response:", entityResponse.text);
      }

      const entityNodeIds: string[] = [];
      for (const entityName of entities) {
         const entityNodeKey = `entity_${entityName.replace(/\s+/g, '_').toLowerCase()}`;
         console.log(`[Job ${job.id}] TODO: Upsert entity node: ${entityNodeKey} with name: ${entityName}`);
         entityNodeIds.push(`vb_entities/${entityNodeKey}`); // Placeholder ID
      }

      for (const entityNodeId of entityNodeIds) {
         const edgeData = {
           _from: `vb_nodes/${chunkId}`,
           _to: entityNodeId,
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
    return { success: true }; // Optional return value

  } catch (error) {
    console.error(`[Job ${job.id}] Failed to process job:`, error);
    throw error; // Re-throw for BullMQ to handle retries/failure
  }
};

const worker = new Worker<LlmJobData>(
  LLM_PROCESSING_QUEUE_NAME,
  processLlmJob,
  {
    connection: getRedisConnectionOptions(),
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: { // Optional rate limiting (e.g., for external APIs)
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
  const jobId = job ? job.id : 'unknown'; // Job might be undefined if error occurs early
  console.error(`Worker failed job ${jobId}:`, error);
});

worker.on('error', (error) => {
  console.error('Worker encountered an error:', error);
});

worker.on('active', (job: Job) => {
  console.log(`Worker started processing job ${job.id}`);
});

// console.log('LLM Processing Worker initialized and listening for jobs.'); // Initialization logged by actual start or bootstrap

// Graceful shutdown for the worker
const shutdownWorker = async () => {
  console.log('Closing LLM Processing Worker...');
  await worker.close();
  console.log('LLM Processing Worker closed.');
};

process.on('SIGINT', shutdownWorker);
process.on('SIGTERM', shutdownWorker);
