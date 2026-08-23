-- Phase 4 Option B: SECURITY DEFINER functions for approving/rejecting users

CREATE OR REPLACE FUNCTION admin_approve_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    -- Only update the status column
    UPDATE profiles SET status = 'approved' WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to approve users';
  END IF;
END;
$$;


CREATE OR REPLACE FUNCTION admin_reject_user(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is an admin
  IF EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    -- Only update the status column
    UPDATE profiles SET status = 'rejected' WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to reject users';
  END IF;
END;
$$;

-- Restrict execution to authenticated users only
REVOKE EXECUTE ON FUNCTION admin_approve_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_approve_user(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION admin_reject_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reject_user(uuid) TO authenticated;
