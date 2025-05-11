import config from './knexfile';
import { env } from '@/config/environment';
import knex from 'knex';

export const db = knex(config[env.NODE_ENV]);
