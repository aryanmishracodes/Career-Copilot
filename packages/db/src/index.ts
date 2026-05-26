import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

let pool: Pool;
let db: ReturnType<typeof drizzle<typeof schema>>;

export function getDb(connectionString: string) {
  if (!db) {
    pool = new Pool({ connectionString });
    db = drizzle(pool, { schema });
  }
  return db;
}

export * from './schema';
