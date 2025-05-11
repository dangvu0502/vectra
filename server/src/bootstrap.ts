import http from 'http';
import { Database as ArangoDatabase } from 'arangojs';
import { Knex } from 'knex';
import type { RedisClientType } from 'redis';
import { Queue as BullQueue } from 'bullmq';
import type { Express } from 'express';
import { db as knexDb } from './database/postgres/connection';
import { arangoDbClient, ensureCollectionsAndIndexes } from './database/arangodb/client';
import { redisConnection } from './database/redis/connection';
import { llmProcessingQueue } from './database/redis/queues';
import { env } from './config/environment';

interface AppInstances {
  httpServer: http.Server;
  knexInstance: Knex;
  arangoClient: ArangoDatabase;
  redisClient: typeof redisConnection;
  bullQueue: BullQueue;
}

let runningInstances: AppInstances | null = null;

export const initializeApp = async (app: Express): Promise<AppInstances> => {
  console.log('Starting application initialization...');

  try {
    await redisConnection.connect();
    console.log('✅ Redis client connected.');

    // Queue instance is already created in queues.ts, just log it
    console.log(`✅ BullMQ queue "${llmProcessingQueue.name}" is ready.`);

    await knexDb.raw('SELECT 1');
    console.log('✅ PostgreSQL connection established.');

    // Client instance is created in client.ts, check connection and run setup
    const dbExists = await arangoDbClient.exists();
    if (!dbExists) {
       console.warn(`ArangoDB database "${env.ARANGO_DB_NAME}" does not exist. Attempting setup...`);
    } else {
        console.log(`✅ ArangoDB database "${env.ARANGO_DB_NAME}" exists.`);
    }
    await ensureCollectionsAndIndexes(arangoDbClient);
    console.log('✅ ArangoDB client connected and setup verified.');

    const PORT = env.PORT || 3000;
    const httpServer = app.listen(PORT, () => {
      console.log('🚀 Server Status:');
      console.log(`- Running on port: ${PORT}`);
      console.log(`- Environment: ${env.NODE_ENV || 'development'}`);
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
