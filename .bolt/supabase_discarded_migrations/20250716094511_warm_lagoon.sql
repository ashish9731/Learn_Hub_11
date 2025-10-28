/*
  # Fix calculate_user_metrics function

  1. Changes
    - Drop existing calculate_user_metrics function
    - Recreate function with proper return type
    - Improve function implementation with better metrics calculation
*/

-- Drop the existing function safely
DROP FUNCTION IF EXISTS calculate_user_metrics(uuid);

-- Recreate the function with the proper return type
CREATE OR REPLACE FUNCTION calculate_user_metrics(p_user_id UUID)
RETURNS SETOF user_metrics
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  v_total_hours DOUBLE PRECISION := 0;
  v_completed_courses INTEGER := 0;
  v_in_progress_courses INTEGER := 0;
  v_average_completion INTEGER := 0;
  v_user_exists BOOLEAN;
  v_podcast_count INTEGER := 0;
  v_total_progress INTEGER := 0;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;
  
  -- Calculate total hours from podcast progress
  SELECT 
    COALESCE(SUM((duration * progress_percent / 100) / 3600), 0)
  INTO v_total_hours
  FROM podcast_progress
  WHERE user_id = p_user_id;
  
  -- Count in-progress courses
  SELECT COUNT(DISTINCT course_id)
  INTO v_in_progress_courses
  FROM user_courses
  WHERE user_id = p_user_id;
  
  -- Calculate average completion percentage
  SELECT 
    COUNT(*), 
    COALESCE(SUM(progress_percent), 0)
  INTO 
    v_podcast_count, 
    v_total_progress
  FROM podcast_progress
  WHERE user_id = p_user_id;
  
  IF v_podcast_count > 0 THEN
    v_average_completion := v_total_progress / v_podcast_count;
  ELSE
    v_average_completion := 0;
  END IF;
  
  -- Update or insert user metrics
  RETURN QUERY
  INSERT INTO user_metrics (
    user_id,
    total_hours,
    completed_courses,
    in_progress_courses,
    average_completion,
    updated_at
  )
  VALUES (
    p_user_id,
    v_total_hours,
    v_completed_courses,
    v_in_progress_courses,
    v_average_completion,
    NOW()
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_hours = v_total_hours,
    completed_courses = v_completed_courses,
    in_progress_courses = v_in_progress_courses,
    average_completion = v_average_completion,
    updated_at = NOW()
  RETURNING *;
END;
$$;