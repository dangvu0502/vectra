import type { Request, Response } from 'express';
import fs from 'fs/promises';
import { z } from 'zod';
import { DocumentNotFoundError } from '@/modules/document/core/errors';
import type { Document } from '@/modules/document/core/types';
import { DocumentService } from '@/modules/document/document.service';
import { querySchema, documentSchema } from '@/modules/document/document.schema';

export class DocumentController {
    private documentService: DocumentService = DocumentService.getInstance();

    async upload(req: Request & { file?: Express.Multer.File }, res: Response) {
        try {
            if (!req.file) {
                return void res.status(400).json({
                    status: 'error',
                    message: 'No file uploaded'
                });
            }

            const content = await fs.readFile(req.file.path, 'utf-8');
            const doc = await this.documentService.upload(req.file, content);
            const validatedDoc = documentSchema.parse(doc);

            res.status(201).json({
                status: 'success',
                data: validatedDoc
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return void res.status(400).json({
                    status: 'error',
                    message: 'Invalid document data',
                    errors: error.errors
                });
            }

            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Upload failed'
            });
        }
    }

    async query(req: Request, res: Response) {
        try {
            const validated = querySchema.parse({
                q: req.query.q,
                page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 10,
                sortBy: req.query.sortBy || 'createdAt',
                sortOrder: req.query.sortOrder || 'desc'
            });

            const result = await this.documentService.query({
                q: validated.q,
                page: validated.page,
                limit: validated.limit,
                sortBy: validated.sortBy as keyof Document,
                sortOrder: validated.sortOrder
            });

            const validatedDocs = z.array(documentSchema).parse(result.documents);
            res.json({
                status: 'success',
                data: {
                    documents: validatedDocs,
                    total: result.total
                }
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return void res.status(400).json({
                    status: 'error',
                    message: 'Invalid query parameters',
                    errors: error.errors
                });
            }

            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Query failed'
            });
        }
    }

    async findById(req: Request, res: Response) {
        try {
            const doc = await this.documentService.findById(req.params.id);
            if (!doc) {
                return void res.status(404).json({
                    status: 'error',
                    message: `Document with id "${req.params.id}" not found`
                });
            }

            const validatedDoc = documentSchema.parse(doc);
            res.json({ status: 'success', data: validatedDoc });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return void res.status(400).json({
                    status: 'error',
                    message: 'Invalid document ID',
                    errors: error.errors
                });
            }

            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Find failed'
            });
        }
    }

    async delete(req: Request<{ id: string }>, res: Response) {
        try {
            const { id } = documentSchema.pick({ id: true }).parse(req.params);
            await this.documentService.delete(id);
            res.status(204).send();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return void res.status(400).json({
                    status: 'error',
                    message: 'Invalid document ID',
                    errors: error.errors
                });
            }

            if (error instanceof DocumentNotFoundError) {
                return void res.status(404).json({
                    status: 'error',
                    message: error.message
                });
            }

            res.status(500).json({
                status: 'error',
                message: error instanceof Error ? error.message : 'Delete failed'
            });
        }
    }
}
