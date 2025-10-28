/*
  # Fix user roles and ensure specific emails have correct roles

  1. New Functions
    - `ensure_specific_user_roles` - Ensures specific emails always have the correct roles
    
  2. Triggers
    - Add trigger to enforce specific user roles on INSERT and UPDATE
    
  3. Data Fixes
    - Update existing users with specific emails to have correct roles
*/

-- Create or replace the function to ensure specific user roles
CREATE OR REPLACE FUNCTION ensure_specific_user_roles()
RETURNS TRIGGER AS $$
DECLARE
  email_lower TEXT;
BEGIN
  -- Convert email to lowercase for case-insensitive comparison
  email_lower := LOWER(NEW.email);
  
  -- Check for specific emails and assign appropriate roles
  IF email_lower = 'ankur@c2x.co.in' THEN
    NEW.role := 'super_admin'::user_role;
    NEW.company_id := NULL; -- Super admins should not have company_id
    RAISE NOTICE 'Setting user % to super_admin role with no company', NEW.email;
  ELSIF email_lower = 'ashish8731@gmail.com' THEN
    NEW.role := 'admin'::user_role;
    -- If admin doesn't have a company, try to assign one
    IF NEW.company_id IS NULL THEN
      -- Find the first available company
      DECLARE
        first_company_id UUID;
      BEGIN
        SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
        IF first_company_id IS NOT NULL THEN
          NEW.company_id := first_company_id;
          RAISE NOTICE 'Assigning company % to admin %', first_company_id, NEW.email;
        END IF;
      END;
    END IF;
    RAISE NOTICE 'Setting user % to admin role with company %', NEW.email, NEW.company_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'ensure_specific_user_roles_trigger'
  ) THEN
    CREATE TRIGGER ensure_specific_user_roles_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_specific_user_roles();
    
    RAISE NOTICE 'Created ensure_specific_user_roles_trigger';
  END IF;
END $$;

-- Update existing users to ensure they have the correct roles
UPDATE users SET role = 'super_admin', company_id = NULL WHERE LOWER(email) = 'ankur@c2x.co.in';
UPDATE users SET role = 'admin' WHERE LOWER(email) = 'ashish8731@gmail.com';

-- If ashish8731@gmail.com doesn't have a company, assign one
DO $$
DECLARE
  admin_id UUID;
  admin_company_id UUID;
  first_company_id UUID;
BEGIN
  -- Get the admin user
  SELECT id, company_id INTO admin_id, admin_company_id 
  FROM users 
  WHERE LOWER(email) = 'ashish8731@gmail.com' 
  LIMIT 1;
  
  -- If admin exists and doesn't have a company
  IF admin_id IS NOT NULL AND admin_company_id IS NULL THEN
    -- Find the first company
    SELECT id INTO first_company_id FROM companies ORDER BY created_at LIMIT 1;
    
    -- If a company exists, assign it to the admin
    IF first_company_id IS NOT NULL THEN
      UPDATE users SET company_id = first_company_id WHERE id = admin_id;
      RAISE NOTICE 'Assigned company % to admin ashish8731@gmail.com', first_company_id;
    END IF;
  END IF;
END $$;