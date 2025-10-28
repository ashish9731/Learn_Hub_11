/*
  # Fix All Permissions and Role-Based Access

  1. Database Functions
    - Drop and recreate all user-related functions with correct signatures
    - Add proper security and error handling
    - Fix parameter naming issues

  2. RLS Policies
    - Drop all existing problematic policies
    - Create simple, non-recursive policies
    - Fix permission denied errors for all tables

  3. Security
    - Ensure users can access their own data
    - Allow admins to manage users in their company
    - Allow super admins to access everything
    - Fix user_profiles and user_courses access
*/

-- Drop all existing problematic functions
DROP FUNCTION IF EXISTS get_user_metrics(uuid);
DROP FUNCTION IF EXISTS get_user_metrics(p_user_id uuid);
DROP FUNCTION IF EXISTS get_user_metrics(target_user_id uuid);
DROP FUNCTION IF EXISTS list_all_user_metrics();
DROP FUNCTION IF EXISTS get_current_user_metrics();
DROP FUNCTION IF EXISTS get_all_podcast_progress();

-- Drop all existing RLS policies that might cause recursion
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_super_admin_all" ON users;
DROP POLICY IF EXISTS "users_admin_manage" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_admin" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

-- Drop existing user_profiles policies
DROP POLICY IF EXISTS "user_profiles_own_record" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_admin_company" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_super_admin_all" ON user_profiles;

-- Drop existing user_courses policies
DROP POLICY IF EXISTS "user_courses_user_select" ON user_courses;
DROP POLICY IF EXISTS "user_courses_admin_manage" ON user_courses;
DROP POLICY IF EXISTS "user_courses_super_admin_all" ON user_courses;

-- Create simple, non-recursive RLS policies for users table
CREATE POLICY "users_own_data" ON users
  FOR ALL
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_admin_access" ON users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        (au.raw_user_meta_data->>'role' = 'admin' AND users.company_id = (au.raw_user_meta_data->>'company_id')::uuid)
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        (au.raw_user_meta_data->>'role' = 'admin' AND users.company_id = (au.raw_user_meta_data->>'company_id')::uuid)
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );

-- Create simple RLS policies for user_profiles
CREATE POLICY "user_profiles_own_access" ON user_profiles
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_admin_access" ON user_profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );

-- Create simple RLS policies for user_courses
CREATE POLICY "user_courses_own_access" ON user_courses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "user_courses_admin_access" ON user_courses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  );

-- Create user metrics function with correct signature
CREATE OR REPLACE FUNCTION get_user_metrics(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can access this data
  IF NOT (
    auth.uid() = target_user_id OR
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid() 
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_user_meta_data->>'role' = 'super_admin'
      )
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      (SELECT SUM((pp.duration * pp.progress_percent / 100.0) / 3600.0)
       FROM podcast_progress pp 
       WHERE pp.user_id = target_user_id), 0
    )::numeric as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = target_user_id), 0
    )::bigint as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = target_user_id), 0
    )::bigint as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent)
       FROM podcast_progress pp 
       WHERE pp.user_id = target_user_id), 0
    )::numeric as average_completion
  FROM users u
  WHERE u.id = target_user_id;
END;
$$;

-- Create function to get current user metrics
CREATE OR REPLACE FUNCTION get_current_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_user_metrics(auth.uid());
END;
$$;

-- Create function to list all user metrics (super admin only)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is super admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND au.raw_user_meta_data->>'role' = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied - super admin required';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      (SELECT SUM((pp.duration * pp.progress_percent / 100.0) / 3600.0)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id), 0
    )::numeric as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = u.id), 0
    )::bigint as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = u.id), 0
    )::bigint as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id), 0
    )::numeric as average_completion
  FROM users u
  WHERE u.role IN ('user', 'admin');
END;
$$;

-- Create function to get all podcast progress (admin/super admin only)
CREATE OR REPLACE FUNCTION get_all_podcast_progress()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  podcast_id uuid,
  playback_position double precision,
  duration double precision,
  progress_percent integer,
  last_played_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user is admin or super admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_user_meta_data->>'role' = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied - admin required';
  END IF;

  RETURN QUERY
  SELECT 
    pp.id,
    pp.user_id,
    pp.podcast_id,
    pp.playback_position,
    pp.duration,
    pp.progress_percent,
    pp.last_played_at
  FROM podcast_progress pp;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_user_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_user_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_podcast_progress() TO authenticated;