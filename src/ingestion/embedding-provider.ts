/**
 * EmbeddingProvider interface and factory. All embedding calls go through this
 * abstraction; swap Ollama (local) vs OpenAI (cloud) via config.
 */

import type { AppConfig } from '../server-config';

import { OllamaEmbeddingProvider } from './providers/ollama-embedder';
import { OpenAIEmbeddingProvider } from './providers/openai-embedder';

/** Contract for embedding text into vectors. Implementations are behind env (Ollama / OpenAI). */
export interface EmbeddingProvider {
  /** Embed a batch of texts. Returns one vector per text, same order. */
  embed(texts: string[]): Promise<number[][]>;

  /** Vector dimension (e.g. 768 for nomic-embed-text, 1536 for OpenAI). */
  dimension(): number;
}

/**
 * Builds the configured EmbeddingProvider from env. Fails if provider or required vars are missing.
 */
export function createEmbeddingProvider(config: AppConfig): EmbeddingProvider {
  switch (config.EMBEDDING_PROVIDER) {
    case 'ollama':
      return new OllamaEmbeddingProvider(config);
    case 'openai':
      return new OpenAIEmbeddingProvider(config);
    default: {
      const _: never = config.EMBEDDING_PROVIDER;
      throw new Error(`Unknown EMBEDDING_PROVIDER: ${config.EMBEDDING_PROVIDER}`);
    }
  }
}
