CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  npi TEXT,
  tax_id TEXT,
  callback_number TEXT,
  auto_redial BOOLEAN NOT NULL DEFAULT false,
  call_recording BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own settings" ON settings;
CREATE POLICY "Users can view own settings" ON settings FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own settings" ON settings;
CREATE POLICY "Users can insert own settings" ON settings FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own settings" ON settings;
CREATE POLICY "Users can update own settings" ON settings FOR UPDATE USING (auth.uid() = id);

-- Clean up the profiles table to remove the accidentally added columns
ALTER TABLE profiles 
  DROP COLUMN IF EXISTS npi,
  DROP COLUMN IF EXISTS tax_id,
  DROP COLUMN IF EXISTS callback_number,
  DROP COLUMN IF EXISTS auto_redial,
  DROP COLUMN IF EXISTS call_recording;
