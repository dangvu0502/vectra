# Collections Module

This module is responsible for managing collections and the relationships between collections and files within the Vectra server.

## Features

- Create, Read, Update, Delete (CRUD) operations for collections.
- Linking files to collections (associating existing files with a collection).
- Unlinking files from collections.
- Listing files within a specific collection.
- Enforcing ownership checks to ensure users can only interact with their own collections.

## Architecture & Separation of Concerns

- **`collections.controller.ts`**: Handles incoming HTTP requests for collection-related endpoints (`/collections/*`). It validates input (using Zod schemas eventually) and calls the appropriate service methods.
- **`collections.service.ts`**: Contains the core business logic for managing collections and file links. It orchestrates operations, performs authorization checks (e.g., ensuring the requesting user owns the collection), and interacts with the query layer.
- **`collections.queries.ts`**: Responsible for all direct database interactions related to collections and the `collection_files` join table using Knex. It abstracts the raw SQL or query builder logic away from the service layer.

The boundary between the service and query layers is strict: the service layer should *not* contain direct database query logic, and the query layer should *not* contain business rules or authorization checks.

## File Linking Logic

- Files are independent entities managed by the File module.
- This module manages the many-to-many relationship between collections and files through the `collection_files` join table.
- Linking adds an entry to `collection_files`, associating a `file_id` with a `collection_id`.
- Unlinking removes the corresponding entry from `collection_files`.
- Ownership is checked at the collection level; users must own the collection to link/unlink files within it.

## Key Files

- `collections.controller.ts`: API request handling.
- `collections.service.ts`: Business logic and orchestration.
- `collections.queries.ts`: Database interaction logic (Postgres/Knex).
- `collections.routes.ts`: Defines API routes (`/collections/*`).
- `collections.types.ts`: TypeScript types specific to this module.
- `index.ts`: Exports the module's router.
