/*
  # Fix Database Functions - Final

  1. Database Functions
    - Drop and recreate all user metrics functions with correct signatures
    - Fix return types and parameter issues
    - Add proper error handling

  2. Security
    - Ensure functions work with RLS policies
    - Add proper permissions for different user roles
*/

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_user_metrics(uuid);
DROP FUNCTION IF EXISTS list_all_user_metrics();
DROP FUNCTION IF EXISTS get_current_user_metrics();
DROP FUNCTION IF EXISTS get_all_podcast_progress();

-- Create user metrics function for specific user
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
  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      (SELECT SUM((pp.duration * (pp.progress_percent / 100.0)) / 3600.0)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id), 0
    )::numeric as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = u.id), 0
    )::bigint as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT pp.podcast_id)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id AND pp.progress_percent > 0), 0
    )::bigint as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id), 0
    )::numeric as average_completion
  FROM users u
  WHERE u.id = target_user_id;
END;
$$;

-- Create function to get current user's metrics
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
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Super admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      (SELECT SUM((pp.duration * (pp.progress_percent / 100.0)) / 3600.0)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id), 0
    )::numeric as total_hours,
    COALESCE(
      (SELECT COUNT(DISTINCT uc.course_id)
       FROM user_courses uc 
       WHERE uc.user_id = u.id), 0
    )::bigint as completed_courses,
    COALESCE(
      (SELECT COUNT(DISTINCT pp.podcast_id)
       FROM podcast_progress pp 
       WHERE pp.user_id = u.id AND pp.progress_percent > 0), 0
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
  -- Check if user has admin privileges
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
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