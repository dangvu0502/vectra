import http from 'http';
import { Database as ArangoDatabase } from 'arangojs';
import { Knex } from 'knex';
import type { RedisClientType } from 'redis'; // Use type-only import
import { Queue as BullQueue } from 'bullmq';
import type { Express } from 'express'; // Import Express type
import { db as knexDb } from './database/postgres/connection'; // Import Knex instance from postgres subdir
import { arangoDbClient, ensureCollectionsAndIndexes } from './database/arangodb/client'; // Import ArangoDB client and setup function
import { redisConnection } from './database/redis/connection'; // Import Redis client instance
import { llmProcessingQueue } from './database/redis/queues'; // Import BullMQ queue instance
import { env } from './config/environment';

interface AppInstances {
  httpServer: http.Server;
  knexInstance: Knex;
  arangoClient: ArangoDatabase;
  redisClient: typeof redisConnection; // Use typeof to match the instance type
  bullQueue: BullQueue;
}

let runningInstances: AppInstances | null = null;

// Function to initialize all application components
export const initializeApp = async (app: Express): Promise<AppInstances> => {
  console.log('Starting application initialization...');

  try {
    // 1. Connect Redis (needed for BullMQ)
    await redisConnection.connect();
    console.log('✅ Redis client connected.');

    // 2. Initialize BullMQ Queue (uses Redis connection)
    // Queue instance is already created in queues.ts, just log it
    console.log(`✅ BullMQ queue "${llmProcessingQueue.name}" is ready.`);

    // 3. Connect PostgreSQL
    await knexDb.raw('SELECT 1');
    console.log('✅ PostgreSQL connection established.');

    // 4. Connect ArangoDB and ensure setup
    // Client instance is created in client.ts, check connection and run setup
    const dbExists = await arangoDbClient.exists();
    if (!dbExists) {
       console.warn(`ArangoDB database "${env.ARANGO_DB_NAME}" does not exist. Attempting setup...`);
       // The ensureCollectionsAndIndexes function handles creation if needed
    } else {
        console.log(`✅ ArangoDB database "${env.ARANGO_DB_NAME}" exists.`);
    }
    await ensureCollectionsAndIndexes(arangoDbClient); // Run setup checks/creation
    console.log('✅ ArangoDB client connected and setup verified.');


    // 5. Start HTTP Server
    const PORT = env.PORT || 3000;
    const httpServer = app.listen(PORT, () => {
      console.log('🚀 Server Status:');
      console.log(`- Running on port: ${PORT}`);
      console.log(`- Environment: ${env.NODE_ENV || 'development'}`);
      // Add other relevant status logs if needed
    });

    httpServer.on('error', (error) => {
        console.error('❌ HTTP Server Error:', error);
        // Attempt graceful shutdown on critical server errors like EADDRINUSE
        if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
            console.error(`Port ${PORT} already in use. Shutting down.`);
        }
    });


    console.log('✅ Application initialized successfully.');

    runningInstances = {
      httpServer,
      knexInstance: knexDb,
      arangoClient: arangoDbClient,
      redisClient: redisConnection,
      bullQueue: llmProcessingQueue,
    };

    return runningInstances;

  } catch (error) {
    console.error('❌ Fatal error during application initialization:', error);
    // Attempt to clean up any partially initialized resources before exiting
    process.exit(1);
  }
};
