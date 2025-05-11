import fs from "fs/promises";
import type { Knex } from "knex";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { FileConfig } from "@/modules/file/config";
import { db } from "@/database/postgres/connection";
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
import { createCollectionModule } from "../collections"; // Not used if CollectionQueries is directly instantiated
import { FileQueries } from './file.queries';
import { CollectionQueries } from '@/modules/collections/collections.queries';

// const collectionModule = createCollectionModule(db); // Seems unused, CollectionQueries is newed up directly

export interface IFileService {
  upload(params: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType>;
  query(
    userId: string,
    options?: QueryOptions
  ): Promise<{ files: DbFileType[]; total: number }>;
  findById(userId: string, id: string): Promise<DbFileType | null>;
  delete(userId: string, id: string): Promise<void>;
  getCollectionsForFile(fileId: string, userId: string): Promise<Collection[]>;
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
    let transaction: Knex.Transaction | null = null;

    try {
      transaction = await db.transaction();

      await fs.rename(file.path, newPath);

      const fileData = {
        id: fileId,
        filename: file.originalname,
        path: newPath,
        content: content.replace(/\0/g, ""), // Sanitize content
        user_id: userId,
        metadata: {
          originalSize: file.size,
          mimeType: file.mimetype,
          embeddingsCreated: false,
        },
        created_at: new Date(),
        updated_at: new Date(),
      };

      createdDbFile = await this.queries.insertFile(fileData);

      if (collectionId) {
        // Verify user owns the target collection before linking
        const targetCollection = await this.collectionQueries.findCollectionById(
          collectionId,
          userId
        );
        if (!targetCollection) {
          throw new CollectionNotFoundError(collectionId);
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

      await transaction.commit();

      // Asynchronously process embeddings (outside the main transaction)
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
        .catch((embeddingError: unknown) => {
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
        await transaction.rollback();
      }
      // Attempt to cleanup uploaded file if error occurred
      if (newPath) {
        fs.unlink(newPath).catch((cleanupError: unknown) =>
          console.error("Error cleaning up file:", cleanupError instanceof Error ? cleanupError.message : cleanupError)
        );
      } else if (file.path) {
        fs.unlink(file.path).catch((cleanupError: unknown) =>
          console.error("Error cleaning up temp file:", cleanupError instanceof Error ? cleanupError.message : cleanupError)
        );
      }
      throw error;
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

    // Foreign key `onDelete('CASCADE')` on `collection_files` handles join table cleanup.
    // Foreign key `onDelete('CASCADE')` on `text_embeddings` (if file_id is FK) would handle embedding cleanup at DB level.
    // Application-level async deletion of embeddings is also an option if not handled by DB cascade.

    try {
      const deletedRows = await this.queries.deleteFileById(userId, id);

      if (deletedRows > 0) {
        console.log(`Deleted file record for id "${id}" from database.`);
      } else {
        // This case implies the file was found by findFileById but then delete failed to affect rows,
        // or it was deleted by another process between find and delete.
        console.warn(
          `File with id "${id}" delete operation affected 0 rows, though it was initially found.`
        );
      }

      // Asynchronously delete embeddings
      this.embeddingService
        .deleteFileEmbeddings(id)
        .catch((embeddingError: unknown) => {
          console.error(
            `Error during async deletion of embeddings for file ${id}:`,
            embeddingError instanceof Error ? embeddingError.message : embeddingError
          );
        });

      // Delete the actual file from filesystem
      try {
        await fs.unlink(fileToDelete.path);
        console.log(`Deleted file from filesystem: ${fileToDelete.path}`);
      } catch (fileError: unknown) {
        console.error(
          `Error deleting file ${fileToDelete.path} for file ${id}:`,
          fileError instanceof Error ? fileError.message : fileError
        );
      }
    } catch (dbError) {
      console.error(`Error deleting file ${id} from database:`, dbError);
      throw dbError;
    }
  }

  async getCollectionsForFile(
    fileId: string,
    userId: string
  ): Promise<Collection[]> {
    // Verify the user owns the file before fetching its collections
    const file = await this.queries.findFileById(userId, fileId);
    if (!file) {
      throw new FileNotFoundError(fileId);
    }
    // Redundant check if findFileById already scopes by userId, but good for explicit auth assertion.
    if (file.user_id !== userId) {
      throw new ForbiddenError("User does not own this file.");
    }

    // This query in collections.queries should implicitly handle user ownership of collections
    // or be designed to only return collections the user has access to in relation to the file.
    const collections = await this.collectionQueries.findCollectionsByFileId(
      fileId,
      userId
    );
    return collections;
  }
}

const embeddingService = EmbeddingService.getInstance(db);
export const fileService = new FileService(
  new FileQueries(db),
  embeddingService,
  new CollectionQueries(db)
);
