# Vectra Server

## Quickstart

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in required values.

3. **Set up the database:**
   ```bash
   pnpm run db:setup
   ```

4. **Start the server:**
   ```bash
   pnpm run dev
   ```

## Architecture

The server follows a modular architecture with clear separation between API, controllers, services, and data access layers.

- **API Layer:** Express app and route definitions.
- **Controllers:** Handle HTTP requests and responses.
- **Services:** Business logic for each module (auth, collections, file).
- **Data Access:** Queries for Postgres (auth, collections) and ArangoDB (file module only).
- **File Module:** Handles file upload, chunking, embedding, and graph operations using ArangoDB.
- **Queue:** Uses BullMQ and Redis for background jobs.

See [`docs/server-refactor-plan.md`](./docs/server-refactor-plan.md) for a detailed architecture diagram and refactor plan.

## Contribution Guide

- Follow the [refactor plan](./docs/server-refactor-plan.md) for ongoing improvements.
- Write clear comments and docstrings for new code.
- Add or update module-level README files as you work on each module.
- Use Zod for input validation in controllers.
- Centralize constants and configuration in `src/config/`.
- Add tests for new features and update the testing guide as needed.
- Document any new environment variables in `.env.example`.

## Onboarding

- Read the architecture and refactor plan in `docs/`.
- Review per-module README files for details on each module.
- For questions, see the comments and docstrings in the codebase.

---
