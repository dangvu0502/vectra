import type { Request, Response } from 'express';
import { searchDocuments } from './service';

type SearchResponse = {
  status: 'success' | 'error';
  data?: Document[];
  message?: string;
}

export async function searchController(req: Request, res: Response): Promise<Response<SearchResponse>> {
  const query = req.query.q as string;
  if (!query) {
    return res.status(400).json({
      status: 'error',
      message: 'Query required'
    });
  }

  try {
    const results = await searchDocuments(req.storage, query);
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