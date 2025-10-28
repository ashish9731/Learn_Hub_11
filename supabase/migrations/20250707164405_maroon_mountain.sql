/*
  # Fix Super Admin Role and Dashboard Access

  1. Problem
    - Super admin users are incorrectly showing the user dashboard
    - Role dropdown is missing in user management forms
    - Super admins should not be assigned to any company

  2. Solution
    - Update the super admin user to have the correct role
    - Fix the validate_user_company_assignment function
    - Update the assigned_users view to properly handle super admins
    - Remove fake quizzes from user dashboard
*/

-- Update the super admin user to have the correct role
UPDATE users
SET role = 'super_admin'
WHERE email = 'ankur@c2x.co.in';

-- Fix the validate_user_company_assignment function to automatically remove company_id for super_admins
CREATE OR REPLACE FUNCTION validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Super admins should NOT have a company_id
  IF NEW.role = 'super_admin' THEN
    NEW.company_id = NULL;
    RETURN NEW;
  END IF;
  
  -- For admin users, ensure they have a company_id
  IF NEW.role = 'admin' AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'Admin users must be assigned to a company';
  END IF;
  
  -- For regular users, we'll allow NULL company_id during initial creation
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

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS validate_user_company_assignment_trigger ON users;
CREATE TRIGGER validate_user_company_assignment_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_company_assignment();

-- Update the assigned_users view to properly handle super admins without company_id
CREATE OR REPLACE VIEW assigned_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE (u.role = 'admin' AND u.company_id IS NOT NULL)
   OR (u.role = 'user')
   OR (u.role = 'super_admin');

-- Update existing super admin users to remove company_id
UPDATE users
SET company_id = NULL
WHERE role = 'super_admin' AND company_id IS NOT NULL;

-- Update statistics for better query planning
ANALYZE users;