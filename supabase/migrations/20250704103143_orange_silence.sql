-- Check for existing policies and only create them if they don't exist
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Drop existing problematic policies
    DROP POLICY IF EXISTS "users_insert_own" ON users;
    DROP POLICY IF EXISTS "users_select_own" ON users;
    DROP POLICY IF EXISTS "users_update_own" ON users;

    -- Create new policies using auth.uid() to avoid recursion
    CREATE POLICY "users_insert_own"
      ON users
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);

    CREATE POLICY "users_select_own"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);

    CREATE POLICY "users_update_own"
      ON users
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = id)
      WITH CHECK (auth.uid() = id);

    -- Also fix any other policies that might have similar issues
    -- Check user_profiles policies
    DROP POLICY IF EXISTS "user_profiles_own_access" ON user_profiles;

    CREATE POLICY "user_profiles_own_access"
      ON user_profiles
      FOR ALL
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);

    -- Check user_courses policies
    DROP POLICY IF EXISTS "user_courses_read_own" ON user_courses;
    DROP POLICY IF EXISTS "user_courses_super_admin_access" ON user_courses;

    -- Check if policy exists before creating
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

    -- Check if policy exists before creating
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

    -- Check chat_history policies
    DROP POLICY IF EXISTS "chat_history_own" ON chat_history;
    DROP POLICY IF EXISTS "chat_history_super_admin_access" ON chat_history;

    -- Check if policy exists before creating
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

    -- Check activity_logs policies
    DROP POLICY IF EXISTS "activity_logs_select_own" ON activity_logs;
    DROP POLICY IF EXISTS "activity_logs_super_admin_access" ON activity_logs;

    -- Check if policy exists before creating
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

    -- Check if policy exists before creating
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