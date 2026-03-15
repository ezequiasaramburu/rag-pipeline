CREATE TABLE IF NOT EXISTS query_traces (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query               TEXT NOT NULL,
  tool_decision       TEXT NOT NULL,
  stages              JSONB NOT NULL,
  total_latency_ms    INTEGER,
  total_tokens        INTEGER,
  estimated_cost_usd  NUMERIC(10, 6),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eval_scores (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trace_id           UUID NOT NULL REFERENCES query_traces(id),
  faithfulness       NUMERIC(3,1),
  relevance          NUMERIC(3,1),
  context_precision  NUMERIC(4,3),
  evaluated_at       TIMESTAMPTZ DEFAULT NOW()
);

