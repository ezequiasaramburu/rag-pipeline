import Redis from 'ioredis';
import { Worker } from 'bullmq';

import { runIngestionJob } from './ingestion/job';
import { INGESTION_QUEUE_NAME } from './ingestion/job';
import type { IngestionJobPayload } from './ingestion/job';
import { loadConfig } from './server-config';

const config = loadConfig();

const connection = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });

const worker = new Worker<IngestionJobPayload>(
  INGESTION_QUEUE_NAME,
  async (job) => {
    await runIngestionJob(job.data);
  },
  { connection },
);

worker.on('failed', (job, err) => {
  // eslint-disable-next-line no-console
  console.error('Ingestion job failed', job?.id, err);
});

