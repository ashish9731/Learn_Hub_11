/*
  # Fix calculate_user_metrics function

  1. Changes
     - Drop existing calculate_user_metrics function
     - Recreate calculate_user_metrics function with proper return type
     - Fix RLS policies for user_metrics table
*/

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS calculate_user_metrics(uuid);

-- Recreate the function with proper return type
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
  v_result user_metrics;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;

  -- Calculate total hours from podcast progress
  SELECT COALESCE(SUM((duration * progress_percent / 100) / 3600), 0)
  INTO v_total_hours
  FROM podcast_progress
  WHERE user_id = p_user_id;

  -- Count in-progress courses (courses with any podcast progress)
  SELECT COUNT(DISTINCT c.id)
  INTO v_in_progress_courses
  FROM courses c
  JOIN podcasts p ON p.course_id = c.id
  JOIN podcast_progress pp ON pp.podcast_id = p.id
  WHERE pp.user_id = p_user_id;

  -- Calculate average completion percentage
  SELECT COALESCE(AVG(progress_percent), 0)::INTEGER
  INTO v_average_completion
  FROM podcast_progress
  WHERE user_id = p_user_id;

  -- Insert or update the user_metrics record
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
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_hours = v_total_hours,
    completed_courses = v_completed_courses,
    in_progress_courses = v_in_progress_courses,
    average_completion = v_average_completion,
    updated_at = now();

  -- Return the updated record
  SELECT * INTO v_result FROM user_metrics WHERE user_id = p_user_id;
  RETURN NEXT v_result;
END;
$$;

-- Ensure RLS is enabled on user_metrics
ALTER TABLE user_metrics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own metrics" ON user_metrics;
DROP POLICY IF EXISTS "Users can update their own metrics" ON user_metrics;
DROP POLICY IF EXISTS "Admins can read all metrics" ON user_metrics;
DROP POLICY IF EXISTS "Admins can read company metrics" ON user_metrics;
DROP POLICY IF EXISTS "Super admins can read all metrics" ON user_metrics;

-- Create policies for user_metrics
CREATE POLICY "Users can read their own metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (uid() = user_id);

CREATE POLICY "Users can update their own metrics"
  ON user_metrics
  FOR UPDATE
  TO authenticated
  USING (uid() = user_id)
  WITH CHECK (uid() = user_id);

CREATE POLICY "Admins can read all metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = uid() AND (users.role = 'admin' OR users.role = 'super_admin')
  ));

CREATE POLICY "Admins can read company metrics"
  ON user_metrics
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users admin_user
    JOIN users target_user ON target_user.id = user_metrics.user_id
    WHERE admin_user.id = uid() AND admin_user.role = 'admin' AND admin_user.company_id = target_user.company_id
  ));

CREATE POLICY "Super admins can read all metrics"
  ON user_metrics
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users
    WHERE users.id = uid() AND users.role = 'super_admin'
  ));