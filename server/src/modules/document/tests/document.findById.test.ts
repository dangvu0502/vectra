import { createTestApp, setupTestEnvironment } from '@/modules/shared';
import fs from 'fs/promises';
import path from 'path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

describe('GET /api/v1/documents/:id', () => {
    const app = createTestApp()
    const { testFilesDir } = setupTestEnvironment()

    it('should return document when found', async () => {
        const testFilePath = path.join(testFilesDir, 'sample.txt');
        await fs.writeFile(testFilePath, 'This is a test document');

        const uploadResponse = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath);

        const docId = uploadResponse.body.data.id;

        const response = await request(app)
            .get(`/api/v1/documents/${docId}`)
            .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data).toMatchObject({
            id: docId,
            filename: 'sample.txt',
            content: 'This is a test document'
        });
    });

    it('should return 404 when document not found', async () => {
        const response = await request(app)
            .get('/api/v1/documents/non-existent-id')
            .expect(404);

        expect(response.body).toEqual({
            status: 'error',
            message: 'Document with id "non-existent-id" not found'
        });
    });

    it('should handle large documents', async () => {
        const testFilePath = path.join(testFilesDir, 'large.txt');
        const content = 'A'.repeat(1024 * 1024); // 1MB content
        await fs.writeFile(testFilePath, content);

        const uploadResponse = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath);

        const docId = uploadResponse.body.data.id;

        const response = await request(app)
            .get(`/api/v1/documents/${docId}`)
            .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.content).toBe(content);
        expect(response.body.data.content.length).toBe(1024 * 1024);
    });

    it('should handle concurrent requests for same document', async () => {
        const testFilePath = path.join(testFilesDir, 'concurrent.txt');
        await fs.writeFile(testFilePath, 'Concurrent test content');

        const uploadResponse = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath);

        const docId = uploadResponse.body.data.id;

        const requests = Array(5).fill(null).map(() =>
            request(app).get(`/api/v1/documents/${docId}`)
        );

        const responses = await Promise.all(requests);

        responses.forEach(response => {
            expect(response.status).toBe(200);
            expect(response.body.data.content).toBe('Concurrent test content');
        });
    });
});