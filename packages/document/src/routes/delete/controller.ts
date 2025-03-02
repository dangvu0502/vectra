import type { Request, Response } from 'express';
import { z } from 'zod';
import { deleteDocument } from './service';

type DeleteResponse = {
  status: 'success' | 'error';
  message?: string;
}

const deleteParamsSchema = z.object({
  id: z.string().uuid('Invalid document ID format')
});

export async function deleteController(req: Request, res: Response): Promise<Response<DeleteResponse>> {
  try {
    const result = deleteParamsSchema.safeParse(req.params);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: result.error.issues[0].message
      });
    }

    const success = await deleteDocument(req.storage, result.data.id);
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