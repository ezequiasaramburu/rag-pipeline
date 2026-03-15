import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 3000))
    .refine((val) => typeof val === 'number' && Number.isInteger(val) && val > 0, 'Invalid PORT'),

  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),

  VECTOR_STORE: z.enum(['pgvector', 'qdrant']),
  QDRANT_URL: z.string().url().optional(),
  QDRANT_API_KEY: z.string().optional(),

  EMBEDDING_PROVIDER: z.enum(['ollama', 'openai']),
  EMBEDDING_MODEL: z.string().min(1),
  OLLAMA_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),

  LLM_PROVIDER: z.enum(['ollama', 'claude', 'openai', 'gemini']),
  LLM_MODEL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),

  DEFAULT_TOP_K: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 20)),
  RERANKED_TOP_K: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 5)),
  MAX_CHUNK_TOKENS: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : 512)),
  ENABLE_HYDE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  EVAL_ENABLED: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  EVAL_LLM_PROVIDER: z.enum(['ollama', 'claude', 'openai', 'gemini']),
  EVAL_LLM_MODEL: z.string().min(1),
});

export type AppConfig = z.infer<typeof envSchema>;

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Fail loudly on configuration errors
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  cachedConfig = parsed.data;
  return parsed.data;
}

