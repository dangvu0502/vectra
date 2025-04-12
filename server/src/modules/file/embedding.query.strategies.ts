// Removed direct import of ollama provider
import { embed } from 'ai';
import type { Knex } from 'knex'; // Import Knex type
import { type MetadataFilter } from './file.embedding.queries'; // Keep MetadataFilter import
import { findSimilarEmbeddings, findKeywordMatches } from './embedding.search.queries'; // Import search functions directly
import { nomicEmbedText } from '@/core/llm-adapter';

// Define a common result type for consistency
type QueryResultItem = {
  vector_id: string;
  file_id: string;
  metadata: Record<string, any>;
  distance?: number; // Cosine distance
  rank?: number;     // FTS rank
  score?: number;    // RRF score
};

// --- Vector Search Logic ---
export async function performVectorSearch(
  dbOrTrx: Knex | Knex.Transaction, // Accept dbOrTrx instead of runner
  userId: string,
  queryText: string,
  limit: number,
  collectionId?: string,
  includeMetadataFilters?: MetadataFilter[],
  excludeMetadataFilters?: MetadataFilter[],
  maxDistance?: number
): Promise<QueryResultItem[]> {
  const { embedding } = await embed({
    model: nomicEmbedText, // Use the singleton provider
    value: queryText,
  });
  if (!embedding) {
    throw new Error('Failed to generate embedding for query text.');
  }
  // Call the imported function directly
  return findSimilarEmbeddings(
    dbOrTrx, // Pass dbOrTrx
    userId, embedding, limit, collectionId,
    includeMetadataFilters, excludeMetadataFilters, maxDistance
  );
}

// --- Keyword Search Logic ---
export async function performKeywordSearch(
  dbOrTrx: Knex | Knex.Transaction, // Accept dbOrTrx instead of runner
  userId: string,
  queryText: string,
  limit: number,
  collectionId?: string
  // TODO: Add metadata filters if needed in the future
): Promise<QueryResultItem[]> {
  // Call the imported function directly
  return findKeywordMatches(
    dbOrTrx, // Pass dbOrTrx
    userId, queryText, limit, collectionId
  );
}

// --- Reciprocal Rank Fusion (RRF) Logic ---
export function applyRRF(
  vectorResults: QueryResultItem[],
  keywordResults: QueryResultItem[],
  limit: number,
  kRRF: number = 60 // Default RRF constant
): QueryResultItem[] {
  const rrfScores: { [key: string]: { score: number; data: QueryResultItem } } = {};

  // Process vector results (lower distance is better rank)
  vectorResults.forEach((result, index) => {
    const rank = index + 1;
    const score = 1 / (kRRF + rank);
    if (!rrfScores[result.vector_id]) {
      // Keep original data, including distance
      rrfScores[result.vector_id] = { score: 0, data: { ...result } };
    }
    rrfScores[result.vector_id].score += score;
  });

  // Process keyword results (higher rank is better rank)
  keywordResults.forEach((result, index) => {
    const rank = index + 1; // Rank is directly from DB query order (desc)
    const score = 1 / (kRRF + rank);
    if (!rrfScores[result.vector_id]) {
      // If only found by keyword, store its data but initialize score
      rrfScores[result.vector_id] = { score: 0, data: { ...result } }; // Keep original data, including rank
    } else {
      // If already present from vector search, just add score and keyword rank info
      rrfScores[result.vector_id].data.rank = result.rank;
    }
    rrfScores[result.vector_id].score += score;
  });

  // Combine and sort
  const combined = Object.values(rrfScores).map(item => ({
    ...item.data, // Includes vector_id, file_id, metadata, distance?, rank?
    score: item.score // Add the final RRF score
  }));

  combined.sort((a, b) => b.score - a.score); // Sort by RRF score descending

  return combined.slice(0, limit);
}

// --- Reranking Logic (Currently Disabled) ---
// TODO: Re-enable reranking by uncommenting this section and the corresponding call
//       in EmbeddingService.queryEmbeddings. Ensure type compatibility issues are resolved.
/*
import { rerank } from '@mastra/rag'; // Import rerank
import type { LanguageModelV1 } from 'ai'; // Import LanguageModelV1 from the 'ai' package

export async function performReranking(
  initialResults: QueryResultItem[],
  queryText: string,
  rerankLLM: LanguageModelV1, // Use the correct type
  limit: number
): Promise<QueryResultItem[]> {
  if (!initialResults || initialResults.length === 0) {
    return [];
  }

  const resultsForReranking = initialResults.filter(r => r.metadata?.text);
  if (resultsForReranking.length !== initialResults.length) {
    console.warn("Some initial results missing metadata.text, excluding from reranking.");
  }

  if (resultsForReranking.length === 0) {
    console.warn("No results with metadata.text available for reranking. Returning initial results.");
    // Decide whether to return initialResults or empty array based on desired behavior
    return initialResults; // Or return [] if reranking is mandatory
  }

  try {
    const rerankedResultsData = await rerank(
      resultsForReranking.map(r => ({
        id: r.vector_id,
        // Use distance if available (lower is better -> higher initial score), otherwise score or 0
        score: r.distance !== undefined ? 1 - r.distance : (r.score || 0),
        metadata: r.metadata,
      })),
      queryText,
      rerankLLM, // Use the passed LLM instance
      { topK: limit }
    );

    // Map back to QueryResultItem format
    const finalRerankedResults = rerankedResultsData
      .map(r => {
        const fileId = r.result.metadata?.file_id;
        if (typeof fileId === 'string') {
          return {
            vector_id: r.result.id,
            file_id: fileId,
            metadata: r.result.metadata || {},
            score: r.score, // Use the score from the reranker
            // Distance/rank from original search are less relevant after rerank
          };
        }
        console.warn(`Missing file_id in reranked result metadata for vector_id: ${r.result.id}`);
        return null;
      })
      .filter(result => result !== null) as QueryResultItem[]; // Filter out nulls and assert type

    return finalRerankedResults;

  } catch (rerankError: any) {
    console.error(`Reranking failed: ${rerankError instanceof Error ? rerankError.message : rerankError}. Returning initial (pre-rerank) results.`);
    return initialResults; // Fallback to initial results on error
  }
}
*/
