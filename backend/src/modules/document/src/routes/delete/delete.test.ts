import { describe, expect, it } from 'vitest';
import { BASE_URL, createFormData, createTestFile } from '../../tests/utils';
import { PREFIX } from '../../config';

describe('Delete Route', () => {
    it('should delete an existing document', async () => {
        // Create and upload a test document
        const testFilePath = await createTestFile('Delete test content');
        const uploadResponse = await fetch(`${BASE_URL}${PREFIX}/upload`, {
            method: 'POST',
            body: await createFormData(testFilePath)
        });
        const { data: { id } } = await uploadResponse.json();

        // Delete the document
        const deleteResponse = await fetch(`${BASE_URL}${PREFIX}/${id}`, {
            method: 'DELETE'
        });

        expect(deleteResponse.status).toBe(204);

        // Verify document is deleted
        const searchResponse = await fetch(`${BASE_URL}${PREFIX}/search?q=Delete`);
        const searchData = await searchResponse.json();
        expect(searchData.data).toHaveLength(0);
    });

    it('should return 404 for non-existent document', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/nonexistent-id`, {
            method: 'DELETE'
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toMatchObject({
            status: 'error',
            message: 'Document not found'
        });
    });

    it('should return 400 for invalid id format', async () => {
        const response = await fetch(`${BASE_URL}${PREFIX}/invalid-uuid-format`, {
            method: 'DELETE'
        });
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data).toMatchObject({
            status: 'error',
            message: 'Document not found'
        });
    });
});