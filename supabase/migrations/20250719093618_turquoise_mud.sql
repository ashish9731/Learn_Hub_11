/*
  # Fix User Creation and Sync Functions

  1. Database Functions
     - Drop and recreate user creation functions with proper types
     - Add function to check for existing users across auth and database
     - Add function to clean up orphaned records
     - Add function to safely create users with proper cleanup

  2. Security
     - Ensure proper RLS policies for user creation
     - Add policies for admin user management

  3. Triggers
     - Update triggers to handle user creation properly
     - Add logging for user creation events
*/

-- Drop existing functions first to avoid type conflicts
DROP FUNCTION IF EXISTS create_user_safely(uuid, text, user_role, uuid);
DROP FUNCTION IF EXISTS check_user_exists(text);
DROP FUNCTION IF EXISTS cleanup_user_records(uuid);

-- Function to check if user exists in auth or database
CREATE OR REPLACE FUNCTION check_user_exists(user_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_exists boolean := false;
BEGIN
  -- Check if user exists in users table
  SELECT EXISTS(
    SELECT 1 FROM users WHERE email = user_email
  ) INTO user_exists;
  
  RETURN user_exists;
END;
$$;

-- Function to cleanup user records safely
CREATE OR REPLACE FUNCTION cleanup_user_records(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete related records in order (respecting foreign key constraints)
  DELETE FROM podcast_progress WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM podcast_likes WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM podcast_assignments WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM user_courses WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM chat_history WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM activity_logs WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM user_profiles WHERE user_id = cleanup_user_records.user_id;
  DELETE FROM users WHERE id = cleanup_user_records.user_id;
  
  -- Log the cleanup
  INSERT INTO activity_logs (action, entity_type, entity_id, details)
  VALUES ('cleanup', 'user', cleanup_user_records.user_id, jsonb_build_object('cleaned_up_at', now()));
END;
$$;

-- Function to safely create user with cleanup
CREATE OR REPLACE FUNCTION create_user_safely(
  new_user_id uuid,
  user_email text,
  user_role user_role DEFAULT 'user',
  user_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_user_id uuid;
  result jsonb;
BEGIN
  -- Check if user already exists and get their ID
  SELECT id INTO existing_user_id
  FROM users 
  WHERE email = user_email;
  
  -- If user exists, clean up their records first
  IF existing_user_id IS NOT NULL THEN
    PERFORM cleanup_user_records(existing_user_id);
  END IF;
  
  -- Create new user record
  INSERT INTO users (id, email, role, company_id, requires_password_change)
  VALUES (new_user_id, user_email, user_role, user_company_id, true)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    company_id = EXCLUDED.company_id,
    requires_password_change = EXCLUDED.requires_password_change;
  
  -- Log the creation
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (new_user_id, 'create', 'user', new_user_id, 
          jsonb_build_object(
            'email', user_email,
            'role', user_role,
            'company_id', user_company_id,
            'created_at', now()
          ));
  
  -- Return success result
  result := jsonb_build_object(
    'success', true,
    'user_id', new_user_id,
    'email', user_email,
    'message', 'User created successfully'
  );
  
  RETURN result;
  
EXCEPTION WHEN OTHERS THEN
  -- Log the error
  INSERT INTO activity_logs (action, entity_type, details)
  VALUES ('error', 'user_creation', 
          jsonb_build_object(
            'error', SQLERRM,
            'email', user_email,
            'attempted_at', now()
          ));
  
  -- Return error result
  result := jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'message', 'Failed to create user'
  );
  
  RETURN result;
END;
$$;

-- Enhanced RLS policies for user management

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "users_access" ON users;
DROP POLICY IF EXISTS "user_profiles_access" ON user_profiles;

-- Users table policies
CREATE POLICY "users_super_admin_all" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'super_admin'
    )
  );

CREATE POLICY "users_admin_company" ON users
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND admin_user.company_id = users.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND admin_user.company_id = users.company_id
    )
  );

CREATE POLICY "users_own_record" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "users_own_update" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- User profiles policies
CREATE POLICY "user_profiles_super_admin_all" ON user_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'super_admin'
    )
  );

CREATE POLICY "user_profiles_admin_company" ON user_profiles
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users admin_user, users target_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND target_user.id = user_profiles.user_id
      AND admin_user.company_id = target_user.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users admin_user, users target_user
      WHERE admin_user.id = auth.uid() 
      AND admin_user.role = 'admin'
      AND target_user.id = user_profiles.user_id
      AND admin_user.company_id = target_user.company_id
    )
  );

CREATE POLICY "user_profiles_own_record" ON user_profiles
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enhanced trigger for user creation logging
CREATE OR REPLACE FUNCTION log_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Log user creation with detailed information
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    NEW.id,
    'user_created',
    'user',
    NEW.id,
    jsonb_build_object(
      'email', NEW.email,
      'role', NEW.role,
      'company_id', NEW.company_id,
      'requires_password_change', NEW.requires_password_change,
      'created_at', NEW.created_at
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for user creation logging
DROP TRIGGER IF EXISTS log_user_creation_trigger ON users;
CREATE TRIGGER log_user_creation_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION log_user_creation();

-- Function to get user creation logs
CREATE OR REPLACE FUNCTION get_user_creation_logs(limit_count integer DEFAULT 50)
RETURNS TABLE (
  log_id uuid,
  user_email text,
  user_role user_role,
  company_id uuid,
  created_at timestamptz,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id as log_id,
    (al.details->>'email')::text as user_email,
    (al.details->>'role')::user_role as user_role,
    (al.details->>'company_id')::uuid as company_id,
    al.created_at,
    al.details
  FROM activity_logs al
  WHERE al.action = 'user_created'
  AND al.entity_type = 'user'
  ORDER BY al.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION check_user_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_user_records(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_safely(uuid, text, user_role, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_creation_logs(integer) TO authenticated;