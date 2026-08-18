-- =============================================================
-- Database Normalization & Performance Migration
-- =============================================================

-- 1. INDEXES — Fix the biggest performance bottleneck
-- ---------------------------------------------------------

-- Critical: speeds up every RLS check and every user-scoped query
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Composite index for the most common query pattern (user's jobs sorted by date)
CREATE INDEX IF NOT EXISTS idx_jobs_user_created ON jobs(user_id, created_at DESC);

-- Speeds up the "is user approved?" subquery in RLS policies
CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles(status);


-- 2. ENUM for jobs.source — prevent invalid values
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_source') THEN
    CREATE TYPE job_source AS ENUM ('call', 'portal');
  END IF;
END
$$;

ALTER TABLE jobs ALTER COLUMN source TYPE job_source USING source::job_source;


-- 3. ENUM for jobs.status — prevent invalid values
-- ---------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'job_status') THEN
    CREATE TYPE job_status AS ENUM (
      'Pending',
      'Agent on Call',
      'On Hold',
      'Completed',
      'Portal Lookup',
      'Verified (Portal)',
      'API Fast-Path'
    );
  END IF;
END
$$;

ALTER TABLE jobs ALTER COLUMN status TYPE job_status USING status::job_status;
