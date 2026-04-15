import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

let db: ReturnType<typeof createDb> | null = null;

function createDb(url: string) {
  const client = postgres(url);
  return drizzle(client, { schema });
}

export function getDb(url?: string) {
  if (!db) {
    const connectionUrl = url || process.env.DATABASE_URL;
    if (!connectionUrl) {
      throw new Error('DATABASE_URL is not set');
    }
    db = createDb(connectionUrl);
  }
  return db;
}

export type Database = ReturnType<typeof createDb>;
