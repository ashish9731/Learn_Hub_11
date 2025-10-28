/*
  # Fix Infinite Recursion in RLS Policies

  1. Problem
    - Infinite recursion detected in policy for relation "users"
    - Policies are creating circular dependencies
    - RLS policies are causing database errors

  2. Solution
    - Drop and recreate problematic policies
    - Use auth.uid() instead of uid() to avoid recursion
    - Check if policies exist before attempting to create them
    - Fix related policies that might have similar issues
*/

-- Drop existing problematic policies if they exist
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop users_insert_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_insert_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "users_insert_own" ON users;
    END IF;

    -- Check and drop users_select_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_select_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "users_select_own" ON users;
    END IF;

    -- Check and drop users_update_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_update_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "users_update_own" ON users;
    END IF;
END $$;

-- Create new policies using auth.uid() to avoid recursion
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if users_insert_own exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_insert_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "users_insert_own"
          ON users
          FOR INSERT
          TO authenticated
          WITH CHECK (auth.uid() = id);
    END IF;

    -- Check if users_select_own exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_select_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "users_select_own"
          ON users
          FOR SELECT
          TO authenticated
          USING (auth.uid() = id);
    END IF;

    -- Check if users_update_own exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_update_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "users_update_own"
          ON users
          FOR UPDATE
          TO authenticated
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Also fix any other policies that might have similar issues
-- Check user_profiles policies
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop user_profiles_own_access
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'user_profiles_own_access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "user_profiles_own_access" ON user_profiles;
    END IF;

    -- Create if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'user_profiles_own_access'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "user_profiles_own_access"
          ON user_profiles
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Check user_courses policies
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop user_courses_read_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_courses' 
        AND policyname = 'user_courses_read_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "user_courses_read_own" ON user_courses;
    END IF;

    -- Create if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_courses' 
        AND policyname = 'user_courses_read_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "user_courses_read_own"
          ON user_courses
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id);
    END IF;

    -- Check and drop user_courses_super_admin_access
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_courses' 
        AND policyname = 'user_courses_super_admin_access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "user_courses_super_admin_access" ON user_courses;
    END IF;

    -- Check if user_courses_manage_own exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_courses' 
        AND policyname = 'user_courses_manage_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "user_courses_manage_own"
          ON user_courses
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Check chat_history policies
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop chat_history_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chat_history' 
        AND policyname = 'chat_history_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "chat_history_own" ON chat_history;
    END IF;

    -- Create if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chat_history' 
        AND policyname = 'chat_history_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "chat_history_own"
          ON chat_history
          FOR ALL
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;

    -- Check and drop chat_history_super_admin_access
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'chat_history' 
        AND policyname = 'chat_history_super_admin_access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "chat_history_super_admin_access" ON chat_history;
    END IF;
END $$;

-- Check activity_logs policies
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop activity_logs_select_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_logs' 
        AND policyname = 'activity_logs_select_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "activity_logs_select_own" ON activity_logs;
    END IF;

    -- Create if it doesn't exist
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_logs' 
        AND policyname = 'activity_logs_select_own'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "activity_logs_select_own"
          ON activity_logs
          FOR SELECT
          TO authenticated
          USING (auth.uid() = user_id OR user_id IS NULL);
    END IF;

    -- Check and drop activity_logs_super_admin_access
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_logs' 
        AND policyname = 'activity_logs_super_admin_access'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "activity_logs_super_admin_access" ON activity_logs;
    END IF;

    -- Check if activity_logs_insert_authenticated exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'activity_logs' 
        AND policyname = 'activity_logs_insert_authenticated'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "activity_logs_insert_authenticated"
          ON activity_logs
          FOR INSERT
          TO authenticated
          WITH CHECK (true);
    END IF;
END $$;