import mongoose from 'mongoose';
import type { Db } from 'mongodb';

const MONGO_URI = process.env.MONGO_ATLAS_URI;

if (!MONGO_URI) {
    throw new Error('MONGO_ATLAS_URI environment variable is not defined.');
}

interface VectorIndexDefinition {
    name: string;
    definition: {
        mappings: {
            dynamic: boolean;
            fields: {
                [key: string]: {
                    type: string;
                    dimensions?: number;
                    similarity?: string;
                }
            }
        }
    }
}

const vectorIndexDefinition: VectorIndexDefinition = {
    name: 'vector_index',
    definition: {
        mappings: {
            dynamic: false,
            fields: {
                embedding: {
                    type: 'knnVector',
                    dimensions: 1536,
                    similarity: 'cosine'
                },
                documentId: {
                    type: 'string'
                }
            }
        }
    }
};

async function initializeVectorSearch(db: Db) {
    try {
        const collections = await db.listCollections({ name: 'embeddings' }).toArray();
        if (collections.length === 0) {
            console.log('Creating embeddings collection...');
            await db.createCollection('embeddings');
        }

        console.log('Creating Atlas Search index...');
        await db.collection('embeddings').createSearchIndex(vectorIndexDefinition);
        console.log('Atlas Search index created.');
    } catch (error: any) {
        if (error.codeName === 'IndexAlreadyExists') {
            console.log('Atlas Search index already exists.');
            return;
        }
        throw error;
    }
}

export const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected successfully');

        const db = mongoose.connection.db;
        if (!db) {
            throw new Error('MongoDB database not available after connection.');
        }

        await initializeVectorSearch(db);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

export const connection = mongoose.connection;
