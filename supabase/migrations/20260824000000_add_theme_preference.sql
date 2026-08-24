-- Add theme_preference column
ALTER TABLE profiles
  ADD COLUMN theme_preference TEXT
  CHECK (theme_preference IN ('light', 'dark', 'system'))
  DEFAULT 'system';

-- Create a SECURITY DEFINER function so users can update their own theme safely 
-- without us granting them direct UPDATE access on the profiles table (which could
-- let them change their is_admin flag maliciously).
CREATE OR REPLACE FUNCTION update_user_theme(new_theme text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF new_theme NOT IN ('light', 'dark', 'system') THEN
    RAISE EXCEPTION 'Invalid theme preference: %', new_theme;
  END IF;

  UPDATE profiles
  SET theme_preference = new_theme
  WHERE id = auth.uid();
END;
$$;

-- Grant EXECUTE explicitly to authenticated users (and explicitly revoke from public if desired, but default is public)
REVOKE EXECUTE ON FUNCTION update_user_theme(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_user_theme(text) TO authenticated;
