/**
 * pgvector implementation of VectorStore. Uses raw pg driver; no ORM.
 * All queries for chunks live here.
 */

import { Pool } from 'pg';

import type { ChunkRow, VectorStore } from './types';

/** Format embedding array for Postgres vector(768) type. */
function toVectorLiteral(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}

export class PgVectorStore implements VectorStore {
  constructor(private readonly pool: Pool) {}

  async upsertChunks(documentId: string, chunks: ChunkRow[]): Promise<void> {
    if (chunks.length === 0) return;

    const client = await this.pool.connect();
    try {
      await client.query('DELETE FROM chunks WHERE document_id = $1', [documentId]);

      for (const row of chunks) {
        await client.query(
          `INSERT INTO chunks (document_id, chunk_index, text, section_title, page_number, token_count, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
          [
            documentId,
            row.chunkIndex,
            row.text,
            row.sectionTitle ?? null,
            row.pageNumber ?? null,
            row.tokenCount,
            toVectorLiteral(row.embedding),
          ],
        );
      }
    } finally {
      client.release();
    }
  }
}
