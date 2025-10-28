/*
  # Fix user_metrics function type mismatch

  1. Changes
     - Drop and recreate get_user_metrics function with correct type casting
     - Ensure all numeric values are properly cast to match expected return types
     - Add proper security checks for user access control
*/

-- Drop the existing function to recreate it with proper types
DROP FUNCTION IF EXISTS get_user_metrics(uuid);

-- Recreate the function with explicit type casting
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
) AS $$
DECLARE
  v_user_role text;
  v_user_company_id uuid;
BEGIN
  -- Get the role and company_id of the calling user
  SELECT role, company_id INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();
  
  -- Check if the user has permission to view the requested metrics
  IF auth.uid() = p_user_id OR 
     v_user_role = 'super_admin' OR 
     (v_user_role = 'admin' AND EXISTS (
       SELECT 1 FROM users 
       WHERE id = p_user_id AND company_id = v_user_company_id
     ))
  THEN
    RETURN QUERY
    SELECT 
      pp.user_id,
      -- Cast to numeric to match expected return type
      COALESCE(SUM((pp.playback_position / 3600)::numeric), 0::numeric) AS total_hours,
      -- Count completed podcasts (100% progress)
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent = 100)::bigint, 0::bigint) AS completed_courses,
      -- Count in-progress podcasts (1-99% progress)
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100)::bigint, 0::bigint) AS in_progress_courses,
      -- Calculate average completion percentage
      COALESCE(AVG(pp.progress_percent)::numeric, 0::numeric) AS average_completion
    FROM podcast_progress pp
    WHERE pp.user_id = p_user_id
    GROUP BY pp.user_id;
  ELSE
    -- Return empty result if user doesn't have permission
    RETURN QUERY
    SELECT 
      p_user_id AS user_id,
      0::numeric AS total_hours,
      0::bigint AS completed_courses,
      0::bigint AS in_progress_courses,
      0::numeric AS average_completion
    WHERE false;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to list all user metrics (for admins and super admins)
DROP FUNCTION IF EXISTS list_all_user_metrics();

CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
) AS $$
DECLARE
  v_user_role text;
  v_user_company_id uuid;
BEGIN
  -- Get the role and company_id of the calling user
  SELECT role, company_id INTO v_user_role, v_user_company_id
  FROM users
  WHERE id = auth.uid();
  
  -- Super admins can see all metrics
  IF v_user_role = 'super_admin' THEN
    RETURN QUERY
    SELECT 
      u.id AS user_id,
      u.email,
      COALESCE(SUM((pp.playback_position / 3600)::numeric), 0::numeric) AS total_hours,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent = 100)::bigint, 0::bigint) AS completed_courses,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100)::bigint, 0::bigint) AS in_progress_courses,
      COALESCE(AVG(pp.progress_percent)::numeric, 0::numeric) AS average_completion
    FROM users u
    LEFT JOIN podcast_progress pp ON u.id = pp.user_id
    GROUP BY u.id, u.email;
  
  -- Admins can see metrics for users in their company
  ELSIF v_user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      u.id AS user_id,
      u.email,
      COALESCE(SUM((pp.playback_position / 3600)::numeric), 0::numeric) AS total_hours,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent = 100)::bigint, 0::bigint) AS completed_courses,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100)::bigint, 0::bigint) AS in_progress_courses,
      COALESCE(AVG(pp.progress_percent)::numeric, 0::numeric) AS average_completion
    FROM users u
    LEFT JOIN podcast_progress pp ON u.id = pp.user_id
    WHERE u.company_id = v_user_company_id
    GROUP BY u.id, u.email;
  
  -- Regular users can only see their own metrics
  ELSE
    RETURN QUERY
    SELECT 
      u.id AS user_id,
      u.email,
      COALESCE(SUM((pp.playback_position / 3600)::numeric), 0::numeric) AS total_hours,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent = 100)::bigint, 0::bigint) AS completed_courses,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100)::bigint, 0::bigint) AS in_progress_courses,
      COALESCE(AVG(pp.progress_percent)::numeric, 0::numeric) AS average_completion
    FROM users u
    LEFT JOIN podcast_progress pp ON u.id = pp.user_id
    WHERE u.id = auth.uid()
    GROUP BY u.id, u.email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;