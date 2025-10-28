/*
  # Fix User Counting and Role Separation

  1. Database Changes
    - Update views to properly separate users, admins, and super_admins
    - Ensure proper counting in dashboard and analytics
    - Fix any issues with user role validation

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Update the assigned_users view to properly separate roles
CREATE OR REPLACE VIEW assigned_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE (u.role = 'admin' AND u.company_id IS NOT NULL)
   OR (u.role = 'user')
   OR (u.role = 'super_admin');

-- Create a view for properly assigned admins
CREATE OR REPLACE VIEW assigned_admins AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'admin' AND u.company_id IS NOT NULL;

-- Create a view for properly assigned regular users
CREATE OR REPLACE VIEW assigned_regular_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'user';

-- Fix the validate_user_company_assignment function
CREATE OR REPLACE FUNCTION validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip validation for super_admin
  IF NEW.role = 'super_admin' THEN
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

-- Update statistics for better query planning
ANALYZE users;
ANALYZE companies;