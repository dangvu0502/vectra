import type { Knex } from 'knex';

const TABLE_NAME = 'text_embeddings';
const VECTOR_DIMENSION = 1536; // Dimension for text-embedding-3-small

export async function up(knex: Knex): Promise<void> {
    // Ensure the vector extension is enabled
    await knex.raw('CREATE EXTENSION IF NOT EXISTS vector;');

    await knex.schema.createTable(TABLE_NAME, (table) => {
        table.text('vector_id').primary(); // Primary key for chunk ID
        table.specificType('embedding', `vector(${VECTOR_DIMENSION})`).notNullable(); // Renamed vector column to embedding
        table.jsonb('metadata').notNullable(); // Metadata for the chunk
        table.timestamps(true, true); // Adds created_at and updated_at

        // Optional: Add an index for faster vector similarity search (e.g., HNSW or IVFFlat)
        // Example using HNSW (adjust parameters as needed):
        // await knex.raw(`CREATE INDEX ON ${TABLE_NAME} USING hnsw (vector vector_cosine_ops) WITH (m = 16, ef_construction = 64);`);
        // Or IVFFlat:
        // await knex.raw(`CREATE INDEX ON ${TABLE_NAME} USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);`);
        // Note: Index creation can take time on large datasets. Consider adding it later if needed.
    });

    // Add GIN index for metadata querying if you plan to filter by metadata often
    await knex.schema.alterTable(TABLE_NAME, (table) => {
         table.index('metadata', `${TABLE_NAME}_metadata_gin_idx`, 'GIN');
    });

    console.log(`Created table ${TABLE_NAME} with vector dimension ${VECTOR_DIMENSION}`);
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTableIfExists(TABLE_NAME);
    console.log(`Dropped table ${TABLE_NAME}`);
    // Optionally drop the vector extension if it's no longer needed by other tables
    // await knex.raw('DROP EXTENSION IF EXISTS vector;');
}
