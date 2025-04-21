import fs from "fs/promises";
import type { Knex } from "knex";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FileConfig } from "@/modules/file/config";
import { db } from "@/database/connection";
import {
  FileNotFoundError,
  CollectionNotFoundError,
  ForbiddenError,
} from "@/shared/errors";
import {
  type File as DbFileType,
  type QueryOptions,
} from "./file.schema";
import {
  EmbeddingService,
  type IEmbeddingService,
} from "./file.embedding.service";
import type { Collection } from "@/modules/collections/collections.validation";
import { createCollectionModule } from "../collections";
import { FileQueries } from './file.queries';
import { CollectionQueries } from '@/modules/collections/collections.queries';

const collectionModule = createCollectionModule(db);
// Interface using DbFileType and QueryOptions from model.ts
export interface IFileService {
  upload(params: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string; // Keep optional collectionId for linking
    userId: string;
  }): Promise<DbFileType>;
  query(
    userId: string,
    options?: QueryOptions
  ): Promise<{ files: DbFileType[]; total: number }>;
  findById(userId: string, id: string): Promise<DbFileType | null>;
  delete(userId: string, id: string): Promise<void>;
  // Removed ingestUrl method signature
  // Methods related to direct file-collection links (add/remove/getFilesIn) are removed
  getCollectionsForFile(fileId: string, userId: string): Promise<Collection[]>; // Use Collection type
}

export class FileService implements IFileService {
  constructor(
    private readonly queries: FileQueries,
    private readonly embeddingService: IEmbeddingService,
    private readonly collectionQueries: CollectionQueries
  ) {}

  async upload({
    file,
    content,
    collectionId,
    userId,
  }: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType> {
    const fileId = uuidv4();
    const uploadDir =
      FileConfig?.upload?.directory || process.env.UPLOAD_DIR || "uploads";
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
        // Sanitize content to remove null bytes before saving
        content: content.replace(/\0/g, ""),
        // collection_id: null, // REMOVED - No longer a direct column
        user_id: userId,
        metadata: {
          originalSize: file.size,
          mimeType: file.mimetype,
          embeddingsCreated: false,
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Insert file metadata within the transaction
      createdDbFile = await this.queries.insertFile(fileData);

      // If collectionId is provided, create the link in the join table
      if (collectionId) {
        // Verify user owns the target collection (important for security)
        const targetCollection = await this.collectionQueries.findCollectionById(
          collectionId,
          userId
        );
        if (!targetCollection) {
          throw new CollectionNotFoundError(collectionId); // Or ForbiddenError if preferred
        }
        await this.collectionQueries.addFileLink(
          collectionId,
          createdDbFile.id,
          transaction
        );
        console.log(
          `Linked file ${createdDbFile.id} to collection ${collectionId}`
        );
      }

      await transaction.commit(); // Commit transaction

      // Asynchronously process embeddings (outside transaction)
      const fileForEmbedding: DbFileType = createdDbFile;
      this.embeddingService
        .processFile(fileForEmbedding)
        .then(() => {
          console.log(
            `Embedding process initiated successfully for file ${fileId}`
          );
          return this.queries.updateFileEmbeddingSuccess(
            fileId,
            new Date().toISOString()
          );
        })
        .catch((embeddingError) => {
          console.error(`Embedding failed for file ${fileId}:`, embeddingError);
          const errorMsg =
            embeddingError instanceof Error
              ? embeddingError.message
              : "Unknown embedding error";
          return this.queries.updateFileEmbeddingError(fileId, errorMsg);
        });

      return createdDbFile;
    } catch (error) {
      console.error("Error during file upload:", error);
      if (transaction) {
        await transaction.rollback(); // Rollback transaction on error
      }
      // Cleanup logic remains the same
      if (newPath) {
        fs.unlink(newPath).catch((cleanupError) =>
          console.error("Error cleaning up file:", cleanupError)
        );
      } else if (file.path) {
        fs.unlink(file.path).catch((cleanupError) =>
          console.error("Error cleaning up temp file:", cleanupError)
        );
      }
      throw error; // Re-throw the original error
    }
  }

  async query(
    userId: string,
    options: QueryOptions = {}
  ): Promise<{ files: DbFileType[]; total: number }> {
    return await this.queries.queryFiles(userId, options);
  }

  async findById(userId: string, id: string): Promise<DbFileType | null> {
    return await this.queries.findFileById(userId, id);
  }

  async delete(userId: string, id: string): Promise<void> {
    const fileToDelete = await this.queries.findFileById(userId, id);
    if (!fileToDelete) {
      console.warn(`File with id "${id}" not found for deletion.`);
      throw new FileNotFoundError(id);
    }

    // Note: Deleting the file record will cascade delete entries in collection_files
    // due to the foreign key constraint `onDelete('CASCADE')`.
    // We don't need to manually delete from the join table.

    try {
      const deletedRows = await this.queries.deleteFileById(userId, id);

      if (deletedRows === 0) {
        console.warn(
          `File with id "${id}" was found but delete operation affected 0 rows.`
        );
      } else {
        console.log(`Deleted file record for id "${id}" from database.`);
      }

      // Delete embeddings asynchronously
      this.embeddingService
        .deleteFileEmbeddings(id)
        .catch((embeddingError: any) => {
          console.error(
            `Error during async deletion of embeddings for file ${id}:`,
            embeddingError
          );
        });

      // Delete the actual file
      try {
        await fs.unlink(fileToDelete.path);
        console.log(`Deleted file: ${fileToDelete.path}`);
      } catch (fileError: any) {
        console.error(
          `Error deleting file ${fileToDelete.path} for file ${id}: ${fileError.message}`
        );
      }
    } catch (dbError) {
      console.error(`Error deleting file ${id} from database:`, dbError);
      throw dbError;
    }
  }

  // Updated method to use Collection type and query from collections module
  async getCollectionsForFile(
    fileId: string,
    userId: string
  ): Promise<Collection[]> {
    // 1. Verify the user owns the file (still good practice)
    const file = await this.queries.findFileById(userId, fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    if (file.user_id !== userId) {
      // Although the query below also checks ownership via join, this provides an earlier exit
      throw new ForbiddenError("User does not own this file.");
    }

    // 2. Fetch collections using the query from collections.queries
    // This query implicitly handles user ownership check via joins
    const collections = await this.collectionQueries.findCollectionsByFileId(
      fileId,
      userId
    );
    // The query in collections.queries already returns Collection[]
    return collections;
  }
}

// Keep instance export
const embeddingService = EmbeddingService.getInstance(db);
// Removed firecrawlService argument from getInstance call
export const fileService = new FileService(
  new FileQueries(db),
  embeddingService,
  new CollectionQueries(db)
);
