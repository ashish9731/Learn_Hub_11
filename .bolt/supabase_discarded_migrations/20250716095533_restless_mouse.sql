/*
  # Fix update_podcast_progress function

  1. Changes
     - Drop existing update_podcast_progress function
     - Recreate function with proper return type
     - Add security settings
*/

-- First, drop the existing function
DROP FUNCTION IF EXISTS update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- Then recreate it with the correct return type
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
    
    -- Return success response
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