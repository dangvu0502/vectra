import express from 'express';
import fs from 'fs/promises';
import type { Server } from 'http';
import path from 'path';
import router from '../routes';

export const TEST_PORT = 3000;
export const BASE_URL = `http://localhost:${TEST_PORT}`;
export const FIXTURES_DIR = path.join(__dirname, 'fixtures');

const app = express();
app.use('/documents', router);

let server: Server;

// Server management
export async function setupTestServer() {
  server = await new Promise((resolve, reject) => {
    const instance = app.listen(TEST_PORT, () => resolve(instance));
    instance.once('error', reject);
  });
  await fs.mkdir(FIXTURES_DIR, { recursive: true });
}

export async function cleanupServer(): Promise<void> {
  if (!server) return;
  
  await new Promise<void>((resolve, reject) => {
    server.close((err) => err ? reject(err) : resolve());
  });
  await fs.rm(FIXTURES_DIR, { recursive: true, force: true });
}

export async function createTestFile(content = 'Test content'): Promise<string> {
  const filePath = path.join(FIXTURES_DIR, 'test.txt');
  await fs.writeFile(filePath, content);
  return filePath;
}

export async function createFormData(filePath: string): Promise<FormData> {
  const formData = new FormData();
  const content = await fs.readFile(filePath, 'utf-8');
  const file = new Blob([content], { type: 'text/plain' });
  formData.append('file', file, path.basename(filePath));
  return formData;
}