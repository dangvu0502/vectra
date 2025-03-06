import type { Request, Response } from 'express';
import { z } from 'zod';

type QueryResponse = {
  status: 'success' | 'error';
  data?: {
    documents: Document[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
    }
  };
  message?: string;
}

const queryParamsSchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export async function queryController(req: Request, res: Response): Promise<Response<QueryResponse>> {
  try {
    const result = queryParamsSchema.safeParse(req.query);
    
    if (!result.success) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid query parameters'
      });
    }

    const { q, page, limit } = result.data;
    const { documents, total } = await req.storage.query({
      query: q,
      page,
      limit
    });
    
    return res.status(200).json({
      status: 'success',
      data: {
        documents,
        pagination: {
          page,
          limit,
          total
        }
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Query failed'
    });
  }
}