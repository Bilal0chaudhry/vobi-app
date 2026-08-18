-- Add 'Portal Lookup' status for jobs currently being queried
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'Portal Lookup';
