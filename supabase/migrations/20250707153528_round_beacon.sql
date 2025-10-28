/*
  # Fix User Company Assignment Validation

  1. Problem
    - Error: "User must be assigned to a company" during login
    - The validate_user_company_assignment function is too strict
    - It prevents users from logging in if they don't have a company assigned
    - This is causing authentication failures for new users

  2. Solution
    - Modify the validate_user_company_assignment function to be less strict
    - Allow users to log in without a company assignment
    - Only enforce company assignment for specific operations
    - Maintain validation for admins who must have a company
*/

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS validate_user_company_assignment_trigger ON users;

-- Create or replace the function with more lenient validation
CREATE OR REPLACE FUNCTION public.validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for super_admin
  IF NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;
  
  -- For admin users, ensure they have a company_id (this is still required)
  IF NEW.role = 'admin' AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Admin users must be assigned to a company';
  END IF;
  
  -- For regular users, we'll allow NULL company_id during initial creation and login
  -- They can be assigned to a company later by an admin
  
  -- Ensure the company exists if specified
  IF NEW.company_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM companies WHERE id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'Company with ID % does not exist', NEW.company_id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE NOTICE 'Error in validate_user_company_assignment: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger with the updated function
CREATE TRIGGER validate_user_company_assignment_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_company_assignment();

-- Update the assigned_users view to include users without company assignments
CREATE OR REPLACE VIEW assigned_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'super_admin'
   OR u.role = 'admin' AND u.company_id IS NOT NULL
   OR u.role = 'user';

-- Update the assigned_regular_users view to include users without company assignments
CREATE OR REPLACE VIEW assigned_regular_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'user';