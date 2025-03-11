import { describe, it, expect } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import { createTestApp, setupTestEnvironment } from '@/modules/shared';

describe('DELETE /api/v1/documents/:id', () => {
    const app = createTestApp()
    const { testFilesDir } = setupTestEnvironment();

    it('should delete document and return 204', async () => {
        // Upload a test document first
        const testFilePath = path.join(testFilesDir, 'to-delete.txt');
        await fs.writeFile(testFilePath, 'This document will be deleted');

        const uploadResponse = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath);

        const docId = uploadResponse.body.data.id;

        await request(app)
            .delete(`/api/v1/documents/${docId}`)
            .expect(204);

        await request(app)
            .get(`/api/v1/documents/${docId}`)
            .expect(404);
    });

    it('should return 404 when trying to delete non-existent document', async () => {
        const id = 'non-existent-id';

        const response = await request(app)
            .delete(`/api/v1/documents/${id}`)
            .expect(404);

        expect(response.body).toEqual({
            status: 'error',
            message: `Document with id "${id}" not found`
        });
    });

    it('should handle concurrent delete requests', async () => {
        const testFilePath = path.join(testFilesDir, 'concurrent-delete.txt');
        await fs.writeFile(testFilePath, 'Concurrent delete test');

        const uploadResponse = await request(app)
            .post('/api/v1/documents/upload')
            .attach('file', testFilePath);

        const docId = uploadResponse.body.data.id;

        const deleteRequests = Array(3).fill(null).map(() =>
            request(app).delete(`/api/v1/documents/${docId}`)
        );

        const responses = await Promise.all(deleteRequests);

        expect(responses[0].status).toBe(204);
        expect(responses.slice(1).every(r => r.status === 404)).toBe(true);
    });

});