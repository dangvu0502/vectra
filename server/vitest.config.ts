import { defineConfig } from 'vitest/config';
import path from 'path'

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
        '@': path.resolve(__dirname, './src')
    }
  }
});