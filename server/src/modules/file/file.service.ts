import fs from 'fs/promises';
import type { Knex } from 'knex';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { FileConfig } from '../core/config'; // Assuming this config is still relevant for uploads
// Keep QueryOptions import from model.ts, rename DbFileType for clarity if desired, or keep as is.
import { db } from '@/database/connection'; // Keep db instance import (might be needed elsewhere or for passing)
import { FileNotFoundError } from '@/modules/core/errors'; // Import error type
import { querySchema, type File as DbFileType, type QueryOptions } from './file.model';
// Update the import to only import the types/class
import { EmbeddingService, type IEmbeddingService } from './file.embedding.service';
import {
  deleteFileByIdQuery,
  findFileByIdQuery,
  insertFileQuery,
  queryFilesQuery,
  updateFileEmbeddingErrorQuery,
  updateFileEmbeddingSuccessQuery,
} from './file.queries'; // Import query functions

// Interface using DbFileType and QueryOptions from model.ts
export interface IFileService {
  upload(params: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType>;
  query(options?: QueryOptions): Promise<{ files: DbFileType[]; total: number }>; // Use QueryOptions again
  findById(id: string): Promise<DbFileType | null>;
  delete(id: string): Promise<void>;
}

class FileService implements IFileService { // Keep class definition
  private static instance: FileService | null = null; // Keep static instance
  private readonly db: Knex;
  private readonly embeddingService: IEmbeddingService;

  private constructor(db: Knex, embeddingService: IEmbeddingService) { // Keep constructor private
    this.db = db;
    this.embeddingService = embeddingService;
  }

  // Keep static getInstance method
  static getInstance(db: Knex, embeddingService: IEmbeddingService): FileService {
    if (!FileService.instance) {
      FileService.instance = new FileService(db, embeddingService);
    }
    return FileService.instance;
  }

  // Keep static resetInstance method (optional)
  static resetInstance(): void {
    FileService.instance = null;
  }

  // Method implementation returns DbFileType again
  async upload({ file, content, collectionId, userId }: {
    file: Express.Multer.File;
    content: string;
    collectionId?: string;
    userId: string;
  }): Promise<DbFileType> {
    const fileId = uuidv4();
    // Use FileConfig if it defines the upload directory, otherwise use a default/env var
    const uploadDir = FileConfig?.upload?.directory || process.env.UPLOAD_DIR || 'uploads';
    const extension = path.extname(file.originalname);
    const newFilename = `${fileId}${extension}`;
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    const newPath = path.join(uploadDir, newFilename);

    // Variable to hold the validated DB document
    let createdDbFile: DbFileType;

    try {
      await fs.rename(file.path, newPath);

      const fileData = {
        id: fileId,
        filename: file.originalname,
        path: newPath, // Store relative or absolute path based on your needs
        content: content, // Content might be large, consider storing separately if needed
        collection_id: collectionId || null, // Use collectionId from params
        user_id: userId,
        metadata: {
          originalSize: file.size,
          mimeType: file.mimetype,
          embeddingsCreated: false, // Initialize embedding status
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert document metadata into the database using the query function
      createdDbFile = await insertFileQuery(fileData); // Use query function

      // Type assertion or mapping might not be strictly needed if DbFileType structure matches EmbeddingFileType
      // Ensure the object passed matches the expected structure for processFile
      const fileForEmbedding: DbFileType = createdDbFile; // Directly use the validated DB document if structure matches

      // Asynchronously process embeddings after successful DB insertion
      // Use a non-blocking call, handle potential promise rejection for logging/status update
      this.embeddingService.processFile(fileForEmbedding).then(() => {
        console.log(`Embedding process initiated successfully for file ${fileId}`);
        // Update document metadata in DB using the query function
        return updateFileEmbeddingSuccessQuery(fileId, new Date().toISOString()); // Use query function
      }).catch(embeddingError => { // Catch errors from the async embedding process
        console.error(`Embedding failed for file ${fileId}:`, embeddingError);
        // Optionally update document metadata in DB using the query function
        const errorMsg = embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error';
        return updateFileEmbeddingErrorQuery(fileId, errorMsg); // Use query function
      });

      // Return the validated DB document directly
      return createdDbFile;

    } catch (dbError) {
      console.error("Error during file upload:", dbError);
      // Clean up uploaded file if DB insert failed or rename succeeded but something else failed
      if (newPath) {
        fs.unlink(newPath).catch(cleanupError => console.error("Error cleaning up file:", cleanupError));
      }
      // Clean up temp file if rename failed (path still points to temp)
      else if (file.path) {
        fs.unlink(file.path).catch(cleanupError => console.error("Error cleaning up temp file:", cleanupError));
      }
      throw dbError; // Re-throw the original error
    }
  }
  // Method implementation matches interface signature (using QueryOptions from model)
  async query(options: QueryOptions = {}): Promise<{ files: DbFileType[]; total: number }> {
    // Parse options using querySchema
    const {
      q,
      page = '1',
      limit = '10',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = querySchema.parse(options); // Use querySchema to parse/validate

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    // Use query function directly, passing parsed options
    try {
      return await queryFilesQuery({ q, page, limit, sortBy, sortOrder }); // Use query function
    } catch (error) {
      console.error("Error in query:", error);
      throw error;
    }
  }

  // Method implementation matches interface signature and return type
  async findById(id: string): Promise<DbFileType | null> {
    try {
      // Use the imported query function
      return await findFileByIdQuery(id);
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    // 1. Find the document to get its path for file deletion
    // Use the query function to find the file
    const fileToDelete = await findFileByIdQuery(id); // Use query function

    if (!fileToDelete) { // Check if document exists
      console.warn(`File with id "${id}" not found for deletion.`);
      throw new FileNotFoundError(id);
    }

    try {
      // 2. Delete from database using the query function
      const deletedRows = await deleteFileByIdQuery(id); // Use query function

      if (deletedRows === 0) {
        // This case might happen in race conditions, log a warning
        console.warn(`File with id "${id}" was found but delete operation affected 0 rows.`);
      } else {
        console.log(`Deleted file record for id "${id}" from database.`);
      }

      // 3. Delete embeddings (asynchronously, allow potential errors but log them)
      this.embeddingService.deleteFileEmbeddings(id)
        .catch((embeddingError: any) => {
          console.error(`Error during async deletion of embeddings for file ${id}:`, embeddingError);
        });

      // 4. Delete the actual file from storage using the path from the found document
      try {
        await fs.unlink(fileToDelete.path); // Use fileToDelete.path
        console.log(`Deleted file: ${fileToDelete.path}`);
      } catch (fileError: any) {
        // Log error but consider the main deletion successful if DB entry is gone
        // Avoid failing the whole operation just because file cleanup failed (it might already be gone)
        console.error(`Error deleting file ${fileToDelete.path} for file ${id}: ${fileError.message}`);
      }

    } catch (dbError) {
      console.error(`Error deleting file ${id} from database:`, dbError);
      throw dbError; // Re-throw DB error
    }
  }
}

// Keep instance export
// Create the embeddingService instance here instead
const embeddingService = EmbeddingService.getInstance(db);

export const fileService = FileService.getInstance(db, embeddingService);
