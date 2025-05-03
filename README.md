# Vectra

Vectra, built with TypeScript, helps you build and query your own knowledge base. It features a server and a modern web client for managing and querying your data.

**Note:** This project is currently under heavy development and may contain bugs. Use with caution.

## Tech Stack

- **Backend:** TypeScript, Node.js, Express, PostgreSQL (pgvector), ArangoDB, Redis, BullMQ, Knex.js, Passport.js, Zod, Ollama
- **Frontend:** TypeScript, React, Vite, Tailwind CSS, Radix UI, Shadcn UI, TanStack Query, React Router
- **Tooling:** pnpm, Docker, Vitest

## Getting Started (Development)

This guide covers setting up the development environment where backend dependencies run in Docker and the application code runs locally.

**Prerequisites:**

- [Docker](https://www.docker.com/get-started)
- [Node.js](https://nodejs.org/) (version >= 20.11 )
- [pnpm](https://pnpm.io/installation)

**Steps:**

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd vectra
    ```

2.  **Configure Server Environment:**
    Navigate to the `server` directory, copy the example environment file, and fill in the required values.

    ```bash
    cd server
    cp .env.example .env
    ```

    - **Important:** Edit the `.env` file. Provide necessary secrets (like `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SESSION_SECRET`, LLM API keys).
    - Ensure the database/service connection URLs point to `localhost` and the default ports exposed by Docker Compose (e.g., `DATABASE_URL=postgresql://user:password@localhost:5432/vectra`, `ARANGO_URL=http://localhost:8529`, `REDIS_URL=redis://localhost:6379`). The `ARANGO_PASSWORD` should match the one set here.

3.  **Start Backend Dependencies with Docker:**
    From the `server` directory, start the required services (Postgres, Redis, ArangoDB, Ollama) using Docker Compose.

    ```bash
    # Ensure you are in the server/ directory
    docker compose up -d
    ```

    This command will download the necessary images (if not already present) and start the containers in the background. Wait a moment for the services to initialize, especially Ollama downloading its model.

4.  **Install Project Dependencies:**
    Navigate back to the root directory and install dependencies for the root, server, and client using pnpm's recursive install.

    ```bash
    cd ..
    # Or from the root directory directly
    pnpm install -r
    ```

    _(This installs dependencies in `./`, `./server`, and `./client/app`)_

5.  **Set Up Server Database:**
    From the `server` directory, run the database setup script. This connects to the Postgres container started via Docker.

    ```bash
    cd server
    pnpm run db:setup
    ```

6.  **Run the Development Servers:**
    Go back to the root directory and start both the client and server applications concurrently.

    ```bash
    cd ..
    # Or from the root directory directly
    pnpm run dev
    ```

    This command will start:

    - The backend Node.js server locally (connecting to services in Docker), typically on port 3000.
    - The frontend client development server locally, typically on a port like 5173.

    You should see output indicating both servers are running. Access the client application through the URL provided in the terminal output (e.g., `http://localhost:5173`).

**Stopping Services:**

- To stop the locally running client and server, press `Ctrl+C` in the terminal where `pnpm run dev` is running.
- To stop the background Docker services, navigate to the `server` directory and run:
  ```bash
  # Ensure you are in the server/ directory
  docker compose down
  ```
