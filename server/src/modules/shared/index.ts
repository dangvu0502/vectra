import { beforeEach, afterEach } from "vitest";
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { documentRoutes } from '@/modules/document';

export function setupTestEnvironment() {
    const testFilesDir = path.join(__dirname, '../fixtures');

    beforeEach(async () => {
        await fs.mkdir(testFilesDir, { recursive: true });
    });

    afterEach(async () => {
        await fs.rmdir(testFilesDir, { recursive: true });
    });

    return {
        testFilesDir,
    };
}

export function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/documents', documentRoutes);

    return app;
}

export type TestApp = ReturnType<typeof createTestApp>;