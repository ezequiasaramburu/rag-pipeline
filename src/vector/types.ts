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

export interface VectorStore {
  /** Insert or replace chunks for a document. Caller must provide embeddings. */
  upsertChunks(documentId: string, chunks: ChunkRow[]): Promise<void>;
}
