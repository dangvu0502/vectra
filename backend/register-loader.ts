import { register } from 'node:module';

// Register the loader
register('./src/loader.ts', import.meta.url);