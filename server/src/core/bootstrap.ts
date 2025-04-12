import http from 'http';
import { Database as ArangoDatabase } from 'arangojs';
import { Knex } from 'knex';
import type { RedisClientType } from 'redis'; // Use type-only import
import { Queue as BullQueue } from 'bullmq';

import { app } from '../main'; // Import the configured Express app
import { db as knexDb } from '../database/connection'; // Import Knex instance
import { arangoDbClient, ensureCollectionsAndIndexes } from './arangodb/client'; // Import ArangoDB client and setup function
import { redisConnection } from './queue/connection'; // Import Redis client instance
import { llmProcessingQueue } from './queue/queues'; // Import BullMQ queue instance
import { env } from '../config/environment';

interface AppInstances {
  httpServer: http.Server;
  knexInstance: Knex;
  arangoClient: ArangoDatabase;
  redisClient: typeof redisConnection; // Use typeof to match the instance type
  bullQueue: BullQueue;
}

let runningInstances: AppInstances | null = null;

// Function to initialize all application components
export const initializeApp = async (): Promise<AppInstances> => {
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
            shutdownApp().catch(console.error); // Don't await here
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
    await shutdownApp().catch(console.error); // Await cleanup before exit
    process.exit(1);
  }
};

// Function to gracefully shut down all components
export const shutdownApp = async () => {
  if (!runningInstances) {
    console.log('Shutdown called but no running instances found.');
    process.exit(0); // Exit cleanly if already shut down or never started
    return;
  }
  console.log('Initiating graceful shutdown...');

  // Add null check before destructuring
  if (!runningInstances) {
    console.log('Shutdown called, but instances are already null.');
    process.exit(0); // Exit cleanly if already shut down
    return;
  }

  const { httpServer, knexInstance, arangoClient, redisClient, bullQueue } = runningInstances;
  runningInstances = null; // Prevent double shutdown

  let exitCode = 0;
  const errors: any[] = [];

  // 1. Stop HTTP server from accepting new connections
  await new Promise<void>((resolve) => {
    httpServer.close((err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        errors.push(err);
        exitCode = 1;
      } else {
        console.log('HTTP server closed.');
      }
      resolve();
    });
  });

  // 2. Close BullMQ Queue
  try {
    await bullQueue.close();
    console.log('BullMQ queue closed.');
  } catch (err) {
    console.error('Error closing BullMQ queue:', err);
    errors.push(err);
    exitCode = 1;
  }

  // 3. Close Redis Connection
  try {
    if (redisClient.isOpen) {
        await redisClient.quit();
        console.log('Redis connection closed.');
    } else {
        console.log('Redis connection already closed.');
    }
  } catch (err) {
    console.error('Error closing Redis connection:', err);
    errors.push(err);
    exitCode = 1;
  }

  // 4. Close ArangoDB Connection
  try {
    arangoClient.close(); // arangojs client has a synchronous close method
    console.log('ArangoDB connection closed.');
  } catch (err) {
    console.error('Error closing ArangoDB connection:', err);
    errors.push(err);
    exitCode = 1;
  }

  // 5. Close PostgreSQL Connection
  try {
    await knexInstance.destroy();
    console.log('PostgreSQL connection closed.');
  } catch (err) {
    console.error('Error closing PostgreSQL connection:', err);
    errors.push(err);
    exitCode = 1;
  }

  if (errors.length > 0) {
    console.error('Shutdown completed with errors.');
  } else {
    console.log('Graceful shutdown completed successfully.');
  }

  process.exit(exitCode);
};

// Setup signal handlers
process.on('SIGINT', () => {
    console.log('Received SIGINT. Starting graceful shutdown...');
    shutdownApp().catch(console.error);
});
process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Starting graceful shutdown...');
    shutdownApp().catch(console.error);
});
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Consider attempting graceful shutdown here as well, but be cautious
    // shutdownApp().catch(console.error);
    // process.exit(1); // Exit after logging uncaught exception
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally attempt shutdown or just log
});
