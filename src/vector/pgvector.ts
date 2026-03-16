/**
 * pgvector implementation of VectorStore. Uses raw pg driver; no ORM.
 * All queries for chunks live here.
 */

import { Pool } from 'pg';

import type { ChunkRow, SearchChunk, VectorStore } from './types';

/** Format embedding array for Postgres vector(768) type. */
function toVectorLiteral(embedding: number[]): string {
  return '[' + embedding.join(',') + ']';
}

function rowToSearchChunk(row: {
  id: string;
  text: string;
  document_id: string;
  filename: string;
  section_title: string | null;
  page_number: number | null;
  chunk_index: number;
  token_count: number;
}): SearchChunk {
  return {
    chunkId: row.id,
    text: row.text,
    documentId: row.document_id,
    filename: row.filename,
    sectionTitle: row.section_title ?? undefined,
    pageNumber: row.page_number ?? undefined,
    chunkIndex: row.chunk_index,
    tokenCount: row.token_count,
  };
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

  async searchByVector(embedding: number[], limit: number): Promise<SearchChunk[]> {
    const vectorStr = toVectorLiteral(embedding);
    const result = await this.pool.query(
      `SELECT c.id, c.text, c.document_id, d.filename, c.section_title, c.page_number, c.chunk_index, c.token_count
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.embedding IS NOT NULL
       ORDER BY c.embedding <=> $1::vector
       LIMIT $2`,
      [vectorStr, limit],
    );
    return result.rows.map(rowToSearchChunk);
  }

  async searchByText(tsQuery: string, limit: number): Promise<SearchChunk[]> {
    const trimmed = tsQuery.trim();
    if (!trimmed) return [];

    const result = await this.pool.query(
      `SELECT c.id, c.text, c.document_id, d.filename, c.section_title, c.page_number, c.chunk_index, c.token_count
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
       WHERE c.tsv @@ plainto_tsquery('english', $1)
       ORDER BY ts_rank_cd(c.tsv, plainto_tsquery('english', $1)) DESC
       LIMIT $2`,
      [trimmed, limit],
    );
    return result.rows.map(rowToSearchChunk);
  }
}
