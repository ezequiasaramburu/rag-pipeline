/**
 * Embeds chunks via EmbeddingProvider and upserts them into the VectorStore.
 * Batches requests (max 20) to avoid rate limits.
 */

import type { DocumentChunk } from './chunker';
import type { EmbeddingProvider } from './embedding-provider';
import type { ChunkRow, VectorStore } from '../vector/types';

const BATCH_SIZE = 20;

export async function embedAndStore(
  documentId: string,
  chunks: DocumentChunk[],
  embeddingProvider: EmbeddingProvider,
  vectorStore: VectorStore,
): Promise<void> {
  if (chunks.length === 0) return;

  const rows: ChunkRow[] = [];

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const embeddings = await embeddingProvider.embed(texts);

    for (let j = 0; j < batch.length; j++) {
      rows.push({
        chunkIndex: i + j,
        text: batch[j].text,
        sectionTitle: batch[j].sectionTitle,
        pageNumber: batch[j].pageNumber,
        tokenCount: batch[j].tokenCount,
        embedding: embeddings[j],
      });
    }
  }

  await vectorStore.upsertChunks(documentId, rows);
}
