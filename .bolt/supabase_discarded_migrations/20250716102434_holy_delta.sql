BEGIN;

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_user_metrics(uuid);
DROP FUNCTION IF EXISTS public.update_podcast_progress(uuid, uuid, double precision, double precision, integer);

-- 1. Drop the existing podcast_progress table to resolve API issues
DROP TABLE IF EXISTS public.podcast_progress;

-- 2. Recreate podcast_progress table
CREATE TABLE public.podcast_progress (
    user_id uuid NOT NULL REFERENCES auth.users(id),
    podcast_id uuid NOT NULL,
    playback_position double precision NOT NULL,
    duration double precision NOT NULL,
    progress_percent integer NOT NULL,
    updated_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, podcast_id)
);

-- Enable RLS on podcast_progress
ALTER TABLE public.podcast_progress ENABLE ROW LEVEL SECURITY;

-- RLS policies for podcast_progress
CREATE POLICY "Users can read their own progress" ON public.podcast_progress
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progress" ON public.podcast_progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions on podcast_progress
GRANT ALL ON public.podcast_progress TO anon, authenticated, service_role;

-- 3. Create user_metrics table
CREATE TABLE public.user_metrics (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id),
    total_hours double precision DEFAULT 0,
    completed_courses integer DEFAULT 0,
    in_progress_courses integer DEFAULT 0,
    average_completion integer DEFAULT 0,
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_metrics
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_metrics
CREATE POLICY "Users can read their own metrics" ON public.user_metrics
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can read metrics for their company" ON public.user_metrics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM auth.users u
            JOIN company_users cu ON u.id = cu.user_id
            WHERE cu.company_id = (SELECT company_id FROM company_admins WHERE user_id = auth.uid())
            AND u.id = user_metrics.user_id
        )
    );
CREATE POLICY "Super admins can read all metrics" ON public.user_metrics
    FOR SELECT USING (
        (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()) = 'super_admin'
    );

-- Grant permissions on user_metrics
GRANT ALL ON public.user_metrics TO anon, authenticated, service_role;

-- 4. Drop and recreate update_podcast_progress function
CREATE FUNCTION public.update_podcast_progress(
    p_user_id uuid,
    p_podcast_id uuid,
    p_playback_position double precision,
    p_duration double precision,
    p_progress_percent integer
) RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate inputs
    IF p_user_id IS NULL OR p_podcast_id IS NULL THEN
        RAISE EXCEPTION 'User ID and Podcast ID cannot be null';
    END IF;
    IF p_playback_position < 0 OR p_duration <= 0 OR p_progress_percent < 0 OR p_progress_percent > 100 THEN
        RAISE EXCEPTION 'Invalid playback position, duration, or progress percent';
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

-- 5. Drop and recreate calculate_user_metrics function
DROP FUNCTION IF EXISTS public.calculate_user_metrics(uuid);

CREATE FUNCTION public.calculate_user_metrics(p_user_id uuid) RETURNS json
    SECURITY DEFINER
AS $$
DECLARE
    v_total_hours double precision;
    v_completed_courses integer;
    v_in_progress_courses integer;
    v_average_completion integer;
BEGIN
    -- Validate input
    IF p_user_id IS NULL THEN
        RAISE EXCEPTION 'User ID cannot be null';
    END IF;

    -- Calculate total hours
    SELECT COALESCE(SUM(duration) / 3600.0, 0)
    INTO v_total_hours
    FROM public.podcast_progress
    WHERE user_id = p_user_id;

    -- Calculate completed courses (progress_percent = 100)
    SELECT COUNT(*)
    INTO v_completed_courses
    FROM public.podcast_progress
    WHERE user_id = p_user_id AND progress_percent = 100;

    -- Calculate in-progress courses (progress_percent > 0 and < 100)
    SELECT COUNT(*)
    INTO v_in_progress_courses
    FROM public.podcast_progress
    WHERE user_id = p_user_id AND progress_percent > 0 AND progress_percent < 100;

    -- Calculate average completion
    SELECT COALESCE(AVG(progress_percent)::integer, 0)
    INTO v_average_completion
    FROM public.podcast_progress
    WHERE user_id = p_user_id;

    -- Update or insert user metrics
    INSERT INTO public.user_metrics (user_id, total_hours, completed_courses, in_progress_courses, average_completion, updated_at)
    VALUES (p_user_id, v_total_hours, v_completed_courses, v_in_progress_courses, v_average_completion, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_hours = EXCLUDED.total_hours,
        completed_courses = EXCLUDED.completed_courses,
        in_progress_courses = EXCLUDED.in_progress_courses,
        average_completion = EXCLUDED.average_completion,
        updated_at = now();

    -- Return JSON result
    RETURN json_build_object(
        'status', 'success',
        'user_id', p_user_id,
        'total_hours', v_total_hours,
        'completed_courses', v_completed_courses,
        'in_progress_courses', v_in_progress_courses,
        'average_completion', v_average_completion
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
GRANT EXECUTE ON FUNCTION public.calculate_user_metrics(uuid) TO authenticated, service_role;

-- 6. Create update_user_metrics_from_progress trigger function
CREATE OR REPLACE FUNCTION public.update_user_metrics_from_progress() RETURNS trigger
    SECURITY DEFINER
AS $$
BEGIN
    PERFORM public.calculate_user_metrics(NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_metrics_from_progress() TO authenticated, service_role;

-- 7. Create trigger on podcast_progress
DROP TRIGGER IF EXISTS update_user_metrics_trigger ON public.podcast_progress;
CREATE TRIGGER update_user_metrics_trigger
    AFTER INSERT OR UPDATE ON public.podcast_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.update_user_metrics_from_progress();

-- 8. Create notify_progress_change function
CREATE OR REPLACE FUNCTION public.notify_progress_change() RETURNS trigger
    SECURITY DEFINER
AS $$
BEGIN
    PERFORM pg_notify('podcast_progress_channel', json_build_object(
        'user_id', NEW.user_id,
        'podcast_id', NEW.podcast_id,
        'progress_percent', NEW.progress_percent
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.notify_progress_change() TO authenticated, service_role;

-- 9. Create trigger for notifications
DROP TRIGGER IF EXISTS notify_progress_trigger ON public.podcast_progress;
CREATE TRIGGER notify_progress_trigger
    AFTER INSERT OR UPDATE ON public.podcast_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_progress_change();

-- 10. Create create_or_update_user_metrics function
CREATE OR REPLACE FUNCTION public.create_or_update_user_metrics(p_user_id uuid) RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    RETURN public.calculate_user_metrics(p_user_id);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_or_update_user_metrics(uuid) TO authenticated, service_role;

-- 11. Create get_user_metrics function
CREATE OR REPLACE FUNCTION public.get_user_metrics(p_user_id uuid) RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate permissions
    IF auth.uid() != p_user_id AND
       NOT EXISTS (
           SELECT 1 FROM auth.users 
           WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin'
       ) AND
       NOT EXISTS (
           SELECT 1 FROM company_admins 
           WHERE user_id = auth.uid() AND company_id = (
               SELECT company_id FROM company_users WHERE user_id = p_user_id
           )
       )
    THEN
        RAISE EXCEPTION 'Unauthorized access to user metrics';
    END IF;

    -- Return user metrics
    RETURN (
        SELECT json_build_object(
            'user_id', user_id,
            'total_hours', total_hours,
            'completed_courses', completed_courses,
            'in_progress_courses', in_progress_courses,
            'average_completion', average_completion,
            'updated_at', updated_at
        )
        FROM public.user_metrics
        WHERE user_id = p_user_id
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
GRANT EXECUTE ON FUNCTION public.get_user_metrics(uuid) TO authenticated, service_role;

-- 12. Create list_all_user_metrics function
CREATE OR REPLACE FUNCTION public.list_all_user_metrics() RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate super admin role
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Super admin access required';
    END IF;

    -- Return all user metrics
    RETURN (
        SELECT json_agg(
            json_build_object(
                'user_id', user_id,
                'total_hours', total_hours,
                'completed_courses', completed_courses,
                'in_progress_courses', in_progress_courses,
                'average_completion', average_completion,
                'updated_at', updated_at
            )
        )
        FROM public.user_metrics
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
GRANT EXECUTE ON FUNCTION public.list_all_user_metrics() TO authenticated, service_role;

-- 13. Create list_company_user_metrics function
CREATE OR REPLACE FUNCTION public.list_company_user_metrics(p_company_id uuid) RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate admin role for company
    IF NOT EXISTS (
        SELECT 1 FROM company_admins WHERE user_id = auth.uid() AND company_id = p_company_id
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access for company required';
    END IF;

    -- Return user metrics for company
    RETURN (
        SELECT json_agg(
            json_build_object(
                'user_id', um.user_id,
                'total_hours', um.total_hours,
                'completed_courses', um.completed_courses,
                'in_progress_courses', um.in_progress_courses,
                'average_completion', um.average_completion,
                'updated_at', um.updated_at
            )
        )
        FROM public.user_metrics um
        JOIN company_users cu ON um.user_id = cu.user_id
        WHERE cu.company_id = p_company_id
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
GRANT EXECUTE ON FUNCTION public.list_company_user_metrics(uuid) TO authenticated, service_role;

-- 14. Create get_admin_user_metrics function
CREATE OR REPLACE FUNCTION public.get_admin_user_metrics() RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Get company ID for current admin
    RETURN public.list_company_user_metrics(
        (SELECT company_id FROM company_admins WHERE user_id = auth.uid())
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
GRANT EXECUTE ON FUNCTION public.get_admin_user_metrics() TO authenticated, service_role;

-- 15. Create get_user_podcast_progress function
CREATE OR REPLACE FUNCTION public.get_user_podcast_progress(p_user_id uuid) RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate permissions
    IF auth.uid() != p_user_id AND
       NOT EXISTS (
           SELECT 1 FROM auth.users 
           WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin'
       ) AND
       NOT EXISTS (
           SELECT 1 FROM company_admins 
           WHERE user_id = auth.uid() AND company_id = (
               SELECT company_id FROM company_users WHERE user_id = p_user_id
           )
       )
    THEN
        RAISE EXCEPTION 'Unauthorized access to podcast progress';
    END IF;

    -- Return podcast progress
    RETURN (
        SELECT json_agg(
            json_build_object(
                'user_id', user_id,
                'podcast_id', podcast_id,
                'playback_position', playback_position,
                'duration', duration,
                'progress_percent', progress_percent,
                'updated_at', updated_at
            )
        )
        FROM public.podcast_progress
        WHERE user_id = p_user_id
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
GRANT EXECUTE ON FUNCTION public.get_user_podcast_progress(uuid) TO authenticated, service_role;

-- 16. Create get_all_podcast_progress function
CREATE OR REPLACE FUNCTION public.get_all_podcast_progress() RETURNS json
    SECURITY DEFINER
AS $$
BEGIN
    -- Validate super admin role
    IF NOT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'super_admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Super admin access required';
    END IF;

    -- Return all podcast progress
    RETURN (
        SELECT json_agg(
            json_build_object(
                'user_id', user_id,
                'podcast_id', podcast_id,
                'playback_position', playback_position,
                'duration', duration,
                'progress_percent', progress_percent,
                'updated_at', updated_at
            )
        )
        FROM public.podcast_progress
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
GRANT EXECUTE ON FUNCTION public.get_all_podcast_progress() TO authenticated, service_role;

COMMIT;