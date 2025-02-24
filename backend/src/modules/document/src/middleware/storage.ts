import type { Request, Response, NextFunction } from 'express';
import { createDocumentStorage } from '../storage';

const storage = createDocumentStorage();

export function withStorage(req: Request, res: Response, next: NextFunction) {
  req.storage = storage;
  next();
}

declare global {
  namespace Express {
    interface Request {
      storage: ReturnType<typeof createDocumentStorage>;
    }
  }
}