import path from 'path';
import fs from 'fs/promises';
import type { Express } from 'express';
import express from 'express';
import type { Server } from 'http';
import router from '../../routes';

export const TEST_PORT = 3000;
export const BASE_URL = `http://localhost:${TEST_PORT}`;
export const FIXTURES_DIR = path.join(__dirname, 'fixtures');
export const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

let globalServer: Server | null = null;
let globalApp: Express | null = null;

export const createTestApp = () => {
  if (!globalApp) {
    globalApp = express();

    globalApp.use('/documents', router);
  }
  return globalApp;
};

export async function setupTestServer() {
  if (!globalServer) {
    const app = createTestApp();
    globalServer = await startServer(app);
    await setupDirectories();
  }
  return globalServer;
}

export async function cleanupServer() {
  if (globalServer) {
    await Promise.race([
      new Promise<void>((resolve) => globalServer?.close(() => resolve())),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Server shutdown timeout')), 5000)
      )
    ]);
    globalServer = null;
    globalApp = null;
  }
  await cleanupDirectories();
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