/**
 * VectorStore interface. All vector DB access goes through this abstraction;
 * swap pgvector (local) vs Qdrant (cloud) via config.
 */

/** Single chunk row for upsert (embedding is produced by EmbeddingProvider). */
export interface ChunkRow {
  chunkIndex: number;
  text: string;
  sectionTitle?: string;
  pageNumber?: number;
  tokenCount: number;
  embedding: number[];
}

/** Chunk row returned by search (for RRF and retrieval). */
export interface SearchChunk {
  chunkId: string;
  text: string;
  documentId: string;
  filename: string;
  sectionTitle?: string;
  pageNumber?: number;
  chunkIndex: number;
  tokenCount: number;
}

export interface VectorStore {
  /** Insert or replace chunks for a document. Caller must provide embeddings. */
  upsertChunks(documentId: string, chunks: ChunkRow[]): Promise<void>;

  /** Dense search by embedding (cosine distance). */
  searchByVector(embedding: number[], limit: number): Promise<SearchChunk[]>;

  /** Sparse search by full-text (tsquery). */
  searchByText(tsQuery: string, limit: number): Promise<SearchChunk[]>;
}
