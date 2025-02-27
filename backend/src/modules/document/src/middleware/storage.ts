import type { Request, Response, NextFunction } from 'express';
import { InMemoryDocumentStorage } from '../storage';

const storage = new InMemoryDocumentStorage();

export function withStorage(req: Request, res: Response, next: NextFunction) {
  req.storage = storage;
  next();
}

declare global {
  namespace Express {
    interface Request {
      storage: InstanceType<typeof InMemoryDocumentStorage>;
    }
  }
}