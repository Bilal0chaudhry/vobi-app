-- Add missing search_path to the existing admin_delete_user function
ALTER FUNCTION admin_delete_user(uuid) SET search_path = public;
