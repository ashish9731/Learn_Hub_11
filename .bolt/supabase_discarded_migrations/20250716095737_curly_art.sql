/*
  # Drop and recreate update_podcast_progress function

  1. Changes
    - Drops the existing update_podcast_progress function
    - Recreates the function with a JSON return type
    - Adds proper security settings
    - Grants execute permission to authenticated users
*/

-- First, drop the existing function
DROP FUNCTION IF EXISTS update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- Recreate the function with the new return type
CREATE OR REPLACE FUNCTION update_podcast_progress(
    user_id uuid,
    podcast_id uuid,
    playback_position double precision,
    duration double precision,
    progress_percent integer
) RETURNS json AS $$
DECLARE
    result json;
BEGIN
    -- Update or insert podcast progress
    INSERT INTO podcast_progress (
        user_id, 
        podcast_id, 
        playback_position, 
        duration, 
        progress_percent,
        last_played_at
    )
    VALUES (
        user_id, 
        podcast_id, 
        playback_position, 
        duration, 
        progress_percent,
        NOW()
    )
    ON CONFLICT (user_id, podcast_id) 
    DO UPDATE SET
        playback_position = EXCLUDED.playback_position,
        duration = EXCLUDED.duration,
        progress_percent = EXCLUDED.progress_percent,
        last_played_at = EXCLUDED.last_played_at
    RETURNING to_json(podcast_progress.*) INTO result;
    
    -- Update user metrics after progress is saved
    PERFORM update_user_metrics_from_progress();
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO authenticated;