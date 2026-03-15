/**
 * OpenAI embedding provider. Uses the OpenAI API (e.g. text-embedding-3-small).
 * Batches requests to respect rate limits.
 */

import type { AppConfig } from '../../server-config';
import type { EmbeddingProvider } from '../embedding-provider';

const OPENAI_DIMENSION = 1536; // text-embedding-3-small
const BATCH_SIZE = 20;

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: AppConfig) {}

  async embed(texts: string[]): Promise<number[][]> {
    const apiKey = this.config.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai. Set it in .env.');
    }
    const baseUrl = this.config.OPENAI_API_BASE_URL;
    if (!baseUrl) {
      throw new Error('OPENAI_API_BASE_URL is required when EMBEDDING_PROVIDER=openai. Set it in .env');
    }
    const model = this.config.EMBEDDING_MODEL;
    const allVectors: number[][] = [];

    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      const batch = texts.slice(i, i + BATCH_SIZE);
      const res = await fetch(`${baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: batch,
        }),
      });

      if (!res.ok) {
        const err = (await res.text()) || res.statusText;
        throw new Error(`OpenAI embeddings failed: ${res.status} ${err}`);
      }

      const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
      if (!Array.isArray(data.data)) {
        throw new Error('OpenAI response missing data array');
      }
      for (const item of data.data) {
        allVectors.push(item.embedding);
      }
    }

    return allVectors;
  }

  dimension(): number {
    return OPENAI_DIMENSION;
  }
}
