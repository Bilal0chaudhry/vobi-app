-- Fix for the "Database error saving new user" issue.
-- The auth.users trigger executes in a context where the `search_path` may not include `public`.
-- Because we cast to `::profile_status` (which is a custom enum in the public schema),
-- we must explicitly set the search_path on the function so Postgres can find the enum type.

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
    CASE WHEN NEW.email = 'chaudhrybilal1977@gmail.com' THEN 'approved'::public.profile_status ELSE 'pending'::public.profile_status END,
    CASE WHEN NEW.email = 'chaudhrybilal1977@gmail.com' THEN true ELSE false END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
