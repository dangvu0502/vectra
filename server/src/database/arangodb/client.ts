import { Database } from 'arangojs';
import { env } from '../../config/environment';
import { ARANGO_COLLECTION_NAMES } from '../constants';

// console.log('Initializing ArangoDB client...'); // Moved to bootstrap or init phase
// console.log('ArangoDB URL:', env.ARANGO_URL);
// console.log('ArangoDB DB Name:', env.ARANGO_DB_NAME);
// console.log('ArangoDB Username:', env.ARANGO_USERNAME);

const db = new Database({
  url: env.ARANGO_URL,
  databaseName: env.ARANGO_DB_NAME,
    auth: {
      username: env.ARANGO_USERNAME,
      password: env.ARANGO_PASSWORD,
  },
});

export const arangoDbClient = db;

export const getNodesCollection = () => {
  if (!arangoDbClient) {
    throw new Error('ArangoDB client not initialized');
  }
  return arangoDbClient.collection(ARANGO_COLLECTION_NAMES.NODES);
};

export const getEdgesCollection = () => {
  if (!arangoDbClient) {
    throw new Error('ArangoDB client not initialized');
  }
  return arangoDbClient.collection(ARANGO_COLLECTION_NAMES.EDGES);
};

export async function ensureCollectionsAndIndexes(dbInstance: Database) {
  if (!dbInstance) {
    console.error("Cannot ensure setup: DB client not initialized.");
    return;
  }
  console.log("Ensuring ArangoDB database, collections, and indexes...");

  const targetDbName = env.ARANGO_DB_NAME;
  const nodesCollectionName = ARANGO_COLLECTION_NAMES.NODES;
  const edgesCollectionName = ARANGO_COLLECTION_NAMES.EDGES;

  try {
    const systemDb = dbInstance.database('_system'); // Use _system DB for admin tasks
    const databases = await systemDb.listDatabases();
    let targetDb: Database;

    if (!databases.includes(targetDbName)) {
      console.log(`Database "${targetDbName}" not found, creating...`);
      // Ensure the user assigned during creation has the correct password
      await systemDb.createDatabase(targetDbName, [{ username: env.ARANGO_USERNAME, passwd: env.ARANGO_PASSWORD }]);
      console.log(`Database "${targetDbName}" created.`);
      targetDb = dbInstance.database(targetDbName);
      console.log(`Using newly created database "${targetDbName}".`);
    } else {
      console.log(`Database "${targetDbName}" already exists.`);
      targetDb = dbInstance.database(targetDbName);
      console.log(`Using existing database "${targetDbName}".`);
    }

    const nodesCollection = targetDb.collection(nodesCollectionName);
    const edgesCollection = targetDb.collection(edgesCollectionName);

    if (!(await nodesCollection.exists())) {
      console.log(`Collection "${nodesCollectionName}" not found, creating...`);
      await nodesCollection.create({ type: 2 }); // type 2: Document collection
      console.log(`Collection "${nodesCollectionName}" created.`);
    } else {
      console.log(`Collection "${nodesCollectionName}" already exists.`);
    }

    if (!(await edgesCollection.exists())) {
      console.log(`Collection "${edgesCollectionName}" not found, creating...`);
      await edgesCollection.create({ type: 3 }); // type 3: Edge collection
      console.log(`Collection "${edgesCollectionName}" created.`);
    } else {
      console.log(`Collection "${edgesCollectionName}" already exists.`);
    }

    await nodesCollection.ensureIndex({
      type: 'persistent',
      fields: ['vectra_id'],
      name: 'idx_nodes_vectra_id',
      unique: false,
      sparse: false,
    });
    console.log(`Ensured persistent index on ${nodesCollectionName}.vectra_id`);

    await nodesCollection.ensureIndex({
      type: 'persistent',
      fields: ['node_type'],
      name: 'idx_nodes_node_type',
      unique: false,
      sparse: false,
    });
    console.log(`Ensured persistent index on ${nodesCollectionName}.node_type`);

    await edgesCollection.ensureIndex({
      type: 'persistent',
      fields: ['relationship_type'],
      name: 'idx_edges_relationship_type',
      unique: false,
      sparse: false,
    });
    console.log(`Ensured persistent index on ${edgesCollectionName}.relationship_type`);

    console.log("ArangoDB setup checks complete.");
  } catch (setupError) {
    console.error("Error during ArangoDB setup (DB/Collections/Indexes):", setupError);
    // Decide if this error should prevent server startup
    // throw setupError; // Optionally re-throw
  }
}
