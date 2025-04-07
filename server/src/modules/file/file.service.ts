import fs from 'fs/promises';
import type { Knex } from 'knex';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileConfig } from '@/modules/file/config'; // Updated path for FileConfig
import { db } from '@/database/connection';
import { FileNotFoundError, CollectionNotFoundError, ForbiddenError } from '@/shared/errors'; // Updated path for errors
import { querySchema, type File as DbFileType, type QueryOptions } from './file.schema';
import { EmbeddingService, type IEmbeddingService } from './file.embedding.service';
import { firecrawlService } from '@/modules/firecrawl/firecrawl.service'; // Import FirecrawlService
// Import the specific query needed for linking and the Collection type
import { collectionsQueries } from '@/modules/collections/collections.queries';
import type { Collection } from '@/modules/collections/collections.types'; // Import Collection type
import {
  deleteFileByIdQuery,
  findFileByIdQuery,
  insertFileQuery,
  queryFilesQuery,
  updateFileEmbeddingErrorQuery,
  updateFileEmbeddingSuccessQuery,
  // findCollectionsByFileIdQuery is now in collections.queries
} from './file.queries';

// Interface using DbFileType and QueryOptions from model.ts
export interface IFileService {
  upload(params: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string; // Keep optional collectionId for linking
    userId: string;
  }): Promise<DbFileType>;
  query(options?: QueryOptions): Promise<{ files: DbFileType[]; total: number }>;
  findById(id: string): Promise<DbFileType | null>;
  delete(id: string): Promise<void>;
  ingestUrl(params: { url: string; collectionId?: string; userId: string }): Promise<DbFileType>; // Add ingestUrl
  // Methods related to direct file-collection links (add/remove/getFilesIn) are removed
  getCollectionsForFile(fileId: string, userId: string): Promise<Collection[]>; // Use Collection type
}

class FileService implements IFileService {
  private static instance: FileService | null = null;
  private readonly db: Knex;
  private readonly embeddingService: IEmbeddingService;
  private readonly firecrawlService: typeof firecrawlService; // Add firecrawlService dependency

  private constructor(db: Knex, embeddingService: IEmbeddingService, firecrawlSvc: typeof firecrawlService) {
    this.db = db;
    this.embeddingService = embeddingService;
    this.firecrawlService = firecrawlSvc; // Initialize firecrawlService
  }

  static getInstance(db: Knex, embeddingService: IEmbeddingService, firecrawlSvc: typeof firecrawlService): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService(db, embeddingService, firecrawlSvc);
    }
    return FileService.instance;
  }

  static resetInstance(): void {
    FileService.instance = null;
  }

  async upload({ file, content, collectionId, userId }: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType> {
    const fileId = uuidv4();
    const uploadDir = FileConfig?.upload?.directory || process.env.UPLOAD_DIR || 'uploads';
    const extension = path.extname(file.originalname);
    const newFilename = `${fileId}${extension}`;
    await fs.mkdir(uploadDir, { recursive: true });
    const newPath = path.join(uploadDir, newFilename);

    let createdDbFile: DbFileType;
    let transaction: Knex.Transaction | null = null; // Use transaction for atomicity

    try {
      transaction = await db.transaction(); // Start transaction

      await fs.rename(file.path, newPath);

      // Prepare file data *without* collection_id
      const fileData = {
        id: fileId,
        filename: file.originalname,
        path: newPath,
        content: content,
        // collection_id: null, // REMOVED - No longer a direct column
        user_id: userId,
        metadata: {
          originalSize: file.size,
          mimeType: file.mimetype,
          embeddingsCreated: false,
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert file metadata within the transaction
      createdDbFile = await insertFileQuery(fileData, transaction);

      // If collectionId is provided, create the link in the join table
      if (collectionId) {
        // Verify user owns the target collection (important for security)
        const targetCollection = await collectionsQueries.findCollectionById(collectionId, userId);
        if (!targetCollection) {
          throw new CollectionNotFoundError(collectionId); // Or ForbiddenError if preferred
        }
        await collectionsQueries.addFileLinkQuery(collectionId, createdDbFile.id, transaction);
        console.log(`Linked file ${createdDbFile.id} to collection ${collectionId}`);
      }

      await transaction.commit(); // Commit transaction

      // Asynchronously process embeddings (outside transaction)
      const fileForEmbedding: DbFileType = createdDbFile;
      this.embeddingService.processFile(fileForEmbedding).then(() => {
        console.log(`Embedding process initiated successfully for file ${fileId}`);
        return updateFileEmbeddingSuccessQuery(fileId, new Date().toISOString());
      }).catch(embeddingError => {
        console.error(`Embedding failed for file ${fileId}:`, embeddingError);
        const errorMsg = embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error';
        return updateFileEmbeddingErrorQuery(fileId, errorMsg);
      });

      return createdDbFile;

    } catch (error) {
      console.error("Error during file upload:", error);
      if (transaction) {
        await transaction.rollback(); // Rollback transaction on error
      }
      // Cleanup logic remains the same
      if (newPath) {
        fs.unlink(newPath).catch(cleanupError => console.error("Error cleaning up file:", cleanupError));
      } else if (file.path) {
        fs.unlink(file.path).catch(cleanupError => console.error("Error cleaning up temp file:", cleanupError));
      }
      throw error; // Re-throw the original error
    }
  }

  async ingestUrl({ url, collectionId, userId }: {
    url: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType> {
    console.log(`Attempting to ingest URL: ${url}`);
    const scrapedContent = await this.firecrawlService.scrapeUrl(url);

    if (!scrapedContent) {
      throw new Error(`Failed to scrape content from URL: ${url}`);
    }

    const fileId = uuidv4();
    const uploadDir = FileConfig?.upload?.directory || process.env.UPLOAD_DIR || 'uploads';
    // Create a filename based on the URL or timestamp - let's use fileId for simplicity
    const newFilename = `${fileId}.md`; // Save as markdown
    await fs.mkdir(uploadDir, { recursive: true });
    const newPath = path.join(uploadDir, newFilename);

    let createdDbFile: DbFileType;
    let transaction: Knex.Transaction | null = null;

    try {
      transaction = await db.transaction();

      // Write scraped content to the file
      await fs.writeFile(newPath, scrapedContent, 'utf-8');
      console.log(`Saved scraped content to: ${newPath}`);

      // Estimate size (optional, could get actual size)
      const estimatedSize = Buffer.byteLength(scrapedContent, 'utf-8');

      // Prepare file data
      const fileData = {
        id: fileId,
        filename: url, // Use URL as the original filename
        path: newPath,
        content: scrapedContent, // Store scraped content
        user_id: userId,
        metadata: {
          originalSize: estimatedSize,
          mimeType: 'text/markdown', // Set mime type to markdown
          sourceUrl: url, // Add source URL to metadata
          embeddingsCreated: false,
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert file metadata
      createdDbFile = await insertFileQuery(fileData, transaction);

      // Link to collection if ID provided
      if (collectionId) {
        const targetCollection = await collectionsQueries.findCollectionById(collectionId, userId);
        if (!targetCollection) {
          throw new CollectionNotFoundError(collectionId);
        }
        await collectionsQueries.addFileLinkQuery(collectionId, createdDbFile.id, transaction);
        console.log(`Linked ingested file ${createdDbFile.id} to collection ${collectionId}`);
      }

      await transaction.commit();

      // Trigger embedding process asynchronously
      const fileForEmbedding: DbFileType = createdDbFile;
      this.embeddingService.processFile(fileForEmbedding).then(() => {
        console.log(`Embedding process initiated successfully for ingested file ${fileId}`);
        return updateFileEmbeddingSuccessQuery(fileId, new Date().toISOString());
      }).catch(embeddingError => {
        console.error(`Embedding failed for ingested file ${fileId}:`, embeddingError);
        const errorMsg = embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error';
        return updateFileEmbeddingErrorQuery(fileId, errorMsg);
      });

      return createdDbFile;

    } catch (error) {
      console.error("Error during URL ingestion:", error);
      if (transaction) {
        await transaction.rollback();
      }
      // Cleanup the created .md file if it exists
      fs.access(newPath).then(() => fs.unlink(newPath)).catch(() => {}); // Attempt cleanup, ignore errors
      throw error;
    }
  }


  async query(options: QueryOptions = {}): Promise<{ files: DbFileType[]; total: number }> {
    const {
      q,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = querySchema.parse(options);

    try {
      // Pass parsed options, query function handles defaults if needed
      return await queryFilesQuery({ q, page, limit, sortBy, sortOrder });
    } catch (error) {
      console.error("Error in query:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<DbFileType | null> {
    try {
      return await findFileByIdQuery(id);
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const fileToDelete = await findFileByIdQuery(id);
    if (!fileToDelete) {
      console.warn(`File with id "${id}" not found for deletion.`);
      throw new FileNotFoundError(id);
    }

    // Note: Deleting the file record will cascade delete entries in collection_files
    // due to the foreign key constraint `onDelete('CASCADE')`.
    // We don't need to manually delete from the join table.

    try {
      const deletedRows = await deleteFileByIdQuery(id);

      if (deletedRows === 0) {
        console.warn(`File with id "${id}" was found but delete operation affected 0 rows.`);
      } else {
        console.log(`Deleted file record for id "${id}" from database.`);
      }

      // Delete embeddings asynchronously
      this.embeddingService.deleteFileEmbeddings(id)
        .catch((embeddingError: any) => {
          console.error(`Error during async deletion of embeddings for file ${id}:`, embeddingError);
        });

      // Delete the actual file
      try {
        await fs.unlink(fileToDelete.path);
        console.log(`Deleted file: ${fileToDelete.path}`);
      } catch (fileError: any) {
        console.error(`Error deleting file ${fileToDelete.path} for file ${id}: ${fileError.message}`);
      }

    } catch (dbError) {
      console.error(`Error deleting file ${id} from database:`, dbError);
      throw dbError;
    }
  }

  // REMOVED methods: addFileToCollection, removeFileFromCollection, getFilesInCollection

  // Updated method to use Collection type and query from collections module
  async getCollectionsForFile(fileId: string, userId: string): Promise<Collection[]> {
     // 1. Verify the user owns the file (still good practice)
     const file = await findFileByIdQuery(fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.user_id !== userId) {
      // Although the query below also checks ownership via join, this provides an earlier exit
      throw new ForbiddenError('User does not own this file.');
    }

    // 2. Fetch collections using the query from collections.queries
     // This query implicitly handles user ownership check via joins
     const collections = await collectionsQueries.findCollectionsByFileIdQuery(fileId, userId);
     // The query in collections.queries already returns Collection[]
     return collections;
  }
}

// Keep instance export
const embeddingService = EmbeddingService.getInstance(db);
// Pass firecrawlService instance when creating FileService instance
export const fileService = FileService.getInstance(db, embeddingService, firecrawlService);
