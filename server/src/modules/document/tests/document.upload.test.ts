import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { createTestApp, setupTestEnvironment } from '@/modules/shared';

describe('POST /api/v1/documents/upload', () => {
    const app = createTestApp()
    const {  testFilesDir } = setupTestEnvironment();

    it('should upload document successfully', async () => {
        const testFilePath = path.join(testFilesDir, 'upload.txt');
        const content = 'This is a test upload';
        await fs.writeFile(testFilePath, content);

        const response = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath)
            .expect(201);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toMatchObject({
            filename: 'upload.txt',
            content: content
        });
        expect(response.body.data.id).toBeDefined();
    });

    it('should return 400 when no file is uploaded', async () => {
        const response = await request(app)
            .post('/api/v1/documents/upload')
            .expect(400);

        expect(response.body).toEqual({
            status: 'error',
            message: 'No file uploaded'
        });
    });

    it('should handle large text files', async () => {
        const testFilePath = path.join(testFilesDir, 'large.txt');
        const content = 'A'.repeat(1024 * 1024); // 1MB file
        await fs.writeFile(testFilePath, content);

        const response = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath)
            .expect(201);

        expect(response.body.status).toBe('success');
        expect(response.body.data.content).toBe(content);
    });
});