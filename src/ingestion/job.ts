/**
 * BullMQ ingestion job. Reads file from disk, parses, chunks, embeds, and
 * upserts to the vector store. Updates document status when done.
 */

import { readFile } from 'fs/promises';
import { Pool } from 'pg';

import { getPool } from '../db';
import { loadConfig } from '../server-config';
import { PgVectorStore } from '../vector/pgvector';
import { chunkDocument } from './chunker';
import { createEmbeddingProvider } from './embedding-provider';
import { embedAndStore } from './embedder';
import { parseDocument } from './parser';

export interface IngestionJobPayload {
  documentId: string;
  filePath: string;
  filename: string;
  mimeType: string;
}

export const INGESTION_QUEUE_NAME = 'sage-ingestion';

export async function runIngestionJob(payload: IngestionJobPayload): Promise<void> {
  const config = loadConfig();
  const pool = getPool(config);

  try {
    const buffer = await readFile(payload.filePath);
    const parsed = await parseDocument({
      buffer,
      filename: payload.filename,
      mimeType: payload.mimeType,
    });

    const chunks = chunkDocument(parsed, config.MAX_CHUNK_TOKENS);
    if (chunks.length === 0) {
      await setDocumentStatus(pool, payload.documentId, 'ready', null);
      return;
    }

    const embeddingProvider = createEmbeddingProvider(config);
    const vectorStore = new PgVectorStore(pool);
    await embedAndStore(payload.documentId, chunks, embeddingProvider, vectorStore);

    await setDocumentStatus(pool, payload.documentId, 'ready', null);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await setDocumentStatus(pool, payload.documentId, 'failed', message);
    throw err;
  }
}

async function setDocumentStatus(
  pool: Pool,
  documentId: string,
  status: string,
  error: string | null,
): Promise<void> {
  await pool.query(
    `UPDATE documents SET status = $1, error = $2, updated_at = NOW() WHERE id = $3`,
    [status, error, documentId],
  );
}
