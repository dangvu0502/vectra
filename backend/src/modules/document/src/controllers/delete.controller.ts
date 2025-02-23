import { type Request, type Response } from 'express';
import type { DocumentService } from '../services';
import type { ControllerResponse } from '../types';

export const deleteDocument = (service: DocumentService) => 
  async (req: Request, res: Response): ControllerResponse => {
    try {
      const success = await service.delete(req.params.id);
      if (!success) {
        return res.status(404).json({
          status: 'error',
          message: 'Document not found'
        });
      }
      return res.status(204).send();
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Delete failed'
      });
    }
  };