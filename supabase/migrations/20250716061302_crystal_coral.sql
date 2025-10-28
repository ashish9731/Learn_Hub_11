/*
  # Create podcast progress functions

  1. New Functions
    - `update_podcast_progress` - RPC function to update podcast progress
    - `notify_progress_change` - Function to notify clients of progress changes
  2. Triggers
    - Add trigger to notify clients when progress changes
*/

-- Create RPC function to update podcast progress
CREATE OR REPLACE FUNCTION update_podcast_progress(
  p_user_id UUID,
  p_podcast_id UUID,
  p_playback_position DOUBLE PRECISION,
  p_duration DOUBLE PRECISION,
  p_progress_percent INTEGER
) RETURNS VOID AS $$
BEGIN
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
    
  -- Update user metrics
  PERFORM calculate_user_metrics(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate user metrics
CREATE OR REPLACE FUNCTION calculate_user_metrics(p_user_id UUID) RETURNS VOID AS $$
DECLARE
  v_total_hours DOUBLE PRECISION := 0;
  v_completed_courses INTEGER := 0;
  v_in_progress_courses INTEGER := 0;
  v_average_completion INTEGER := 0;
  v_course_count INTEGER := 0;
  v_course_record RECORD;
  v_podcast_count INTEGER;
  v_completed_podcast_count INTEGER;
  v_completion_percent INTEGER;
BEGIN
  -- Calculate total hours from podcast progress
  SELECT COALESCE(SUM((duration * progress_percent / 100) / 3600), 0)
  INTO v_total_hours
  FROM podcast_progress
  WHERE user_id = p_user_id;
  
  -- Get courses assigned to user
  FOR v_course_record IN 
    SELECT course_id 
    FROM user_courses 
    WHERE user_id = p_user_id
  LOOP
    -- Count podcasts in this course
    SELECT COUNT(*) INTO v_podcast_count
    FROM podcasts
    WHERE course_id = v_course_record.course_id;
    
    -- Skip if no podcasts
    IF v_podcast_count = 0 THEN
      CONTINUE;
    END IF;
    
    -- Count completed podcasts (progress >= 90%)
    SELECT COUNT(*) INTO v_completed_podcast_count
    FROM podcast_progress pp
    JOIN podcasts p ON pp.podcast_id = p.id
    WHERE pp.user_id = p_user_id
      AND p.course_id = v_course_record.course_id
      AND pp.progress_percent >= 90;
    
    -- Calculate completion percentage
    v_completion_percent := CASE WHEN v_podcast_count > 0 
                               THEN (v_completed_podcast_count * 100) / v_podcast_count
                               ELSE 0
                            END;
    
    -- Update course counts
    IF v_completion_percent >= 90 THEN
      v_completed_courses := v_completed_courses + 1;
    ELSIF v_completion_percent > 0 THEN
      v_in_progress_courses := v_in_progress_courses + 1;
    END IF;
    
    -- Add to total for average calculation
    v_course_count := v_course_count + 1;
    v_average_completion := v_average_completion + v_completion_percent;
  END LOOP;
  
  -- Calculate average completion
  IF v_course_count > 0 THEN
    v_average_completion := v_average_completion / v_course_count;
  ELSE
    v_average_completion := 0;
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
END;
$$ LANGUAGE plpgsql;

-- Create function to notify clients of progress changes
CREATE OR REPLACE FUNCTION notify_progress_change() RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'podcast_progress_change',
    json_build_object(
      'user_id', NEW.user_id,
      'podcast_id', NEW.podcast_id,
      'progress_percent', NEW.progress_percent
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to notify clients when progress changes
DROP TRIGGER IF EXISTS notify_progress_change ON podcast_progress;
CREATE TRIGGER notify_progress_change
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION notify_progress_change();