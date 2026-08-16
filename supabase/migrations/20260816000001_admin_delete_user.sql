-- Migration to allow admins to securely delete accounts

CREATE OR REPLACE FUNCTION admin_delete_user(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the caller is an admin
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    -- Delete the user from auth.users (cascades to profiles, settings, jobs)
    DELETE FROM auth.users WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to delete users';
  END IF;
END;
$$;
