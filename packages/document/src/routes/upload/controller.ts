import type { Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import type { Document } from '../../types';

type UploadResponse = {
  status: 'success' | 'error';
  data?: Document;
  message?: string;
}

const uploadSchema = z.object({
  file: z.object({
    originalname: z.string(),
    filename: z.string(),
    path: z.string(),
    mimetype: z.string()
  }).nullable()
});

export async function uploadController(req: Request, res: Response): Promise<Response<UploadResponse>> {
  const result = uploadSchema.safeParse({ file: req.file });

  if (!result.success || !result.data.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    const content = await fs.readFile(result.data.file.path, 'utf-8');
    const doc: Document = {
      id: uuidv4(),
      filename: result.data.file.originalname,
      path: result.data.file.path,
      content,
      createdAt: new Date()
    };
    
    const savedDoc = await req.storage.save(doc);
    return res.status(201).json({
      status: 'success',
      data: savedDoc
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Upload failed'
    });
  }
}