/*
  # Create Update Podcast Progress Function

  1. Functions
    - Create RPC function to update podcast progress safely
    - This function bypasses RLS for authorized operations
*/

-- Function to update podcast progress
CREATE OR REPLACE FUNCTION update_podcast_progress(
  p_user_id UUID,
  p_podcast_id UUID,
  p_playback_position FLOAT,
  p_duration FLOAT,
  p_progress_percent INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Check if the user is updating their own progress or is an admin
  IF auth.uid() = p_user_id OR EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    -- Insert or update the progress
    INSERT INTO podcast_progress (
      user_id, 
      podcast_id, 
      playback_position, 
      duration, 
      progress_percent,
      last_played_at
    ) VALUES (
      p_user_id,
      p_podcast_id,
      p_playback_position,
      p_duration,
      p_progress_percent,
      now()
    )
    ON CONFLICT (user_id, podcast_id) 
    DO UPDATE SET
      playback_position = p_playback_position,
      duration = p_duration,
      progress_percent = p_progress_percent,
      last_played_at = now();
      
    -- Trigger user metrics update
    PERFORM calculate_user_metrics(p_user_id);
  ELSE
    RAISE EXCEPTION 'Not authorized to update progress for this user';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate user metrics
CREATE OR REPLACE FUNCTION calculate_user_metrics(p_user_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_hours FLOAT := 0;
  v_completed_courses INTEGER := 0;
  v_in_progress_courses INTEGER := 0;
  v_average_completion INTEGER := 0;
  v_course_ids UUID[];
  v_course_completion RECORD;
  v_total_completion FLOAT := 0;
  v_course_count INTEGER := 0;
BEGIN
  -- Get all courses assigned to this user
  SELECT ARRAY_AGG(DISTINCT course_id) INTO v_course_ids
  FROM user_courses
  WHERE user_id = p_user_id;
  
  -- If no courses assigned, set default values
  IF v_course_ids IS NULL OR array_length(v_course_ids, 1) IS NULL THEN
    v_course_ids := ARRAY[]::UUID[];
  END IF;
  
  -- Calculate total hours from podcast progress
  SELECT COALESCE(SUM((duration * progress_percent / 100) / 3600), 0) INTO v_total_hours
  FROM podcast_progress
  WHERE user_id = p_user_id;
  
  -- Calculate course completion stats
  v_course_count := array_length(v_course_ids, 1);
  IF v_course_count > 0 THEN
    FOR v_course_completion IN
      SELECT 
        c.id AS course_id,
        COALESCE(AVG(pp.progress_percent), 0) AS avg_progress
      FROM unnest(v_course_ids) AS course_id
      JOIN courses c ON c.id = course_id
      LEFT JOIN podcasts p ON p.course_id = c.id
      LEFT JOIN podcast_progress pp ON pp.podcast_id = p.id AND pp.user_id = p_user_id
      GROUP BY c.id
    LOOP
      v_total_completion := v_total_completion + v_course_completion.avg_progress;
      
      IF v_course_completion.avg_progress >= 90 THEN
        v_completed_courses := v_completed_courses + 1;
      ELSIF v_course_completion.avg_progress > 0 THEN
        v_in_progress_courses := v_in_progress_courses + 1;
      END IF;
    END LOOP;
    
    IF v_course_count > 0 THEN
      v_average_completion := ROUND(v_total_completion / v_course_count);
    END IF;
  END IF;
  
  -- Update user_metrics table
  INSERT INTO user_metrics (
    user_id,
    total_hours,
    completed_courses,
    in_progress_courses,
    average_completion,
    updated_at
  ) VALUES (
    p_user_id,
    ROUND(v_total_hours * 10) / 10,
    v_completed_courses,
    v_in_progress_courses,
    v_average_completion,
    now()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_hours = ROUND(v_total_hours * 10) / 10,
    completed_courses = v_completed_courses,
    in_progress_courses = v_in_progress_courses,
    average_completion = v_average_completion,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;