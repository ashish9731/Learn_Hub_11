/*
  # Add password change requirement functionality

  1. Schema Changes
    - Add `requires_password_change` column to users table
    - Set default to false for existing users
    - New users will have this set to true by default

  2. Security
    - Maintain existing RLS policies
    - Add function to handle password change requirement
*/

-- Add requires_password_change column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'requires_password_change'
  ) THEN
    ALTER TABLE users ADD COLUMN requires_password_change boolean DEFAULT false;
  END IF;
END $$;

-- Update existing users to not require password change (they're already set up)
UPDATE users SET requires_password_change = false WHERE requires_password_change IS NULL;

-- Create function to handle first-time login password change
CREATE OR REPLACE FUNCTION handle_password_change_requirement()
RETURNS trigger AS $$
BEGIN
  -- When a new user is created via admin, they should be required to change password
  IF TG_OP = 'INSERT' AND NEW.role = 'user' THEN
    NEW.requires_password_change = true;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS set_password_change_requirement ON users;
CREATE TRIGGER set_password_change_requirement
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_password_change_requirement();

-- Create function to mark password as changed
CREATE OR REPLACE FUNCTION mark_password_changed(user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE users 
  SET requires_password_change = false 
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION mark_password_changed(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION handle_password_change_requirement() TO authenticated;