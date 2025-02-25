import { beforeEach, describe, expect, it } from 'vitest';
import { BASE_URL, createFormData, createTestFile } from '../../tests/utils';

describe('Search Route', () => {
    let testFilePath: string;

    beforeEach(async () => {
        testFilePath = await createTestFile('Searchable content');
        // Upload a test document for searching
        await fetch(`${BASE_URL}/documents/upload`, {
            method: 'POST',
            body: await createFormData(testFilePath)
        });
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