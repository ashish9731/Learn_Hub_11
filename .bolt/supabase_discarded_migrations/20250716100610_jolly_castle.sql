BEGIN;

-- Drop the existing function to resolve the 42P13 error
DROP FUNCTION IF EXISTS public.update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- Recreate the function with the desired return type (json assumed; adjust as needed)
CREATE FUNCTION public.update_podcast_progress(
    user_id uuid,
    podcast_id uuid,
    progress double precision,
    duration double precision,
    episode_number integer
) RETURNS json AS $$
BEGIN
    -- Update or insert podcast progress in the table
    INSERT INTO public.podcast_progress (user_id, podcast_id, progress, duration, episode_number)
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

-- Grant necessary permissions to Supabase roles
GRANT EXECUTE ON FUNCTION public.update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO anon;
GRANT EXECUTE ON FUNCTION public.update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO service_role;

COMMIT;