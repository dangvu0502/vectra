import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupServer, createTestFile, createFormData, BASE_URL } from '../../utils.ts/__tests__';

describe('Search Route', () => {
    let testFilePath: string;

    beforeAll(async () => {
        await setupTestServer();
    });

    beforeEach(async () => {
        testFilePath = await createTestFile('Searchable content');
        // Upload a test document for searching
        await fetch(`${BASE_URL}/documents/upload`, {
            method: 'POST',
            body: await createFormData(testFilePath)
        });
    });

    afterAll(async () => {
        await cleanupServer();
    });



    it('should search documents', async () => {
        const response = await fetch(`${BASE_URL}/documents/search?q=Searchable`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
            status: 'success',
            data: expect.arrayContaining([
                expect.objectContaining({
                    content: expect.stringContaining('Searchable')
                })
            ])
        });
    });

    it('should return empty array when no matches', async () => {
        const response = await fetch(`${BASE_URL}/documents/search?q=nonexistent`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
            status: 'success',
            data: []
        });
    });

    it('should return 400 when no query provided', async () => {
        const response = await fetch(`${BASE_URL}/documents/search`);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toMatchObject({
            status: 'error',
            message: 'Query required'
        });
    });
});