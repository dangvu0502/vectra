import type { Request, Response } from 'express';
import { deleteDocument } from './service';

type DeleteResponse = {
  status: 'success' | 'error';
  message?: string;
}

export async function deleteController(req: Request, res: Response): Promise<Response<DeleteResponse>> {
  try {
    const success = await deleteDocument(req.storage, req.params.id);
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
}