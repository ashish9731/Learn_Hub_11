/*
  # Create user metrics functions

  1. Functions
    - `calculate_user_metrics(p_user_id UUID)` - Calculates metrics for a user
    - `update_user_metrics_from_progress()` - Trigger function to update metrics when progress changes
    - `create_or_update_user_metrics(p_user_id UUID)` - Creates or updates user metrics
    - `get_user_metrics(p_user_id UUID)` - Gets metrics for a user

  2. Triggers
    - Add trigger on podcast_progress to update user metrics
*/

-- Function to calculate user metrics
CREATE OR REPLACE FUNCTION calculate_user_metrics(p_user_id UUID)
RETURNS RECORD AS $$
DECLARE
  v_total_hours DOUBLE PRECISION := 0;
  v_completed_courses INTEGER := 0;
  v_in_progress_courses INTEGER := 0;
  v_average_completion INTEGER := 0;
  v_result RECORD;
BEGIN
  -- Calculate total hours from podcast progress
  SELECT COALESCE(SUM((duration * progress_percent / 100) / 3600), 0)
  INTO v_total_hours
  FROM podcast_progress
  WHERE user_id = p_user_id;

  -- Count in-progress courses (courses with any progress)
  SELECT COUNT(DISTINCT c.id)
  INTO v_in_progress_courses
  FROM courses c
  JOIN podcasts p ON p.course_id = c.id
  JOIN podcast_progress pp ON pp.podcast_id = p.id
  WHERE pp.user_id = p_user_id;

  -- Count completed courses (courses with 100% progress on all podcasts)
  SELECT COUNT(DISTINCT c.id)
  INTO v_completed_courses
  FROM courses c
  WHERE EXISTS (
    SELECT 1
    FROM podcasts p
    JOIN podcast_progress pp ON pp.podcast_id = p.id
    WHERE p.course_id = c.id
      AND pp.user_id = p_user_id
      AND pp.progress_percent = 100
  )
  AND NOT EXISTS (
    SELECT 1
    FROM podcasts p
    LEFT JOIN podcast_progress pp ON pp.podcast_id = p.id AND pp.user_id = p_user_id
    WHERE p.course_id = c.id
      AND (pp.id IS NULL OR pp.progress_percent < 100)
  );

  -- Calculate average completion percentage
  SELECT COALESCE(AVG(progress_percent), 0)::INTEGER
  INTO v_average_completion
  FROM podcast_progress
  WHERE user_id = p_user_id;

  -- Return the calculated metrics
  v_result := ROW(
    v_total_hours,
    v_completed_courses,
    v_in_progress_courses,
    v_average_completion
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user metrics from podcast progress
CREATE OR REPLACE FUNCTION update_user_metrics_from_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_metrics RECORD;
BEGIN
  -- Calculate metrics for the user
  SELECT * FROM calculate_user_metrics(NEW.user_id) INTO v_metrics;

  -- Insert or update user metrics
  INSERT INTO user_metrics (
    user_id,
    total_hours,
    completed_courses,
    in_progress_courses,
    average_completion,
    updated_at
  ) VALUES (
    NEW.user_id,
    v_metrics.column1, -- total_hours
    v_metrics.column2, -- completed_courses
    v_metrics.column3, -- in_progress_courses
    v_metrics.column4, -- average_completion
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hours = v_metrics.column1,
    completed_courses = v_metrics.column2,
    in_progress_courses = v_metrics.column3,
    average_completion = v_metrics.column4,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace trigger on podcast_progress
DROP TRIGGER IF EXISTS update_user_metrics_trigger ON podcast_progress;
CREATE TRIGGER update_user_metrics_trigger
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION update_user_metrics_from_progress();

-- Function to create or update user metrics
CREATE OR REPLACE FUNCTION create_or_update_user_metrics(p_user_id UUID)
RETURNS SETOF user_metrics AS $$
DECLARE
  v_metrics RECORD;
BEGIN
  -- Calculate metrics for the user
  SELECT * FROM calculate_user_metrics(p_user_id) INTO v_metrics;

  -- Insert or update user metrics
  RETURN QUERY
  INSERT INTO user_metrics (
    user_id,
    total_hours,
    completed_courses,
    in_progress_courses,
    average_completion,
    updated_at
  ) VALUES (
    p_user_id,
    v_metrics.column1, -- total_hours
    v_metrics.column2, -- completed_courses
    v_metrics.column3, -- in_progress_courses
    v_metrics.column4, -- average_completion
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_hours = v_metrics.column1,
    completed_courses = v_metrics.column2,
    in_progress_courses = v_metrics.column3,
    average_completion = v_metrics.column4,
    updated_at = now()
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user metrics
CREATE OR REPLACE FUNCTION get_user_metrics(p_user_id UUID)
RETURNS SETOF user_metrics AS $$
BEGIN
  -- First try to get existing metrics
  RETURN QUERY
  SELECT * FROM user_metrics
  WHERE user_id = p_user_id;

  -- If no rows returned, calculate and create metrics
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT * FROM create_or_update_user_metrics(p_user_id);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;