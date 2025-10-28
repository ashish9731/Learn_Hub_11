/*
  # Fix update_podcast_progress function

  1. Changes
     - Drop existing update_podcast_progress function
     - Recreate function with json return type
     - Grant proper permissions to roles
  
  2. Security
     - Grant execute permissions to authenticated users
*/

BEGIN;

-- Drop the existing function to resolve the 42P13 error
DROP FUNCTION IF EXISTS update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- Recreate the function with the desired return type (assumed json; adjust as needed)
CREATE FUNCTION update_podcast_progress(
    user_id uuid,
    podcast_id uuid,
    progress double precision,
    duration double precision,
    episode_number integer
) RETURNS json AS $$
BEGIN
    -- Update or insert podcast progress in the table
    INSERT INTO podcast_progress (user_id, podcast_id, progress, duration, episode_number)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id, podcast_id)
    DO UPDATE SET
        progress = EXCLUDED.progress,
        duration = EXCLUDED.duration,
        episode_number = EXCLUDED.episode_number;

    -- Return JSON confirmation
    RETURN json_build_object(
        'status', 'success',
        'user_id', $1,
        'podcast_id', $2,
        'progress', $3,
        'duration', $4,
        'episode_number', $5
    );
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions to roles (adjust roles as per your Supabase setup)
GRANT EXECUTE ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO anon;
GRANT EXECUTE ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO service_role;

COMMIT;