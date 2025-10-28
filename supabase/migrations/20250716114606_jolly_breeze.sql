/*
  # Fix get_user_metrics function type mismatch

  This migration fixes the type mismatch error in the get_user_metrics function where
  double precision values are being returned but numeric types are expected.

  ## Changes
  1. Drop the existing get_user_metrics function
  2. Recreate it with proper type casting to ensure all returned values match expected types
  3. Cast double precision values to numeric where needed
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS get_user_metrics(uuid);

-- Recreate the function with proper type casting
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
) 
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user can access this data
  IF NOT (
    -- User can see their own metrics
    auth.uid() = p_user_id OR
    -- Admin can see metrics for users in their company
    EXISTS (
      SELECT 1 FROM users admin_user
      JOIN users target_user ON target_user.id = p_user_id
      WHERE admin_user.id = auth.uid() 
        AND admin_user.role = 'admin'
        AND admin_user.company_id = target_user.company_id
    ) OR
    -- Super admin can see all metrics
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'super_admin'
    )
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    u.id as user_id,
    u.email,
    COALESCE(
      (SELECT SUM((pp.playback_position * (pp.progress_percent::numeric / 100)) / 3600)::numeric
       FROM podcast_progress pp 
       WHERE pp.user_id = p_user_id), 
      0::numeric
    ) as total_hours,
    COALESCE(
      (SELECT COUNT(*)::bigint
       FROM podcast_progress pp 
       WHERE pp.user_id = p_user_id AND pp.progress_percent = 100), 
      0::bigint
    ) as completed_courses,
    COALESCE(
      (SELECT COUNT(*)::bigint
       FROM podcast_progress pp 
       WHERE pp.user_id = p_user_id AND pp.progress_percent > 0 AND pp.progress_percent < 100), 
      0::bigint
    ) as in_progress_courses,
    COALESCE(
      (SELECT AVG(pp.progress_percent)::numeric
       FROM podcast_progress pp 
       WHERE pp.user_id = p_user_id AND pp.progress_percent > 0), 
      0::numeric
    ) as average_completion
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql;