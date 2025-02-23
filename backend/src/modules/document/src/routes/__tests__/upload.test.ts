import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestServer, cleanupServer, createTestFile, createFormData, BASE_URL } from '../../__tests__/utils';
import type { Server } from 'http';

describe('Upload Route', () => {
  let server: Server;
  let testFilePath: string;

  beforeAll(async () => {
    ({ server } = await setupTestServer());
  });

  beforeEach(async () => {
    testFilePath = await createTestFile();
  });

  afterAll(async () => {
    await cleanupServer(server);
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