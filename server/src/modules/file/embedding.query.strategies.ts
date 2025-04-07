import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';
// Use ReturnType to get the type of the object returned by the factory function
import { createEmbeddingQueryRunner, type MetadataFilter } from './file.embedding.queries';

// Define the type for the query runner object
type EmbeddingQueryRunner = ReturnType<typeof createEmbeddingQueryRunner>;

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
  runner: EmbeddingQueryRunner,
  userId: string,
  queryText: string,
  limit: number,
  collectionId?: string,
  includeMetadataFilters?: MetadataFilter[],
  excludeMetadataFilters?: MetadataFilter[],
  maxDistance?: number
): Promise<QueryResultItem[]> {
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: queryText,
  });
  if (!embedding) {
    throw new Error('Failed to generate embedding for query text.');
  }
  return runner.findSimilarEmbeddings(
    userId, embedding, limit, collectionId,
    includeMetadataFilters, excludeMetadataFilters, maxDistance
  );
}

// --- Keyword Search Logic ---
export async function performKeywordSearch(
  runner: EmbeddingQueryRunner,
  userId: string,
  queryText: string,
  limit: number,
  collectionId?: string
  // TODO: Add metadata filters if needed in the future
): Promise<QueryResultItem[]> {
  return runner.findKeywordMatches(
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
