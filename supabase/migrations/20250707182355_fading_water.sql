/*
  # Fix User Role Assignment Based on Email

  1. Database Changes
    - Create a function to automatically assign roles based on email
    - Create a trigger to apply this function when users are created or updated
    - Update existing users to have the correct roles based on their emails

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Create a function to assign roles based on email
CREATE OR REPLACE FUNCTION assign_role_based_on_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign role based on email
  IF NEW.email = 'ankur@c2x.co.in' THEN
    NEW.role := 'super_admin';
    -- Super admins should not have company_id
    NEW.company_id := NULL;
  ELSIF NEW.email = 'ashish8731@gmail.com' THEN
    NEW.role := 'admin';
    -- If admin doesn't have a company, assign to the first available company
    IF NEW.company_id IS NULL THEN
      NEW.company_id := (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1);
    END IF;
  ELSE
    -- Default role is user
    NEW.role := 'user';
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in assign_role_based_on_email: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to assign roles based on email
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_trigger 
    WHERE tgname = 'assign_role_based_on_email_trigger'
  ) THEN
    CREATE TRIGGER assign_role_based_on_email_trigger
      BEFORE INSERT OR UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION assign_role_based_on_email();
  END IF;
END $$;

-- Update existing users to have the correct roles based on their emails
UPDATE users
SET role = 'super_admin', company_id = NULL
WHERE email = 'ankur@c2x.co.in';

UPDATE users
SET role = 'admin'
WHERE email = 'ashish8731@gmail.com';

-- If admin doesn't have a company, assign to the first available company
UPDATE users
SET company_id = (SELECT id FROM companies ORDER BY created_at ASC LIMIT 1)
WHERE email = 'ashish8731@gmail.com' 
  AND role = 'admin' 
  AND company_id IS NULL
  AND EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Update statistics for better query planning
ANALYZE users;