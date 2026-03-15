import Fastify from 'fastify';

import { registerDocumentsRoutes } from './api/documents';
import { loadConfig } from './server-config';

export async function buildServer() {
  const config = loadConfig();

  const app = Fastify({
    logger: true,
  });

  app.get('/health', async () => {
    return {
      status: 'ok',
      env: {
        vectorStore: config.VECTOR_STORE,
        embeddingProvider: config.EMBEDDING_PROVIDER,
        llmProvider: config.LLM_PROVIDER,
      },
    };
  });

  await registerDocumentsRoutes(app);

  return app;
}

async function main(): Promise<void> {
  const app = await buildServer();
  const port = Number(process.env.PORT) || 3000;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`Server listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void main();
