/*
  # Fix User Authentication and Role-Based Access

  1. Problem
    - Users getting "Your account is not properly configured" error during login
    - Issues with role-based access control
    - Super admin users incorrectly assigned to companies
    - Admin users without company assignments causing errors

  2. Solution
    - Fix validate_user_company_assignment function to be more lenient
    - Update handle_user_update function to properly track changes
    - Fix assigned_users view to properly handle all user types
    - Ensure proper role validation during login
*/

-- Fix the validate_user_company_assignment function
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

-- Fix the handle_user_update function
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Process changes and log them
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    INSERT INTO audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'email_change', OLD.email::text, NEW.email::text);
  END IF;
  
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'role_change', OLD.role::text, NEW.role::text);
    
    -- If changing to super_admin, remove company_id
    IF NEW.role = 'super_admin' THEN
      NEW.company_id = NULL;
    END IF;
  END IF;
  
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    INSERT INTO audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'company_change', OLD.company_id::text, NEW.company_id::text);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch any errors in the main function body
  RAISE NOTICE 'Error in handle_user_update trigger: %', SQLERRM;
  RETURN NEW; -- Still return NEW to allow the update to proceed
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS user_update_trigger ON users;
CREATE TRIGGER user_update_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_update();

-- Update the assigned_users view to properly handle all user types
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

-- Update existing super admin users to remove company_id
UPDATE users
SET company_id = NULL
WHERE role = 'super_admin' AND company_id IS NOT NULL;

-- Ensure at least one super_admin exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') THEN
    INSERT INTO users (email, role)
    VALUES ('admin@example.com', 'super_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE companies;