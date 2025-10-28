-- Update views to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures views run with the permissions of the querying user, enforcing RLS policies

BEGIN;

-- Alter existing views to use SECURITY INVOKER
ALTER VIEW public.assigned_users SET (security_invoker = true);
ALTER VIEW public.assigned_admins SET (security_invoker = true);
ALTER VIEW public.assigned_regular_users SET (security_invoker = true);

-- Also update functions to use SECURITY INVOKER where appropriate
-- Note: Some functions may need to remain SECURITY DEFINER if they need elevated permissions

-- Update the update_podcast_progress function
DROP FUNCTION IF EXISTS public.update_podcast_progress(uuid, uuid, double precision, double precision, integer);
CREATE FUNCTION public.update_podcast_progress(
    p_user_id uuid,
    p_podcast_id uuid,
    p_playback_position double precision,
    p_duration double precision,
    p_progress_percent integer
) RETURNS json
    SECURITY INVOKER
AS $$
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_podcast_id IS NULL THEN
        RAISE EXCEPTION 'User ID and Podcast ID cannot be null';
    END IF;
    IF p_playback_position < 0 OR p_duration <= 0 OR p_progress_percent < 0 OR p_progress_percent > 100 THEN
        RAISE EXCEPTION 'Invalid playback position, duration, or progress percent';
    END IF;

    -- Ensure user can only update their own progress
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'You can only update your own progress';
    END IF;

    -- Update or insert podcast progress
    INSERT INTO public.podcast_progress (user_id, podcast_id, playback_position, duration, progress_percent, updated_at)
    VALUES (p_user_id, p_podcast_id, p_playback_position, p_duration, p_progress_percent, now())
    ON CONFLICT (user_id, podcast_id)
    DO UPDATE SET
        playback_position = EXCLUDED.playback_position,
        duration = EXCLUDED.duration,
        progress_percent = EXCLUDED.progress_percent,
        updated_at = now();

    -- Return JSON confirmation
    RETURN json_build_object(
        'status', 'success',
        'user_id', p_user_id,
        'podcast_id', p_podcast_id,
        'playback_position', p_playback_position,
        'duration', p_duration,
        'progress_percent', p_progress_percent
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'status', 'error',
            'message', SQLERRM
        );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_podcast_progress(uuid, uuid, double precision, double precision, integer) TO authenticated, service_role;

COMMIT;