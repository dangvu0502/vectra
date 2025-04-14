# File Module

This module handles all aspects of file management, processing, and querying within the Vectra server. It includes file uploads, chunking, text embedding generation, storage, and integration with ArangoDB for graph-based operations.

## Features

- File upload handling (using Multer).
- File metadata storage (in Postgres `files` table).
- Text extraction from uploaded files (details depend on implementation, e.g., for PDFs, DOCX).
- Text chunking based on configurable strategies.
- Generating text embeddings using configured LLM providers (via `llm-adapter`).
- Storing embeddings and chunks (potentially in ArangoDB or a dedicated vector store).
- Querying embeddings for semantic search.
- Managing file relationships and metadata using ArangoDB graph capabilities.
- Background job processing (using BullMQ/Redis) for potentially long-running tasks like embedding generation.

## Architecture & Separation of Concerns

- **`file.controller.ts`**: Handles HTTP requests for file uploads, downloads, and querying (`/files/*`).
- **`file.service.ts`**: Core business logic for file processing orchestration (upload, chunking, triggering embedding).
- **`file.embedding.service.ts`**: Logic specifically related to managing the embedding process (interacting with LLMs, storing embeddings).
- **`file.queries.ts`**: Database queries related to the `files` table in Postgres.
- **`file.embedding.queries.ts`**: Database queries related to storing/retrieving embeddings (target database TBD/configurable, potentially ArangoDB or Postgres).
- **`chunking.strategies.ts`**: Defines different algorithms/methods for splitting text into chunks.
- **`embedding.query.strategies.ts`**: Defines strategies for querying embeddings.
- **`file.routes.ts`**: Defines API routes (`/files/*`).
- **`config.ts`**: Module-specific configuration (potentially merged into shared config later).
- **`arangodb/` (Planned Subdirectory)**: Will contain all ArangoDB-specific logic (client connection, graph queries, ArangoDB-specific service logic).

## File Processing Flow

1.  **Upload:** Client uploads a file via a POST request to a `/files` endpoint. `file.controller.ts` receives the request, potentially using Multer middleware.
2.  **Metadata Storage:** `file.service.ts` saves initial file metadata (name, type, size, owner) to the Postgres `files` table via `file.queries.ts`.
3.  **Text Extraction & Chunking:** The file content is extracted (if necessary) and passed to a chunking strategy defined in `chunking.strategies.ts`.
4.  **Embedding Job:** `file.service.ts` (or `file.embedding.service.ts`) likely queues a background job (BullMQ) to generate embeddings for each chunk.
5.  **Embedding Generation (Worker):** A background worker (`llm.worker.ts` or similar) picks up the job, calls the configured LLM provider (via `llm-adapter.ts`) to get embeddings for each chunk.
6.  **Embedding/Chunk Storage:** The worker stores the chunks and their corresponding embeddings (e.g., in ArangoDB collections/documents via `file/arangodb/queries.ts`).
7.  **Graph Updates (Worker):** The worker updates the ArangoDB graph, creating nodes for the document and chunks, and edges representing their relationships (e.g., `HAS_CHUNK`).

## ArangoDB Integration (Planned)

All ArangoDB logic (client, queries, service interactions) will be strictly located within the `src/modules/file/arangodb/` subdirectory.

ArangoDB is planned to be used exclusively within this module for:
- Storing file chunks and their vector embeddings.
- Representing relationships between documents, chunks, and potentially other entities (e.g., citations, mentions) as a graph.
- Performing graph traversals and complex queries that leverage these relationships alongside vector similarity searches.

If other modules require ArangoDB capabilities in the future, the ArangoDB logic might be refactored into a more shared core module, but the initial plan is to keep it contained within the File module. Configuration details are managed via `src/config/environment.ts` and `.env`.

## Key Files & Concepts

- `file.controller.ts`, `file.service.ts`, `file.embedding.service.ts`: Core request handling and business logic.
- `file.queries.ts`, `file.embedding.queries.ts`: Data access (Postgres, potentially others).
- `chunking.strategies.ts`: How files are split for embedding.
- `llm-adapter.ts` (Core): Interface to LLM providers.
- `queues.ts` / `llm.worker.ts` (Core): Background job processing for embeddings.
- `arangodb/` (Planned): ArangoDB client, queries, and specific service logic.
