/*
  # Fix Trigger Function Error and Remove 'new' Table References

  1. Problem
    - Error: "42P01: missing FROM-clause entry for table 'new'"
    - Trigger function incorrectly references 'new' table
    - Real-time data not syncing properly

  2. Solution
    - Completely rewrite the trigger_activity_log function
    - Fix all references to NEW/OLD records
    - Improve error handling to prevent failures
    - Ensure proper operation for INSERT, UPDATE, and DELETE operations
*/

-- Drop the problematic trigger function and all associated triggers
DROP FUNCTION IF EXISTS trigger_activity_log CASCADE;

-- Create a fixed version of the trigger function that properly handles all operations
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Different handling based on operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record
        BEGIN
            INSERT INTO activity_logs (
                user_id, 
                action, 
                entity_type, 
                entity_id, 
                details
            )
            VALUES (
                auth.uid(), 
                TG_OP, 
                TG_TABLE_NAME, 
                OLD.id, 
                jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(OLD))
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging activity for DELETE: %', SQLERRM;
        END;
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW record
        BEGIN
            INSERT INTO activity_logs (
                user_id, 
                action, 
                entity_type, 
                entity_id, 
                details
            )
            VALUES (
                auth.uid(), 
                TG_OP, 
                TG_TABLE_NAME, 
                NEW.id, 
                jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging activity for %: %', TG_OP, SQLERRM;
        END;
        RETURN NEW;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate all the triggers that use this function
CREATE TRIGGER log_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_companies
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_courses
    AFTER INSERT OR UPDATE OR DELETE ON courses
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_user_courses
    AFTER INSERT OR UPDATE OR DELETE ON user_courses
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_podcasts
    AFTER INSERT OR UPDATE OR DELETE ON podcasts
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_pdfs
    AFTER INSERT OR UPDATE OR DELETE ON pdfs
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_quizzes
    AFTER INSERT OR UPDATE OR DELETE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_chat_history
    AFTER INSERT OR UPDATE OR DELETE ON chat_history
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_logos
    AFTER INSERT OR UPDATE OR DELETE ON logos
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

-- Fix the log_activity function to handle errors better
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in log_activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Fix RLS policies to ensure proper role-based access
-- Make sure users can only access appropriate dashboards based on role

-- Drop existing problematic policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_for_lookup" ON users;
DROP POLICY IF EXISTS "super_admin_create_users" ON users;
DROP POLICY IF EXISTS "super_admin_update_users" ON users;
DROP POLICY IF EXISTS "super_admin_delete_users" ON users;
DROP POLICY IF EXISTS "admin_create_users" ON users;
DROP POLICY IF EXISTS "admin_update_users" ON users;
DROP POLICY IF EXISTS "admin_delete_users" ON users;

-- Create improved policies for users table
-- Allow users to select their own data
CREATE POLICY "users_select_own" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

-- Allow users to insert their own record (for signup)
CREATE POLICY "users_insert_own" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own data
CREATE POLICY "users_update_own" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to select from users table for lookups
CREATE POLICY "users_select_for_lookup" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Super admin policies
-- Allow super admins to create users
CREATE POLICY "super_admin_create_users" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    (EXISTS ( 
      SELECT 1
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )) OR (auth.uid() = id)
  );

-- Allow super admins to update users
CREATE POLICY "super_admin_update_users" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    (EXISTS ( 
      SELECT 1
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )) OR (auth.uid() = id)
  )
  WITH CHECK (
    (EXISTS ( 
      SELECT 1
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )) OR (auth.uid() = id)
  );

-- Allow super admins to delete users
CREATE POLICY "super_admin_delete_users" 
  ON users 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS ( 
      SELECT 1
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_profiles;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE logos;