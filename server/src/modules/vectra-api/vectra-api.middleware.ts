import type { Request, Response, NextFunction } from 'express';
import type { ApiKeyService } from '../api-keys/api-keys.service';
import { AppError } from '@/shared/errors';

export interface ApiKeyUser {
  userId: string;
  apiKeyId: string;
}

// Augment Express Request type to include apiKeyUser
declare global {
  namespace Express {
    interface Request {
      apiKeyUser?: ApiKeyUser;
    }
  }
}

export function createEnsureApiKeyAuthenticated(apiKeyService: ApiKeyService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      const error = new AppError('API key is required.', 401);
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    try {
      const validatedKey = await apiKeyService.validateApiKey(apiKey);

      if (!validatedKey) {
        const error = new AppError('Invalid API key.', 401);
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      req.apiKeyUser = {
        userId: validatedKey.userId,
        apiKeyId: validatedKey.apiKeyId,
      };

      next();
    } catch (error) {
      console.error('Error validating API key:', error);
      const genericError = new AppError('API key validation failed.', 401); // Default to 401 for validation issues
      res.status(genericError.statusCode).json({ error: genericError.message });
    }
  };
}
