import path from 'path';
import fs from 'fs/promises';
import type { Express } from 'express';
import express from 'express';
import type { Server } from 'http';
import { createDocumentStorage } from '../storage';
import { createDocumentService } from '../services';
import { createDocumentRouter } from '../routes';

export const TEST_PORT = 3000;
export const BASE_URL = `http://localhost:${TEST_PORT}`;
export const FIXTURES_DIR = path.join(__dirname, 'fixtures');
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

export const createTestApp = () => {
    const app = express();
    const storage = createDocumentStorage();
    const service = createDocumentService(storage);
    const router = createDocumentRouter(service);

    app.use('/documents', router);
    return app;
};

export async function setupTestServer() {
  const app = createTestApp();
  const server = await startServer(app);
  await setupDirectories();
  return { app, server };
}

export async function createTestFile(content = 'Test content') {
  const filePath = path.join(FIXTURES_DIR, 'test.txt');
  await fs.writeFile(filePath, content);
  return filePath;
}

export async function createFormData(filePath: string) {
  const formData = new FormData();
  const content = await fs.readFile(filePath, 'utf-8');
  const file = new Blob([content], { type: 'text/plain' });
  formData.append('file', file, path.basename(filePath));
  return formData;
}

export async function cleanupServer(server: Server) {
  await Promise.race([
    new Promise<void>((resolve) => server?.close(() => resolve())),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Server shutdown timeout')), 5000)
    )
  ]);
  await cleanupDirectories();
}

async function startServer(app: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(TEST_PORT);
    server.once('listening', () => resolve(server));
    server.once('error', reject);
  });
}

async function setupDirectories() {
  await cleanupDirectories();
  await Promise.all([
    fs.mkdir(FIXTURES_DIR, { recursive: true }),
    fs.mkdir(UPLOADS_DIR, { recursive: true })
  ]);
}

async function cleanupDirectories() {
  await Promise.all([
    fs.rm(FIXTURES_DIR, { recursive: true, force: true }),
    fs.rm(UPLOADS_DIR, { recursive: true, force: true })
  ]);
}