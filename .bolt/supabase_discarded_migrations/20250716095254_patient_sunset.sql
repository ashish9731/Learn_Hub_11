/*
  # Drop and recreate update_podcast_progress function

  1. Changes
    - Drops the existing update_podcast_progress function
    - Recreates the function with the same parameters but with a json return type
    - Updates the function logic to handle podcast progress updates
*/

-- Drop the existing function
DROP FUNCTION IF EXISTS update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- Recreate the function with the same parameters but with a json return type
CREATE OR REPLACE FUNCTION update_podcast_progress(
    p_user_id uuid,
    p_podcast_id uuid,
    p_playback_position double precision,
    p_duration double precision,
    p_progress_percent integer
) RETURNS json AS $$
DECLARE
    v_result json;
BEGIN
    -- Upsert the podcast progress record
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
    ON CONFLICT (user_id, podcast_id) DO UPDATE SET
        playback_position = p_playback_position,
        duration = p_duration,
        progress_percent = p_progress_percent,
        last_played_at = now();
    
    -- Return success JSON
    v_result := json_build_object(
        'status', 'success',
        'user_id', p_user_id,
        'podcast_id', p_podcast_id,
        'playback_position', p_playback_position,
        'duration', p_duration,
        'progress_percent', p_progress_percent
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO authenticated;

-- Add comment to the function
COMMENT ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) IS 'Updates podcast progress for a user and returns the result as JSON';