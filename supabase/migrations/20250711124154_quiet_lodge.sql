/*
  # Remove automatic role enforcement

  1. Changes
    - Removes the trigger that was automatically changing user roles based on email
    - Allows manual role assignment to be respected
    - Preserves existing user data
*/

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS assign_role_based_on_email_trigger ON public.users;

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS assign_role_based_on_email();

-- Create a new function that only sets roles for NEW users if not specified
CREATE OR REPLACE FUNCTION public.assign_role_based_on_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set default roles for NEW users when role is NULL or not specified
  -- This allows manual changes to be preserved
  IF NEW.role IS NULL THEN
    -- Set default roles based on email
    IF LOWER(NEW.email) = 'ankur@c2x.co.in' THEN
      NEW.role := 'super_admin';
      NEW.company_id := NULL; -- Super admins don't have a company
    ELSIF LOWER(NEW.email) = 'ashish8731@gmail.com' THEN
      NEW.role := 'admin';
    ELSE
      NEW.role := 'user';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a new trigger that only runs on INSERT (not UPDATE)
-- This allows manual updates to be preserved
CREATE TRIGGER assign_role_based_on_email_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_role_based_on_email();