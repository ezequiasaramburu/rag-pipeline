/**
 * BullMQ queue for ingestion jobs. API enqueues here; worker consumes.
 */

import Redis from 'ioredis';
import { Queue } from 'bullmq';

import type { AppConfig } from '../server-config';
import type { IngestionJobPayload } from './job';
import { INGESTION_QUEUE_NAME } from './job';

function getConnection(config: AppConfig): Redis {
  return new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
}

let queue: Queue<IngestionJobPayload> | null = null;

export function getIngestionQueue(config: AppConfig): Queue<IngestionJobPayload> {
  if (!queue) {
    queue = new Queue<IngestionJobPayload>(INGESTION_QUEUE_NAME, {
      connection: getConnection(config),
    });
  }
  return queue;
}

export async function enqueueIngestion(payload: IngestionJobPayload, config: AppConfig): Promise<void> {
  const q = getIngestionQueue(config);
  await q.add('process', payload);
}
