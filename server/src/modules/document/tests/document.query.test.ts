import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { createTestApp, setupTestEnvironment } from '@/modules/shared';

describe('GET /api/v1/documents', () => {
    const app = createTestApp()
    const { testFilesDir } = setupTestEnvironment()

    beforeEach(async () => {
        const documents = [
            { name: 'doc1.txt', content: 'First document' },
            { name: 'doc2.txt', content: 'Second document' },
            { name: 'doc3.txt', content: 'Third document' }
        ];

        for (const doc of documents) {
            const testFilePath = path.join(testFilesDir, doc.name);
            await fs.writeFile(testFilePath, doc.content);
            await request(app)
                .post('/api/v1/documents/upload')
                .attach('file', testFilePath);
        }
    });

    it('should return all documents without query parameters', async () => {
        const response = await request(app)
            .get('/api/v1/documents')
            .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.documents).toHaveLength(3);
        expect(response.body.data.documents[0]).toHaveProperty('id');
        expect(response.body.data.documents[0]).toHaveProperty('filename');
        expect(response.body.data.documents[0]).toHaveProperty('content');
    });

    it('should handle empty result set', async () => {
        const response = await request(app)
            .get('/api/v1/documents?q=nonexistent')
            .expect(200);

        expect(response.body.status).toBe('success');
        expect(response.body.data.documents).toHaveLength(0);
        expect(response.body.data.total).toBe(0);
    });
});