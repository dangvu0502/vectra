import express from 'express';
import { InMemoryDocumentStorage } from './storage';
import { PREFIX } from './config';
import router from './routes';

export function createDocumentService(options?: {
    prefix?: string;
    storage?: InstanceType<typeof InMemoryDocumentStorage>;
}) {
    const app = express();
    const storage = options?.storage || new InMemoryDocumentStorage();

    app.use((req, res, next) => {
        req.storage = storage;
        next();
    });

    app.use(options?.prefix || PREFIX, router);

    return app;
}