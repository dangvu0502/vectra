import type { Request, Response } from 'express';
import type { DocumentStorage } from '../../types';
import { uploadDocument } from './service';

export async function uploadController(storage: DocumentStorage, req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    const doc = await uploadDocument(storage, req.file.originalname, req.file.path);
    return res.status(201).json({
      status: 'success',
      data: doc
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Upload failed'
    });
  }
}