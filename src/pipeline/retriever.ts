/**
 * Hybrid retrieval: dense (vector) + sparse (full-text) with RRF fusion.
 * Returns top DEFAULT_TOP_K chunks sorted by fused score.
 */

import type { AppConfig } from '../server-config';
import type { EmbeddingProvider } from '../ingestion/embedding-provider';
import type { SearchChunk, VectorStore } from '../vector/types';

import { processQuery } from './query-processor';

export interface ChunkMetadata {
  documentId: string;
  filename: string;
  sectionTitle?: string;
  pageNumber?: number;
  chunkIndex: number;
  tokenCount: number;
}

export interface RetrievedChunk {
  chunkId: string;
  text: string;
  metadata: ChunkMetadata;
  score: number;
  source: 'dense' | 'sparse' | 'both';
}

function searchChunkToMetadata(c: SearchChunk): ChunkMetadata {
  return {
    documentId: c.documentId,
    filename: c.filename,
    sectionTitle: c.sectionTitle,
    pageNumber: c.pageNumber,
    chunkIndex: c.chunkIndex,
    tokenCount: c.tokenCount,
  };
}

function reciprocalRankFusion(
  denseResults: SearchChunk[],
  sparseResults: SearchChunk[],
  k = 60,
): RetrievedChunk[] {
  const scores = new Map<string, number>();
  const chunks = new Map<string, SearchChunk & { source: 'dense' | 'sparse' | 'both' }>();

  denseResults.forEach((chunk, rank) => {
    scores.set(chunk.chunkId, (scores.get(chunk.chunkId) ?? 0) + 1 / (k + rank + 1));
    chunks.set(chunk.chunkId, { ...chunk, source: 'dense' });
  });

  sparseResults.forEach((chunk, rank) => {
    scores.set(chunk.chunkId, (scores.get(chunk.chunkId) ?? 0) + 1 / (k + rank + 1));
    chunks.set(chunk.chunkId, {
      ...chunk,
      source: chunks.has(chunk.chunkId) ? 'both' : 'sparse',
    });
  });

  return [...scores.entries()]
    .sort(([, a], [, b]) => b - a)
    .map(([chunkId, score]) => {
      const c = chunks.get(chunkId)!;
      return {
        chunkId: c.chunkId,
        text: c.text,
        metadata: searchChunkToMetadata(c),
        score,
        source: c.source,
      };
    });
}

/**
 * Run hybrid search: embed query for dense branch, use key terms for sparse,
 * fuse with RRF, return top DEFAULT_TOP_K.
 */
export async function retrieveChunks(
  query: string,
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
  config: AppConfig,
): Promise<RetrievedChunk[]> {
  const { normalizedQuery, keyTerms } = processQuery(query);
  const limit = 20;
  const topK = config.DEFAULT_TOP_K;

  const [embedding] = await embeddingProvider.embed([normalizedQuery]);
  const [denseResults, sparseResults] = await Promise.all([
    vectorStore.searchByVector(embedding, limit),
    vectorStore.searchByText(keyTerms, limit),
  ]);

  const fused = reciprocalRankFusion(denseResults, sparseResults, 60);
  return fused.slice(0, topK);
}
