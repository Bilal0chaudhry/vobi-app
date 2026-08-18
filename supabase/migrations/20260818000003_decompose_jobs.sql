-- =============================================================
-- Database Normalization — BCNF Decomposition of jobs table
-- =============================================================

-- 1. Create child tables
CREATE TABLE IF NOT EXISTS call_data (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  call_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
  checklist JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS portal_data (
  job_id UUID PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
  availity_result JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 2. Migrate existing data
INSERT INTO call_data (job_id, call_logs, checklist)
SELECT id, COALESCE(call_logs, '[]'::jsonb), COALESCE(checklist, '{}'::jsonb)
FROM jobs WHERE source = 'call'
ON CONFLICT (job_id) DO NOTHING;

INSERT INTO portal_data (job_id, availity_result)
SELECT id, COALESCE(availity_result, '{}'::jsonb)
FROM jobs WHERE source = 'portal' AND availity_result IS NOT NULL
ON CONFLICT (job_id) DO NOTHING;

-- 3. Enable RLS on child tables
ALTER TABLE call_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_data ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies that check ownership via the parent jobs table
DROP POLICY IF EXISTS "Users can manage own call_data" ON call_data;
CREATE POLICY "Users can manage own call_data" ON call_data FOR ALL
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = call_data.job_id AND jobs.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage own portal_data" ON portal_data;
CREATE POLICY "Users can manage own portal_data" ON portal_data FOR ALL
  USING (EXISTS (SELECT 1 FROM jobs WHERE jobs.id = portal_data.job_id AND jobs.user_id = auth.uid()));

-- 5. Drop the old columns from jobs
ALTER TABLE jobs DROP COLUMN IF EXISTS call_logs;
ALTER TABLE jobs DROP COLUMN IF EXISTS checklist;
ALTER TABLE jobs DROP COLUMN IF EXISTS availity_result;
