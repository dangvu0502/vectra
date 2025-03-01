import { beforeAll, afterAll } from 'vitest';
import { setupTestServer, cleanupServer } from './utils';
import fs from 'fs/promises';
import path from 'path';

beforeAll(async () => {
  await setupTestServer();
});

afterAll(async () => {
  await cleanupServer();
  const uploadDir = path.join(process.cwd(), 'uploads');
  console.log(uploadDir);
  try {
    await fs.rm(uploadDir, { recursive: true });
  } catch (err) {
    // Ignore the error if the directory does not exist
  }
});