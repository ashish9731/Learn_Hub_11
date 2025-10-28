/*
  # Fix User Role Assignment for Specific Emails

  1. Problem
    - Roles are not being permanently assigned to specific email addresses
    - Need to ensure ankur@c2x.co.in is always super_admin
    - Need to ensure ashish8731@gmail.com is always admin
    - Current role assignment is not consistent

  2. Solution
    - Create a trigger function to automatically assign roles based on email
    - Update existing users to have the correct roles
    - Ensure super_admin users don't have company_id
    - Ensure admin users have a company_id
*/

-- Create a function to assign roles based on email
CREATE OR REPLACE FUNCTION assign_role_based_on_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign role based on email (case insensitive)
  IF LOWER(NEW.email) = 'ankur@c2x.co.in' THEN
    NEW.role := 'super_admin';
    -- Super admins should not have company_id
    NEW.company_id := NULL;
  ELSIF LOWER(NEW.email) = 'ashish8731@gmail.com' THEN
    NEW.role := 'admin';
    -- If admin doesn't have a company, assign to the first available company
    IF NEW.company_id IS NULL THEN
      NEW.company_id := (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1);
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in assign_role_based_on_email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to assign roles based on email
DROP TRIGGER IF EXISTS assign_role_based_on_email_trigger ON users;
CREATE TRIGGER assign_role_based_on_email_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_role_based_on_email();

-- Update existing users to have the correct roles based on their emails
UPDATE users
SET role = 'super_admin', company_id = NULL
WHERE LOWER(email) = 'ankur@c2x.co.in';

UPDATE users
SET role = 'admin'
WHERE LOWER(email) = 'ashish8731@gmail.com';

-- If admin doesn't have a company, assign to the first available company
UPDATE users
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE LOWER(email) = 'ashish8731@gmail.com' 
  AND role = 'admin' 
  AND company_id IS NULL
  AND EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Update statistics for better query planning
ANALYZE users;