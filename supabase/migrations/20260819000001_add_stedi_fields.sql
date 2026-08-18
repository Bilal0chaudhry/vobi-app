-- =============================================================
-- Migration to support required Stedi fields (DOB, Provider Org)
-- =============================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS dob TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS provider_org_name TEXT;
