import fs from 'fs/promises'; // Keep one set of imports
import type { Knex } from 'knex';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentConfig } from '../core/config'; // Assuming this config is still relevant for uploads
// Keep QueryOptions import from model.ts, rename DbDocumentType for clarity if desired, or keep as is.
import type { Document as DbDocumentType, QueryOptions } from './document.model';
import { db } from '@/database/connection'; // Import db instance
import { DocumentNotFoundError } from '@/modules/core/errors'; // Import error type
import { DOCUMENTS_TABLE as FILES_TABLE, documentSchema, querySchema } from './document.model';
import { embeddingService, type IEmbeddingService } from './embedding.service'; // Import EmbeddingService interface AND INSTANCE
// Remove import from ./types

// Interface using DbDocumentType and QueryOptions from model.ts
export interface IDocumentService {
  upload(file: Express.Multer.File, content: string): Promise<DbDocumentType>;
  query(options?: QueryOptions): Promise<{ documents: DbDocumentType[]; total: number }>; // Use QueryOptions again
  findById(id: string): Promise<DbDocumentType | null>;
  delete(id: string): Promise<void>;
}

class DocumentService implements IDocumentService { // Keep class definition
  private static instance: DocumentService | null = null; // Keep static instance
  private readonly db: Knex;
  private readonly embeddingService: IEmbeddingService;

  private constructor(db: Knex, embeddingService: IEmbeddingService) { // Keep constructor private
    this.db = db;
    this.embeddingService = embeddingService;
  }

  // Keep static getInstance method
  static getInstance(db: Knex, embeddingService: IEmbeddingService): DocumentService {
    if (!DocumentService.instance) {
      DocumentService.instance = new DocumentService(db, embeddingService);
    }
    return DocumentService.instance;
  }

  // Keep static resetInstance method (optional)
  static resetInstance(): void {
    DocumentService.instance = null;
  }

  // Method implementation returns DbDocumentType again
  async upload(file: Express.Multer.File, content: string): Promise<DbDocumentType> {
    const docId = uuidv4();
    // Use DocumentConfig if it defines the upload directory, otherwise use a default/env var
    const uploadDir = DocumentConfig?.upload?.directory || process.env.UPLOAD_DIR || 'uploads';
    const extension = path.extname(file.originalname);
    const newFilename = `${docId}${extension}`;
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    const newPath = path.join(uploadDir, newFilename);

    // Variable to hold the validated DB document
    let createdDbDocument: DbDocumentType;

    try {
      await fs.rename(file.path, newPath);

      const docData = {
        id: docId,
        filename: file.originalname,
        path: newPath, // Store relative or absolute path based on your needs
        content: content, // Content might be large, consider storing separately if needed
        metadata: {
          originalSize: file.size,
          mimeType: file.mimetype,
          embeddingsCreated: false, // Initialize embedding status
        },
        created_at: new Date(),
        updated_at: new Date()
      };

      // Insert document metadata into the database
      const [insertedRecord] = await this.db(FILES_TABLE)
        .insert(docData)
        .returning('*');

      // Validate the inserted record right away
      createdDbDocument = documentSchema.parse(insertedRecord);

      // Type assertion or mapping might not be strictly needed if DbDocumentType structure matches EmbeddingDocumentType
      // Ensure the object passed matches the expected structure for processDocument
      const documentForEmbedding: DbDocumentType = createdDbDocument; // Directly use the validated DB document if structure matches

      // Asynchronously process embeddings after successful DB insertion
      // Use a non-blocking call, handle potential promise rejection for logging/status update
      this.embeddingService.processDocument(documentForEmbedding).then(() => {
        console.log(`Embedding process initiated successfully for document ${docId}`);
        // Update document metadata in DB to mark embedding started/completed using jsonb_set
        // This update happens *after* the initial response is sent
        return this.db(FILES_TABLE)
          .where({ id: docId })
          .update({
            metadata: this.db.raw('jsonb_set(jsonb_set(metadata, \'{embeddingsCreated}\', \'true\'), \'{embeddingsTimestamp}\', ?::jsonb)', [JSON.stringify(new Date().toISOString())]),
            updated_at: new Date()
          });
      }).catch(embeddingError => { // Catch errors from the async embedding process
        console.error(`Embedding failed for document ${docId}:`, embeddingError);
        // Optionally update document metadata in DB to mark embedding error using jsonb_set
        const errorMsg = embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error';
        return this.db(FILES_TABLE)
          .where({ id: docId })
          .update({
            metadata: this.db.raw('jsonb_set(metadata, \'{embeddingError}\', ?::jsonb)', [JSON.stringify(errorMsg)]),
            updated_at: new Date()
          });
      });

      // Return the validated DB document directly
      return createdDbDocument;

    } catch (dbError) {
      console.error("Error during document upload:", dbError);
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
  async query(options: QueryOptions = {}): Promise<{ documents: DbDocumentType[]; total: number }> {
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
    const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

    try {
      let queryBuilder = this.db(FILES_TABLE);

      // Add search if query parameter is provided
      if (q) {
        // Consider searching specific fields if 'content' is too large/slow
        queryBuilder = queryBuilder.where('filename', 'ilike', `%${q}%`); // Example: search filename
      }

      // Get total count based on the filtered query
      const countResult = await queryBuilder.clone().count('* as count').first();
      const total = countResult ? parseInt(countResult.count as string, 10) : 0;

      // Get paginated results
      const dbDocuments = await queryBuilder
        .orderBy(sortBy, sortOrder) // Use parsed sortBy/sortOrder
        .offset(skip)               // Use calculated skip
        .limit(limitNum)            // Use parsed limitNum
        .select('*'); // Select all columns

      // Validate each document against the schema
      const validatedDocuments = dbDocuments.map(dbDoc => documentSchema.parse(dbDoc));

      return {
        documents: validatedDocuments, // Return DbDocumentType array
        total
      };
    } catch (error) {
      console.error("Error in query:", error);
      throw error;
    }
  }

  // Method implementation matches interface signature and return type
  async findById(id: string): Promise<DbDocumentType | null> {
    try {
      const dbDoc = await this.db(FILES_TABLE)
        .where({ id })
        .first(); // Use first()

      // Return validated DbDocumentType or null
      return dbDoc ? documentSchema.parse(dbDoc) : null;

    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    // 1. Find the document to get its path for file deletion
    // findById now returns DbDocumentType | null
    const docToDelete = await this.findById(id);

    if (!docToDelete) { // Check if document exists
      console.warn(`Document with id "${id}" not found for deletion.`);
      throw new DocumentNotFoundError(id);
    }

    try {
      // 2. Delete from database first
      const deletedRows = await this.db(FILES_TABLE)
        .where({ id })
        .delete();

      if (deletedRows === 0) {
        // This case might happen in race conditions, log a warning
        console.warn(`Document with id "${id}" was found but delete operation affected 0 rows.`);
      } else {
        console.log(`Deleted document record for id "${id}" from database.`);
      }

      // 3. Delete embeddings (asynchronously, allow potential errors but log them)
      this.embeddingService.deleteDocumentEmbeddings(id)
        .catch((embeddingError: any) => {
          console.error(`Error during async deletion of embeddings for document ${id}:`, embeddingError);
        });

      // 4. Delete the actual file from storage using the path from the found document
      try {
        await fs.unlink(docToDelete.path); // Use docToDelete.path
        console.log(`Deleted file: ${docToDelete.path}`);
      } catch (fileError: any) {
        // Log error but consider the main deletion successful if DB entry is gone
        // Avoid failing the whole operation just because file cleanup failed (it might already be gone)
        console.error(`Error deleting file ${docToDelete.path} for document ${id}: ${fileError.message}`);
      }

    } catch (dbError) {
      console.error(`Error deleting document ${id} from database:`, dbError);
      throw dbError; // Re-throw DB error
    }
  }
}

// Keep instance export
export const documentService = DocumentService.getInstance(db, embeddingService);
