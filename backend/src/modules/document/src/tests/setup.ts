import { beforeAll, afterAll } from 'vitest';
import { setupTestServer, cleanupServer } from './utils';

beforeAll(async () => {
  await setupTestServer();
});

afterAll(async () => {
  await cleanupServer();
});