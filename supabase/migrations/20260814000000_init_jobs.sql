CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_first_name TEXT NOT NULL,
  patient_last_name TEXT NOT NULL,
  insurance TEXT NOT NULL,
  member_id TEXT NOT NULL,
  npi TEXT NOT NULL,
  cpt_codes TEXT[] NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  availity_result JSONB,
  call_logs JSONB DEFAULT '[]'::jsonb,
  checklist JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) to ensure users can only access their own jobs
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users to manage their own jobs
CREATE POLICY "Users can insert their own jobs" 
  ON jobs FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own jobs" 
  ON jobs FOR SELECT 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" 
  ON jobs FOR UPDATE 
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs" 
  ON jobs FOR DELETE 
  TO authenticated
  USING (auth.uid() = user_id);
