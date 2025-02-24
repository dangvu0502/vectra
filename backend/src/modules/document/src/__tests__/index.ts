import path from 'path';
import fs from 'fs/promises';
import type { Express } from 'express';
import express from 'express';
import type { Server } from 'http';
import { withStorage } from '../middleware/storage';
import router from '../routes';

// Constants
export const TEST_PORT = 3000;
export const BASE_URL = `http://localhost:${TEST_PORT}`;
export const FIXTURES_DIR = path.join(__dirname, 'fixtures');
export const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Global state
let globalServer: Server | null = null;
let globalApp: Express | null = null;

// Server management
export const createTestApp = () => {
  if (!globalApp) {
    globalApp = express();
    globalApp.use('/documents', router);
  }
  return globalApp;
};

async function startServer(app: Express): Promise<Server> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Server start timeout'));
    }, 10000);

    const server = app.listen(TEST_PORT, () => {
      clearTimeout(timeout);
      resolve(server);
    });

    server.once('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

export async function setupTestServer() {
  if (!globalServer) {
    const app = createTestApp();
    try {
      globalServer = await startServer(app);
      await setupDirectories();
    } catch (error) {
      console.error('Server setup failed:', error);
      throw error;
    }
  }
  return globalServer;
}

export async function cleanupServer() {
  if (globalServer) {
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Server shutdown timeout'));
        }, 10000);

        globalServer?.close(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } finally {
      globalServer = null;
      globalApp = null;
      await cleanupDirectories();
    }
  }
}

// Directory management
async function cleanupDirectories() {
  await Promise.all([
    fs.rm(FIXTURES_DIR, { recursive: true, force: true }),
    fs.rm(UPLOADS_DIR, { recursive: true, force: true })
  ]);
}

async function setupDirectories() {
  await cleanupDirectories();
  await Promise.all([
    fs.mkdir(FIXTURES_DIR, { recursive: true }),
    fs.mkdir(UPLOADS_DIR, { recursive: true })
  ]);
}

// Test helpers
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