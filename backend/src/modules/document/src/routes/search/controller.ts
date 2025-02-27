import type { Request, Response } from 'express';
import { z } from 'zod';
import { searchDocuments } from './service';

type SearchResponse = {
  status: 'success' | 'error';
  data?: Document[];
  message?: string;
}

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Query required')
});

export async function searchController(req: Request, res: Response): Promise<Response<SearchResponse>> {
  const result = searchQuerySchema.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json({
      status: 'error',
      message: result.error.issues[0].message
    });
  }

  try {
    const results = await searchDocuments(req.storage, result.data.q);
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
}