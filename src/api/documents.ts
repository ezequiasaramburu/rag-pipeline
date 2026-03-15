/**
 * Document upload and status routes. Upload writes file to disk and enqueues
 * ingestion; status polls the documents table.
 */

import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

import Fastify, { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';

import { getPool } from '../db';
import { loadConfig } from '../server-config';
import { enqueueIngestion } from '../ingestion/queue';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? 'uploads';

export async function registerDocumentsRoutes(app: FastifyInstance): Promise<void> {
  await app.register(multipart, { limits: { fileSize: 50 * 1024 * 1024 } }); // 50 MB

  app.post('/api/documents', async (request, reply) => {
    const config = loadConfig();
    const pool = getPool(config);

    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Missing file' });
    }

    const buffer = await data.toBuffer();
    const filename = data.filename ?? 'document';
    const mimeType = data.mimetype ?? 'application/octet-stream';

    await mkdir(UPLOAD_DIR, { recursive: true });
    const documentId = crypto.randomUUID();
    const ext = filename.includes('.') ? filename.slice(filename.lastIndexOf('.')) : '';
    const filePath = join(UPLOAD_DIR, `${documentId}${ext}`);

    await writeFile(filePath, buffer);

    await pool.query(
      `INSERT INTO documents (id, filename, mime_type, status) VALUES ($1, $2, $3, 'processing')`,
      [documentId, filename, mimeType],
    );

    await enqueueIngestion(
      { documentId, filePath, filename, mimeType },
      config,
    );

    return reply.status(202).send({ documentId });
  });

  app.get<{ Params: { id: string } }>('/api/documents/:id/status', async (request, reply) => {
    const pool = getPool(loadConfig());
    const { id } = request.params;

    const result = await pool.query(
      `SELECT id, status, error FROM documents WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({ error: 'Document not found' });
    }

    const row = result.rows[0];
    return reply.send({
      documentId: row.id,
      status: row.status,
      error: row.error ?? undefined,
    });
  });
}
