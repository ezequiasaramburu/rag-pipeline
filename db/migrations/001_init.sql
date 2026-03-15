CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename    TEXT NOT NULL,
  mime_type   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'processing',
  error       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

