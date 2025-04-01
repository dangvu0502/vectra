import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '@/database/connection';
import { KnowledgeService } from './knowledge.service';
import type { UserProfile } from '@/modules/auth/auth.types';

// Extend Express Request to include user with UserProfile type
declare global {
  namespace Express {
    interface User extends UserProfile {}
  }
}

// Initialize the knowledge service with the database connection
const knowledgeService = KnowledgeService.getInstance(db);

// Define validation schema for query request
const queryRequestSchema = z.object({
  query: z.string().min(1, 'Query text is required'),
  collection_id: z.string().uuid().optional(),
});

export class KnowledgeController {
  /**
   * Query the knowledge base
   * POST /api/v1/knowledge/query
   */
  static async queryKnowledge(req: Request, res: Response): Promise<void> {
    try {
      // Validate request body
      const validationResult = queryRequestSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: validationResult.error.errors,
        });
        return;
      }

      // Get user ID from authenticated request
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const { query, collection_id } = validationResult.data;

      // Search the knowledge base
      const results = await knowledgeService.searchKnowledgeBase(query, {
        user_id: userId,
        collection_id,
      });

      // Return the results
      res.status(200).json({
        success: true,
        data: {
          results,
          query,
          collection_id,
        },
      });
    } catch (error) {
      console.error('Error in knowledge query:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({
        success: false,
        message: 'Failed to query knowledge base',
        error: errorMessage,
      });
    }
  }
}
