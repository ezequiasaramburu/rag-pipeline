/**
 * Ollama embedding provider. POSTs to the local Ollama server (e.g. nomic-embed-text).
 */

import type { AppConfig } from '../../server-config';
import type { EmbeddingProvider } from '../embedding-provider';

const OLLAMA_DIMENSION = 768; // nomic-embed-text

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  constructor(private readonly config: AppConfig) {}

  async embed(texts: string[]): Promise<number[][]> {
    const baseUrl = this.config.OLLAMA_URL;
    if (!baseUrl) {
      throw new Error('OLLAMA_URL is required when EMBEDDING_PROVIDER=ollama. Set it in .env (e.g. http://localhost:11434).');
    }
    const model = this.config.EMBEDDING_MODEL;
    const results: number[][] = [];

    for (const text of texts) {
      const res = await fetch(`${baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });

      if (!res.ok) {
        const err = (await res.text()) || res.statusText;
        throw new Error(`Ollama embeddings failed: ${res.status} ${err}`);
      }

      const data = (await res.json()) as { embedding?: number[] };
      if (!Array.isArray(data.embedding)) {
        throw new Error('Ollama response missing embedding array');
      }
      results.push(data.embedding);
    }

    return results;
  }

  dimension(): number {
    return OLLAMA_DIMENSION;
  }
}
