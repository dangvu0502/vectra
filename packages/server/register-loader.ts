import { register } from 'node:module';

register('./src/loader.ts', import.meta.url);