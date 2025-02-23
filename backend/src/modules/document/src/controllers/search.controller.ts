import { type Request, type Response } from 'express';
import type { DocumentService } from '../services';
import type { ControllerResponse } from '../types';

export const searchDocuments = (service: DocumentService) =>
  async (req: Request, res: Response): ControllerResponse => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Query required'
      });
    }

    try {
      const results = await service.search(query);
      return res.status(200).json({
        status: 'success',
        data: results
      });
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Search failed'
      });
    }
  };