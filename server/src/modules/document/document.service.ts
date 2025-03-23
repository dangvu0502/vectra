import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentConfig } from '../core/config';
import type { QueryOptions, QueryResult } from './types';
import { DocumentModel, querySchema } from './document.model'; // Import Mongoose model
import type { IDocument } from './document.model';
import type { HydratedDocument } from 'mongoose';

// Define a separate interface for the data stored in MongoDB (without content)
export interface DocumentMetadata {
  id: string;
  filename: string;
  path: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

interface DocumentWithContent extends DocumentMetadata {
  content: string;
}

// Output Port (Interface)
export interface DocumentService {
    upload(file: Express.Multer.File, content: string): Promise<IDocument>; // Return IDocument
    query(options: QueryOptions): Promise<QueryResult<DocumentWithContent>>;
    findById(id: string): Promise<IDocument | null>; // Return IDocument
    delete(id: string): Promise<void>;
}

// Concrete Implementation
export class DocumentServiceImpl implements DocumentService {
  private static instance: DocumentServiceImpl | null = null;

  private constructor() {}

  static getInstance(): DocumentServiceImpl {
    if (!DocumentServiceImpl.instance) {
      DocumentServiceImpl.instance = new DocumentServiceImpl();
    }
    return DocumentServiceImpl.instance;
  }

  static resetInstance(): void {
    DocumentServiceImpl.instance = null;
  }

  async upload(file: Express.Multer.File, content: string): Promise<IDocument> {
      const docId = uuidv4();
      const extension = path.extname(file.originalname);
      const newFilename = `${docId}${extension}`;
      const newPath = path.join(DocumentConfig.upload.directory, newFilename);

      // Rename the uploaded file to include the extension and save to DB
      try {
          await fs.rename(file.path, newPath);

          const doc = {
              id: docId,
              filename: file.originalname, // Store original filename
              path: newPath,
              content: content, // Store the content
              createdAt: new Date(),
              metadata: {
                  originalSize: file.size, // Use file.size for actual size
                  mimeType: file.mimetype
              }
          };

          const createdDocument = await DocumentModel.create(doc);
          return createdDocument; //return the mongoose document
      } catch (error) {
          console.error("Error in upload:", error);
          throw error; // Re-throw the error for handling in the controller
      }
  }

  async query(options: QueryOptions = {}): Promise<QueryResult<DocumentWithContent>> {
    const {
      q,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = querySchema.parse(options);

    const skip = (+page - 1) * +limit;

    // Build the query filter based on 'q' (if provided)
    const filter = q ? { $text: { $search: q } } : {};

    try {
        const documents = await DocumentModel.find(filter)
          .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(+limit)
          .exec();

        const total = await DocumentModel.countDocuments(filter);

        // Convert Mongoose documents to plain objects, including content
        const formattedDocuments: DocumentWithContent[] = documents.map(doc => ({
            id: doc.id,
            filename: doc.filename,
            path: doc.path,
            createdAt: doc.createdAt,
            content: doc.content, // Include content
            metadata: doc.metadata as Record<string, unknown>
        }));

        return {
          documents: formattedDocuments,
          total
        };
    } catch (error) {
        console.error("Error in query:", error);
        throw error; // Re-throw for handling in controller
    }
  }

  async findById(id: string): Promise<IDocument | null> { // Return IDocument
      try {
          const doc = await DocumentModel.findOne({ id: id }).exec();
          return doc; // Return the Mongoose document directly
      } catch (error) {
          console.error("Error in findById:", error);
          throw error;
      }
  }

  async delete(id: string): Promise<void> {
    try {
        const result = await DocumentModel.deleteOne({ id: id }).exec();
        if (result.deletedCount === 0) {
          console.warn(`Document with id "${id}" not found for deletion.`);
        }
        // Optionally, also delete the file from the filesystem
        const doc = await DocumentModel.findOne({id});
        if (doc) {
          await fs.unlink(doc.path);
        }

    } catch (error) {
        console.error("Error in delete:", error);
        throw error; // Re-throw for handling in controller
    }
  }
}
