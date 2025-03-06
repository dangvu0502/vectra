import { beforeEach, describe, expect, it } from 'vitest';
import { BASE_URL, createFormData, createTestFile } from '../../tests/utils';
import { PREFIX } from '../../config';

describe('Query Route', () => {
    beforeEach(async () => {
        // Upload test documents
        const testFile1 = await createTestFile('Query test content');
        const testFile2 = await createTestFile('Searchable content for testing');
        
        await fetch(`${BASE_URL}${PREFIX}/upload`, {
            method: 'POST',
            body: await createFormData(testFile1)
        });
        
        await fetch(`${BASE_URL}${PREFIX}/upload`, {
            method: 'POST',
            body: await createFormData(testFile2)
        });
    });

    it('should list all documents when no search query is provided', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/query`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
            status: 'success',
            data: {
                documents: expect.arrayContaining([
                    expect.objectContaining({
                        filename: expect.any(String),
                        content: expect.any(String)
                    })
                ]),
                pagination: {
                    page: 1,
                    limit: 10,
                    total: expect.any(Number)
                }
            }
        });
    });

    it('should search documents when query parameter is provided', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/query?q=Searchable`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data).toMatchObject({
            status: 'success',
            data: {
                documents: expect.arrayContaining([
                    expect.objectContaining({
                        content: expect.stringContaining('Searchable')
                    })
                ])
            }
        });
    });

    it('should support pagination', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/query?page=1&limit=5`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.pagination).toMatchObject({
            page: 1,
            limit: 5
        });
    });

    it('should return empty array when no search matches', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/query?q=nonexistent`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.documents).toHaveLength(0);
    });

    // Test backward compatibility with old routes
    it('should work with the root path for listing', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
    });

    it('should work with the search path for searching', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/search?q=test`);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('success');
    });
});