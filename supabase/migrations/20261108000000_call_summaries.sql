-- =============================================================
-- Call Summaries Table + RLS Policy
-- =============================================================

CREATE TABLE IF NOT EXISTS call_summaries (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'error')),
  verified BOOLEAN NOT NULL DEFAULT false,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE call_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own call_summaries" ON call_summaries;
CREATE POLICY "Users can manage own call_summaries" ON call_summaries FOR ALL
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = call_summaries.job_id AND jobs.user_id = auth.uid()));

