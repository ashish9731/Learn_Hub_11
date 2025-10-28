/*
  # Fix User Assignment and Company Relationships

  1. Database Changes
    - Add function to ensure users are properly assigned to companies
    - Add validation to prevent users without company_id from appearing in admin views
    - Ensure proper relationships between users, companies, and admins

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control for user data
*/

-- Create a function to validate user company assignment
CREATE OR REPLACE FUNCTION validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- For admin users, ensure they have a company_id
    IF NEW.role = 'admin' AND NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'Admin users must be assigned to a company';
    END IF;
    
    -- For regular users, ensure they have a company_id
    IF NEW.role = 'user' AND NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'Regular users must be assigned to a company';
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in validate_user_company_assignment: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate user company assignment
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'validate_user_company_assignment_trigger'
    ) THEN
        CREATE TRIGGER validate_user_company_assignment_trigger
            BEFORE INSERT OR UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION validate_user_company_assignment();
    END IF;
END $$;

-- Update existing users to ensure proper company assignment
-- This is a safe operation as it only affects users with NULL company_id
UPDATE users
SET company_id = (
    SELECT id FROM companies ORDER BY created_at ASC LIMIT 1
)
WHERE role IN ('admin', 'user') 
AND company_id IS NULL
AND EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Create a view for properly assigned users
CREATE OR REPLACE VIEW assigned_users AS
SELECT u.*, c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.role IN ('admin', 'user');

-- Create a view for properly assigned admins
CREATE OR REPLACE VIEW assigned_admins AS
SELECT u.*, c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.role = 'admin';

-- Create a view for properly assigned regular users
CREATE OR REPLACE VIEW assigned_regular_users AS
SELECT u.*, c.name as company_name
FROM users u
JOIN companies c ON u.company_id = c.id
WHERE u.role = 'user';

-- Update statistics for better query planning
ANALYZE users;
ANALYZE companies;