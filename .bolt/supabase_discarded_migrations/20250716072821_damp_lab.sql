/*
  # Create podcast progress functions

  1. Functions
    - `update_podcast_progress`: Update podcast progress with validation
    - `notify_progress_change`: Notify about progress changes

  2. Triggers
    - Add trigger to notify when podcast progress changes
*/

-- Function to update podcast progress
CREATE OR REPLACE FUNCTION update_podcast_progress(
  p_user_id UUID,
  p_podcast_id UUID,
  p_playback_position DOUBLE PRECISION,
  p_duration DOUBLE PRECISION,
  p_progress_percent INTEGER
)
RETURNS JSONB
SECURITY DEFINER
LANGUAGE plpgsql AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID cannot be null';
  END IF;
  
  IF p_podcast_id IS NULL THEN
    RAISE EXCEPTION 'Podcast ID cannot be null';
  END IF;
  
  IF p_playback_position < 0 THEN
    RAISE EXCEPTION 'Playback position cannot be negative';
  END IF;
  
  IF p_duration <= 0 THEN
    RAISE EXCEPTION 'Duration must be positive';
  END IF;
  
  IF p_progress_percent < 0 OR p_progress_percent > 100 THEN
    RAISE EXCEPTION 'Progress percent must be between 0 and 100';
  END IF;
  
  -- Check if the podcast exists
  IF NOT EXISTS (SELECT 1 FROM podcasts WHERE id = p_podcast_id) THEN
    RAISE EXCEPTION 'Podcast with ID % does not exist', p_podcast_id;
  END IF;
  
  -- Check if the user exists
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User with ID % does not exist', p_user_id;
  END IF;
  
  -- Insert or update the progress
  INSERT INTO podcast_progress (
    user_id,
    podcast_id,
    playback_position,
    duration,
    progress_percent,
    last_played_at
  )
  VALUES (
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
  
  -- Build result
  v_result := jsonb_build_object(
    'user_id', p_user_id,
    'podcast_id', p_podcast_id,
    'playback_position', p_playback_position,
    'duration', p_duration,
    'progress_percent', p_progress_percent,
    'updated_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Function to notify about progress changes
CREATE OR REPLACE FUNCTION notify_progress_change()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  -- Notify about the change
  PERFORM pg_notify(
    'podcast_progress_change',
    jsonb_build_object(
      'user_id', NEW.user_id,
      'podcast_id', NEW.podcast_id,
      'progress_percent', NEW.progress_percent,
      'event', TG_OP
    )::text
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to notify when podcast progress changes
DROP TRIGGER IF EXISTS notify_progress_change ON podcast_progress;
CREATE TRIGGER notify_progress_change
AFTER INSERT OR UPDATE ON podcast_progress
FOR EACH ROW
EXECUTE FUNCTION notify_progress_change();