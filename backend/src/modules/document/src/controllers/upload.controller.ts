import { type Request, type Response } from 'express';
import type { DocumentService } from '../services';
import type { ControllerResponse } from '../types';

export const uploadDocument = (service: DocumentService) =>
  async (req: Request, res: Response): ControllerResponse => {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    try {
      const doc = await service.upload(
        req.file.originalname,
        req.file.path
      );

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
  };