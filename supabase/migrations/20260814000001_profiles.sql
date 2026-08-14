CREATE TYPE profile_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  organization TEXT,
  status profile_status NOT NULL DEFAULT 'pending',
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

-- 2. Admins can read all profiles
CREATE POLICY "Admins can read all profiles" 
  ON profiles FOR SELECT 
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- 3. Admins can update all profiles (for approving/rejecting)
CREATE POLICY "Admins can update all profiles" 
  ON profiles FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );


-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, organization, status, is_admin)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'organization',
    -- Automatically approve and make admin if it's the specified email
    CASE WHEN NEW.email = 'chaudhrybilal1977@gmail.com' THEN 'approved'::profile_status ELSE 'pending'::profile_status END,
    CASE WHEN NEW.email = 'chaudhrybilal1977@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Tighten Jobs RLS to ONLY allow approved users
DROP POLICY IF EXISTS "Users can insert their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can view their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can update their own jobs" ON jobs;
DROP POLICY IF EXISTS "Users can delete their own jobs" ON jobs;

CREATE POLICY "Approved users can insert their own jobs" 
  ON jobs FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Approved users can view their own jobs" 
  ON jobs FOR SELECT 
  USING (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Approved users can update their own jobs" 
  ON jobs FOR UPDATE 
  USING (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Approved users can delete their own jobs" 
  ON jobs FOR DELETE 
  USING (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'approved')
  );
