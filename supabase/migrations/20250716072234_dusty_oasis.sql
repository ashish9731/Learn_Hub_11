/*
  # Create podcast progress retrieval functions

  1. Functions
    - `get_podcast_progress` - Get progress for a specific podcast
    - `get_course_progress` - Get progress for all podcasts in a course
    - `calculate_course_completion` - Calculate completion percentage for a course
*/

-- Function to get progress for a specific podcast
CREATE OR REPLACE FUNCTION get_podcast_progress(
  p_user_id UUID,
  p_podcast_id UUID
)
RETURNS TABLE (
  playback_position DOUBLE PRECISION,
  duration DOUBLE PRECISION,
  progress_percent INTEGER,
  last_played_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if user is requesting their own progress or is an admin
  IF p_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RETURN QUERY
    SELECT 
      pp.playback_position,
      pp.duration,
      pp.progress_percent,
      pp.last_played_at
    FROM podcast_progress pp
    WHERE pp.user_id = p_user_id
    AND pp.podcast_id = p_podcast_id;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only access your own progress';
  END IF;
END;
$$;

-- Function to get progress for all podcasts in a course
CREATE OR REPLACE FUNCTION get_course_progress(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS TABLE (
  podcast_id UUID,
  podcast_title TEXT,
  playback_position DOUBLE PRECISION,
  duration DOUBLE PRECISION,
  progress_percent INTEGER,
  last_played_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if user is requesting their own progress or is an admin
  IF p_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND (role = 'admin' OR role = 'super_admin')
  ) THEN
    RETURN QUERY
    SELECT 
      p.id AS podcast_id,
      p.title AS podcast_title,
      pp.playback_position,
      pp.duration,
      pp.progress_percent,
      pp.last_played_at
    FROM podcasts p
    LEFT JOIN podcast_progress pp ON pp.podcast_id = p.id AND pp.user_id = p_user_id
    WHERE p.course_id = p_course_id
    ORDER BY p.title;
  ELSE
    RAISE EXCEPTION 'Permission denied: You can only access your own progress';
  END IF;
END;
$$;

-- Function to calculate completion percentage for a course
CREATE OR REPLACE FUNCTION calculate_course_completion(
  p_user_id UUID,
  p_course_id UUID
)
RETURNS INTEGER
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_total_podcasts INTEGER;
  v_completed_podcasts INTEGER;
  v_total_progress INTEGER;
BEGIN
  -- Get total number of podcasts in the course
  SELECT COUNT(*)
  INTO v_total_podcasts
  FROM podcasts
  WHERE course_id = p_course_id;
  
  -- If no podcasts, return 0
  IF v_total_podcasts = 0 THEN
    RETURN 0;
  END IF;
  
  -- Get number of completed podcasts
  SELECT COUNT(*)
  INTO v_completed_podcasts
  FROM podcasts p
  JOIN podcast_progress pp ON pp.podcast_id = p.id
  WHERE p.course_id = p_course_id
  AND pp.user_id = p_user_id
  AND pp.progress_percent = 100;
  
  -- Get total progress percentage
  SELECT COALESCE(SUM(pp.progress_percent), 0)
  INTO v_total_progress
  FROM podcasts p
  LEFT JOIN podcast_progress pp ON pp.podcast_id = p.id AND pp.user_id = p_user_id
  WHERE p.course_id = p_course_id;
  
  -- Calculate average completion percentage
  RETURN v_total_progress / v_total_podcasts;
END;
$$;