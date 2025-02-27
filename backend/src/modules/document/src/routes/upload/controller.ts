import type { Request, Response } from 'express';
import { z } from 'zod';
import { uploadDocument } from './service';

type UploadResponse = {
  status: 'success' | 'error';
  data?: Document;
  message?: string;
}

const uploadSchema = z.object({
  file: z.object({
    originalname: z.string(),
    path: z.string()
  }).nullable()
});


export async function uploadController(req: Request, res: Response): Promise<Response<UploadResponse>> {
  const result = uploadSchema.safeParse({ file: req.file });

  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  if (!result.data.file) {
    return res.status(400).json({
      status: 'error',
      message: 'No file uploaded'
    });
  }

  try {
    const doc = await uploadDocument(req.storage, result.data.file.originalname, result.data.file.path);
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