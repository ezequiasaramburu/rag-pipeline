/**
 * Shared Postgres pool. Used by document API, ingestion job, and vector store.
 */

import { Pool } from 'pg';

import type { AppConfig } from './server-config';

let pool: Pool | null = null;

export function getPool(config: AppConfig): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: config.DATABASE_URL });
  }
  return pool;
}
