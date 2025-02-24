import type { Request, Response } from 'express';
import { uploadDocument } from './service';

export async function uploadController(req: Request, res: Response) {
  if (!req.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    const doc = await uploadDocument(req.storage, req.file.originalname, req.file.path);
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