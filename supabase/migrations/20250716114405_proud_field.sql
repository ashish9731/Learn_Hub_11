/*
# Fix get_user_metrics function

1. Changes
   - Drop existing get_user_metrics function
   - Recreate the function with correct return type
   - Fix the function to properly calculate user metrics from podcast_progress

2. Security
   - Maintain existing RLS policies
   - Ensure function respects user permissions
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS get_user_metrics(uuid);

-- Recreate the function with the correct return type
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  total_hours numeric,
  completed_courses integer,
  in_progress_courses integer,
  average_completion numeric
) AS $$
BEGIN
  -- Check if the user has permission to view this data
  IF (
    auth.uid() = p_user_id -- User can see their own metrics
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    ) -- Super admins can see all metrics
    OR EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = p_user_id
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = target_user.company_id
    ) -- Admins can see metrics for users in their company
  ) THEN
    RETURN QUERY
    SELECT 
      p_user_id,
      COALESCE(ROUND(SUM(
        (pp.duration * (pp.progress_percent / 100)) / 3600 -- Convert seconds to hours
      ) * 10) / 10, 0) AS total_hours,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent = 100), 0) AS completed_courses,
      COALESCE(COUNT(*) FILTER (WHERE pp.progress_percent > 0 AND pp.progress_percent < 100), 0) AS in_progress_courses,
      COALESCE(ROUND(AVG(pp.progress_percent)), 0) AS average_completion
    FROM podcast_progress pp
    WHERE pp.user_id = p_user_id;
  ELSE
    -- Return empty result if user doesn't have permission
    RETURN QUERY
    SELECT 
      p_user_id,
      0::numeric AS total_hours,
      0 AS completed_courses,
      0 AS in_progress_courses,
      0::numeric AS average_completion;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to list all user metrics (for admins and super admins)
CREATE OR REPLACE FUNCTION list_all_user_metrics()
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses integer,
  in_progress_courses integer,
  average_completion numeric
) AS $$
BEGIN
  -- Check if the user is a super admin
  IF EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'super_admin'
  ) THEN
    -- Super admin can see all metrics
    RETURN QUERY
    SELECT 
      u.id,
      u.email,
      COALESCE(metrics.total_hours, 0) AS total_hours,
      COALESCE(metrics.completed_courses, 0) AS completed_courses,
      COALESCE(metrics.in_progress_courses, 0) AS in_progress_courses,
      COALESCE(metrics.average_completion, 0) AS average_completion
    FROM users u
    LEFT JOIN LATERAL (
      SELECT * FROM get_user_metrics(u.id)
    ) metrics ON true;
  ELSE
    -- Admin can see metrics for users in their company
    RETURN QUERY
    SELECT 
      u.id,
      u.email,
      COALESCE(metrics.total_hours, 0) AS total_hours,
      COALESCE(metrics.completed_courses, 0) AS completed_courses,
      COALESCE(metrics.in_progress_courses, 0) AS in_progress_courses,
      COALESCE(metrics.average_completion, 0) AS average_completion
    FROM users u
    JOIN users admin_user ON admin_user.id = auth.uid()
    LEFT JOIN LATERAL (
      SELECT * FROM get_user_metrics(u.id)
    ) metrics ON true
    WHERE admin_user.role = 'admin'
    AND admin_user.company_id = u.company_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_metrics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION list_all_user_metrics() TO authenticated;