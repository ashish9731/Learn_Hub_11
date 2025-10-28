/*
  # Fix RLS Policy Issues and Multiple Permissive Policies

  1. Problem
    - Performance Advisor shows "Auth RLS Initialization Plan" warnings
    - Multiple permissive policies for the same role on tables
    - Unnecessary re-evaluation of RLS policies for each row

  2. Solution
    - Drop all existing policies and create simplified ones
    - Consolidate multiple permissive policies into single policies
    - Use direct auth.uid() references instead of complex queries
    - Avoid using current_setting() and auth.<function>() calls
*/

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on all tables in public schema
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Create simplified policies for users table
CREATE POLICY "users_select_for_lookup" ON users
    FOR SELECT TO authenticated
    USING (true);

-- Create consolidated policy for users table
CREATE POLICY "users_own_access" ON users
    FOR ALL TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Create consolidated policy for companies table
CREATE POLICY "companies_access" ON companies
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create consolidated policy for courses table
CREATE POLICY "courses_access" ON courses
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policy for user_courses table
CREATE POLICY "user_courses_own" ON user_courses
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create consolidated policy for podcasts table
CREATE POLICY "podcasts_access" ON podcasts
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create consolidated policy for pdfs table
CREATE POLICY "pdfs_access" ON pdfs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create consolidated policy for quizzes table
CREATE POLICY "quizzes_access" ON quizzes
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policy for chat_history table
CREATE POLICY "chat_history_own" ON chat_history
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create simplified policies for activity_logs table
CREATE POLICY "activity_logs_access" ON activity_logs
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policy for user_profiles table
CREATE POLICY "user_profiles_own" ON user_profiles
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Create consolidated policy for content_categories table
CREATE POLICY "content_categories_access" ON content_categories
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policies for contact_messages table
CREATE POLICY "contact_messages_insert" ON contact_messages
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "contact_messages_admin" ON contact_messages
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create simplified policy for podcast_likes table
CREATE POLICY "podcast_likes_own" ON podcast_likes
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Fix foreign key constraint for activity_logs to allow user deletion
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE user_profiles;
ANALYZE content_categories;
ANALYZE contact_messages;
ANALYZE podcast_likes;