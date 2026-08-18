-- Add source column to explicitly track whether a job was 'call' or 'portal'
ALTER TABLE jobs ADD COLUMN source TEXT NOT NULL DEFAULT 'call';
