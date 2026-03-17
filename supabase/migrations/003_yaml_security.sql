-- Rate limiting table: one row per user, reset daily
CREATE TABLE IF NOT EXISTS generation_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 0,
  reset_date TIMESTAMPTZ NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_limits_user ON generation_limits(user_id);

-- Generation audit log
CREATE TABLE IF NOT EXISTS generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_generation_logs_user    ON generation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_generation_logs_created ON generation_logs(created_at DESC);

-- Add explanation column to existing yaml_configs if missing
ALTER TABLE yaml_configs ADD COLUMN IF NOT EXISTS explanation TEXT;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE generation_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs   ENABLE ROW LEVEL SECURITY;

-- Users can read their own rate limit info (client-side display)
CREATE POLICY "Users read own limits" ON generation_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Service role handles all writes to limits and logs (via server routes)
CREATE POLICY "Service full access limits" ON generation_limits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service full access logs" ON generation_logs
  FOR ALL USING (true) WITH CHECK (true);

-- ── Atomic increment function ───────────────────────────────────────────────
-- Called from the generate-yaml API after successful generation to avoid
-- double-count races. Returns the new count.
CREATE OR REPLACE FUNCTION increment_generation_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE generation_limits
  SET count = count + 1
  WHERE user_id = p_user_id
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$;

COMMENT ON TABLE generation_limits IS 'Per-user daily generation quota tracking';
COMMENT ON TABLE generation_logs IS 'Audit log for all YAML generation attempts';
