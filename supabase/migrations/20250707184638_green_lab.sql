/*
  # Fix User Role Assignment Permanently

  1. Problem
    - User roles are not being properly assigned for specific email addresses
    - Email ashish8731@gmail.com should be admin but is showing as user
    - Need to ensure roles are permanent until manually changed

  2. Solution
    - Create a more robust function to assign roles based on email
    - Use LOWER() for case-insensitive email comparison
    - Force update existing users to have the correct roles
    - Add detailed logging for troubleshooting
*/

-- Create a function to assign roles based on email (case insensitive)
CREATE OR REPLACE FUNCTION assign_role_based_on_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the function execution for debugging
  RAISE NOTICE 'assign_role_based_on_email triggered for email: %', NEW.email;

  -- Assign role based on email (case insensitive)
  IF LOWER(NEW.email) = 'ankur@c2x.co.in' THEN
    RAISE NOTICE 'Setting role to super_admin for %', NEW.email;
    NEW.role := 'super_admin';
    -- Super admins should not have company_id
    NEW.company_id := NULL;
  ELSIF LOWER(NEW.email) = 'ashish8731@gmail.com' THEN
    RAISE NOTICE 'Setting role to admin for %', NEW.email;
    NEW.role := 'admin';
    -- If admin doesn't have a company, assign to the first available company
    IF NEW.company_id IS NULL THEN
      NEW.company_id := (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1);
      IF NEW.company_id IS NOT NULL THEN
        RAISE NOTICE 'Assigned company_id % to admin %', NEW.company_id, NEW.email;
      ELSE
        RAISE NOTICE 'No companies available to assign to admin %', NEW.email;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in assign_role_based_on_email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS assign_role_based_on_email_trigger ON users;

-- Create a trigger to assign roles based on email
CREATE TRIGGER assign_role_based_on_email_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION assign_role_based_on_email();

-- Force update existing users to have the correct roles based on their emails
UPDATE users
SET role = 'super_admin', company_id = NULL
WHERE LOWER(email) = 'ankur@c2x.co.in';

UPDATE users
SET role = 'admin'
WHERE LOWER(email) = 'ashish8731@gmail.com';

-- If admin doesn't have a company, assign to the first available company
DO $$
DECLARE
  first_company_id UUID;
BEGIN
  -- Get the first company ID
  SELECT id INTO first_company_id FROM companies ORDER BY created_at ASC LIMIT 1;
  
  IF first_company_id IS NOT NULL THEN
    -- Update the admin user with the company ID
    UPDATE users
    SET company_id = first_company_id
    WHERE LOWER(email) = 'ashish8731@gmail.com' 
      AND role = 'admin' 
      AND company_id IS NULL;
      
    RAISE NOTICE 'Updated company_id for ashish8731@gmail.com to %', first_company_id;
  ELSE
    RAISE NOTICE 'No companies available to assign to admin ashish8731@gmail.com';
  END IF;
END $$;

-- Update statistics for better query planning
ANALYZE users;