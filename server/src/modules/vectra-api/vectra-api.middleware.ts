import type { Request, Response, NextFunction } from 'express';
import type { ApiKeyService } from '../api-keys/api-keys.service'; // Assuming ApiKeyService type is exported
import { AppError } from '@/shared/errors'; // Use AppError for status codes

// Define a type for the user object attached by the middleware
export interface ApiKeyUser {
  userId: string;
  apiKeyId: string;
}

// Extend the Express Request interface
declare global {
  namespace Express {
    interface Request {
      apiKeyUser?: ApiKeyUser;
    }
  }
}

// Factory function to create the middleware with dependency injection
export function createEnsureApiKeyAuthenticated(apiKeyService: ApiKeyService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const apiKey = req.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      // Use AppError with 401 status code
      const error = new AppError('API key is required.', 401);
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    try {
      const validatedKey = await apiKeyService.validateApiKey(apiKey);

      if (!validatedKey) {
        // Use AppError with 401 status code
        const error = new AppError('Invalid API key.', 401);
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      // Attach validated user info to the request object
      req.apiKeyUser = {
        userId: validatedKey.userId,
        apiKeyId: validatedKey.apiKeyId,
      };

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Error validating API key:', error);
      // Use AppError with 401 status code for generic validation failures
      const genericError = new AppError('API key validation failed.', 401);
      res.status(genericError.statusCode).json({ error: genericError.message });
    }
  };
}
