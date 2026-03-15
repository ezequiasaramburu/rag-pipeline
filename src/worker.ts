import { Worker } from 'bullmq';

import { loadConfig } from './server-config';

const config = loadConfig();

// Placeholder worker; real jobs will be wired in later phases.
// This file exists in Phase 0 so the worker entrypoint and Redis connection are validated.

const connection = {
  url: config.REDIS_URL,
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const dummyWorker = new Worker('sage-dummy', async () => {}, { connection });

