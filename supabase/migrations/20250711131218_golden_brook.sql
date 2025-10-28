/*
  # Remove all role enforcement triggers

  1. Changes
    - Drop all triggers that automatically change user roles
    - Drop all trigger functions that enforce specific roles
    - This ensures roles can ONLY be changed manually in the database
*/

-- Drop all role-related triggers
DROP TRIGGER IF EXISTS assign_role_based_on_email_trigger ON public.users;
DROP TRIGGER IF EXISTS ensure_specific_user_roles_trigger ON public.users;
DROP TRIGGER IF EXISTS validate_user_company_assignment_trigger ON public.users;

-- Drop all role-related trigger functions
DROP FUNCTION IF EXISTS public.assign_role_based_on_email();
DROP FUNCTION IF EXISTS public.ensure_specific_user_roles();
DROP FUNCTION IF EXISTS public.validate_user_company_assignment();

-- Create a simple function to set default role only for NEW users with no role specified
CREATE OR REPLACE FUNCTION public.set_default_role_if_empty()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set role if it's NULL or empty
  IF NEW.role IS NULL THEN
    NEW.role = 'user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger that ONLY sets default role for new users if no role is specified
CREATE TRIGGER set_default_role_trigger
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.set_default_role_if_empty();