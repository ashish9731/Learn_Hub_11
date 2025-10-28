/*
  # Create User Metrics Functions

  1. Functions
    - Create RPC function to update user metrics safely
    - Create RPC function to get user metrics safely
    - These functions bypass RLS for authorized operations
*/

-- Function to update user metrics
CREATE OR REPLACE FUNCTION update_user_metrics(
  p_user_id UUID,
  p_total_hours FLOAT,
  p_completed_courses INTEGER,
  p_in_progress_courses INTEGER,
  p_average_completion INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Check if the user is updating their own metrics or is an admin
  IF auth.uid() = p_user_id OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    -- Insert or update the metrics
    INSERT INTO user_metrics (
      user_id, 
      total_hours, 
      completed_courses, 
      in_progress_courses, 
      average_completion,
      updated_at
    ) VALUES (
      p_user_id,
      p_total_hours,
      p_completed_courses,
      p_in_progress_courses,
      p_average_completion,
      now()
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
      total_hours = p_total_hours,
      completed_courses = p_completed_courses,
      in_progress_courses = p_in_progress_courses,
      average_completion = p_average_completion,
      updated_at = now();
  ELSE
    RAISE EXCEPTION 'Not authorized to update metrics for this user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user metrics
CREATE OR REPLACE FUNCTION get_user_metrics(
  p_user_id UUID
) RETURNS TABLE (
  user_id UUID,
  total_hours FLOAT,
  completed_courses INTEGER,
  in_progress_courses INTEGER,
  average_completion INTEGER,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Check if the user is getting their own metrics or is an admin
  IF auth.uid() = p_user_id OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RETURN QUERY
    SELECT 
      um.user_id,
      um.total_hours,
      um.completed_courses,
      um.in_progress_courses,
      um.average_completion,
      um.updated_at
    FROM user_metrics um
    WHERE um.user_id = p_user_id;
  ELSE
    RAISE EXCEPTION 'Not authorized to view metrics for this user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;