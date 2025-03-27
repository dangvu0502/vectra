import fs from 'fs/promises'; // Keep one set of imports
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentConfig } from '../core/config'; // Assuming this config is still relevant for uploads
import type { Knex } from 'knex';
// Import Document type from document.model.ts for DB operations and alias it
import type { Document as DbDocumentType, QueryOptions } from './document.model'; 
// Import Document type from types.ts for EmbeddingService interaction and alias it
import type { Document as EmbeddingDocumentType } from './types'; 
import { documentSchema, DOCUMENTS_TABLE, querySchema } from './document.model';
import type { EmbeddingService } from './embedding'; // Import EmbeddingService interface
import { DocumentNotFoundError } from '@/modules/core/errors'; // Import error type

// Output Port (Interface) - Use DbDocumentType for return types matching DB results
export interface DocumentService {
    upload(file: Express.Multer.File, content: string): Promise<DbDocumentType>; 
    query(options: QueryOptions): Promise<{ documents: DbDocumentType[]; total: number }>; 
    findById(id: string): Promise<DbDocumentType | null>; 
    delete(id: string): Promise<void>;
}

// Concrete Implementation
export class DocumentServiceImpl implements DocumentService {
  // Inject both Knex and EmbeddingService
  constructor(
    private readonly db: Knex,
    private readonly embeddingService: EmbeddingService 
  ) {}

  async upload(file: Express.Multer.File, content: string): Promise<DbDocumentType> { // Return DbDocumentType
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
        const [insertedRecord] = await this.db(DOCUMENTS_TABLE)
            .insert(docData)
            .returning('*');
        
        // Validate the inserted record right away
        createdDbDocument = documentSchema.parse(insertedRecord); 

        // Create the object matching EmbeddingDocument type from types.ts
        const documentForEmbedding: EmbeddingDocumentType = {
            id: createdDbDocument.id,
            filename: createdDbDocument.filename,
            path: createdDbDocument.path,
            content: createdDbDocument.content, // Pass content
            createdAt: createdDbDocument.created_at, // Map created_at to createdAt
            metadata: createdDbDocument.metadata // Pass original metadata
        };

        // Asynchronously process embeddings after successful DB insertion
        // Use a non-blocking call, but handle potential promise rejection
        this.embeddingService.processDocument(documentForEmbedding).then(() => {
            console.log(`Embedding process initiated for document ${docId}`);
            // Optionally update document metadata in DB to mark embedding started/completed using jsonb_set
            return this.db(DOCUMENTS_TABLE)
                .where({ id: docId })
                .update({
                    metadata: this.db.raw('jsonb_set(jsonb_set(metadata, \'{embeddingsCreated}\', \'true\'), \'{embeddingsTimestamp}\', ?::jsonb)', [JSON.stringify(new Date().toISOString())]),
                    updated_at: new Date()
                });
        }).catch(embeddingError => { // Catch errors from the async embedding process
            console.error(`Embedding failed for document ${docId}:`, embeddingError);
            // Optionally update document metadata in DB to mark embedding error using jsonb_set
            const errorMsg = embeddingError instanceof Error ? embeddingError.message : 'Unknown embedding error';
            return this.db(DOCUMENTS_TABLE)
                .where({ id: docId })
                .update({
                    metadata: this.db.raw('jsonb_set(metadata, \'{embeddingError}\', ?::jsonb)', [JSON.stringify(errorMsg)]),
                    updated_at: new Date()
                });
        });

        return createdDbDocument; // Return the validated DB document

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

  async query(options: QueryOptions = {}): Promise<{ documents: DbDocumentType[]; total: number }> { // Return DbDocumentType
    const {
      q,
      page = '1',
      limit = '10',
      sortBy = 'created_at', // Ensure sortBy matches DB column names
      sortOrder = 'desc'
    } = querySchema.parse(options);

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum > 0 ? pageNum - 1 : 0) * limitNum;

    try {
      let queryBuilder = this.db(DOCUMENTS_TABLE);

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
        .orderBy(sortBy, sortOrder)
        .offset(skip)
        .limit(limitNum)
        .select('*'); // Select all columns

      // Validate each document against the schema
      const validatedDocuments = dbDocuments.map(dbDoc => documentSchema.parse(dbDoc));

      return {
        documents: validatedDocuments,
        total
      };
    } catch (error) {
      console.error("Error in query:", error);
      throw error;
    }
  }

  async findById(id: string): Promise<DbDocumentType | null> { // Return DbDocumentType
    try {
      const dbDoc = await this.db(DOCUMENTS_TABLE)
        .where({ id })
        .first(); // Use first() instead of select('*') and destructuring

      return dbDoc ? documentSchema.parse(dbDoc) : null;
    } catch (error) {
      console.error("Error in findById:", error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    // 1. Find the document to get its path for file deletion
    const docToDelete = await this.findById(id); // Returns DbDocumentType | null

    if (!docToDelete) { // Check if document exists
        console.warn(`Document with id "${id}" not found for deletion.`);
        throw new DocumentNotFoundError(id); 
    }

    try {
        // 2. Delete from database first
        const deletedRows = await this.db(DOCUMENTS_TABLE)
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
            .catch(embeddingError => {
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
