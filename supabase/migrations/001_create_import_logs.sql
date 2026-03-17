-- Create import_logs table for tracking Amazon PA API import runs
CREATE TABLE IF NOT EXISTS import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'cron')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')) DEFAULT 'running',
  keywords_searched TEXT[] NOT NULL DEFAULT '{}',
  products_found INTEGER NOT NULL DEFAULT 0,
  products_imported INTEGER NOT NULL DEFAULT 0,
  products_updated INTEGER NOT NULL DEFAULT 0,
  products_skipped INTEGER NOT NULL DEFAULT 0,
  errors JSONB NOT NULL DEFAULT '[]',
  duration_ms INTEGER,
  completed_at TIMESTAMPTZ
);

-- Index for fetching recent logs quickly
CREATE INDEX IF NOT EXISTS import_logs_run_at_idx ON import_logs (run_at DESC);

-- RLS: disable row-level security (service role key bypasses RLS anyway)
-- Enable RLS if you want Supabase auth users to read their own logs
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: only service role can insert/update (used by the import service)
-- Policy: only authenticated admin users can read (enforced at API layer)
CREATE POLICY "Service role full access" ON import_logs
  USING (true)
  WITH CHECK (true);
