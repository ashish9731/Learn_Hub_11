/*
  # Create update podcast progress function

  1. Functions
    - `update_podcast_progress(p_user_id UUID, p_podcast_id UUID, p_playback_position DOUBLE PRECISION, p_duration DOUBLE PRECISION, p_progress_percent INTEGER)` - Updates podcast progress

  2. Security
    - Function uses SECURITY DEFINER to bypass RLS
    - Validates input parameters
    - Handles errors gracefully
*/

-- Function to update podcast progress
CREATE OR REPLACE FUNCTION update_podcast_progress(
  p_user_id UUID,
  p_podcast_id UUID,
  p_playback_position DOUBLE PRECISION,
  p_duration DOUBLE PRECISION,
  p_progress_percent INTEGER
)
RETURNS SETOF podcast_progress AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Validate input parameters
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

  -- Insert or update podcast progress
  RETURN QUERY
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
    v_now
  )
  ON CONFLICT (user_id, podcast_id) DO UPDATE SET
    playback_position = p_playback_position,
    duration = p_duration,
    progress_percent = p_progress_percent,
    last_played_at = v_now
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;