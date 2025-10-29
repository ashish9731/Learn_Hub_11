/*
  # Fix user metrics calculation to properly show courses in progress and partial minutes

  1. Update get_current_user_metrics function to:
    - Properly calculate courses in progress (any podcast with > 0 progress)
    - Show partial hours correctly (even 10 seconds of play)
    - Ensure consistency between frontend and backend calculations
*/

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_current_user_metrics();

-- Create the updated get_current_user_metrics function
CREATE OR REPLACE FUNCTION get_current_user_metrics()
RETURNS TABLE(
  user_id uuid,
  email text,
  total_hours numeric,
  completed_courses bigint,
  in_progress_courses bigint,
  average_completion numeric
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH user_course_stats AS (
    SELECT 
      uc.user_id,
      uc.course_id,
      COUNT(p.id) as total_podcasts_in_course,
      COUNT(pp.podcast_id) as podcasts_with_progress,
      COUNT(CASE WHEN pp.progress_percent >= 100 THEN 1 END) as completed_podcasts,
      COALESCE(SUM(pp.duration * pp.progress_percent / 100.0), 0) as total_seconds_played
    FROM user_courses uc
    LEFT JOIN podcasts p ON uc.course_id = p.course_id
    LEFT JOIN podcast_progress pp ON pp.user_id = uc.user_id AND pp.podcast_id = p.id
    WHERE uc.user_id = auth.uid()
    GROUP BY uc.user_id, uc.course_id
  )
  SELECT 
    u.id as user_id,
    u.email,
    -- Calculate total hours with decimal precision (show even 10 seconds of play)
    ROUND(COALESCE(SUM(ucs.total_seconds_played) / 3600.0, 0)::numeric, 2) as total_hours,
    -- Count completed courses (all podcasts in course 100% complete)
    COUNT(DISTINCT CASE 
      WHEN ucs.total_podcasts_in_course > 0 AND ucs.completed_podcasts = ucs.total_podcasts_in_course 
      THEN ucs.course_id 
    END) as completed_courses,
    -- Count courses in progress (any podcast in course has progress > 0)
    COUNT(DISTINCT CASE 
      WHEN ucs.podcasts_with_progress > 0 AND ucs.completed_podcasts < ucs.total_podcasts_in_course
      THEN ucs.course_id 
    END) as in_progress_courses,
    -- Calculate average completion across all podcast progress
    COALESCE(ROUND(AVG(pp.progress_percent), 2), 0) as average_completion
  FROM users u
  LEFT JOIN user_course_stats ucs ON u.id = ucs.user_id
  LEFT JOIN podcast_progress pp ON u.id = pp.user_id
  WHERE u.id = auth.uid()
  GROUP BY u.id, u.email;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_metrics() TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';