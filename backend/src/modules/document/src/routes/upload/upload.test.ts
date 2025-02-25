import { beforeEach, describe, expect, it } from 'vitest';
import { BASE_URL, createFormData, createTestFile } from '../../tests/utils';

describe('Upload Route', () => {
  let testFilePath: string;

  beforeEach(async () => {
    testFilePath = await createTestFile();
  });

  it('should upload a document', async () => {
    const response = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      body: await createFormData(testFilePath)
    });

    const data = await response.json();
    expect(response.status).toBe(201);
    expect(data).toMatchObject({
      status: 'success',
      data: {
        filename: 'test.txt',
        content: 'Test content'
      }
    });
  });

  it('should return 400 when no file is provided', async () => {
    const response = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST'
    });

    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data).toMatchObject({
      status: 'error',
      message: 'No file uploaded'
    });
  });
});