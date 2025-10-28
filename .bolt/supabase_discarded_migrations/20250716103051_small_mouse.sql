BEGIN;

-- Drop any functions that depend on user_metrics
DROP FUNCTION IF EXISTS public.calculate_user_metrics(uuid);
DROP FUNCTION IF EXISTS public.create_or_update_user_metrics(uuid);
DROP FUNCTION IF EXISTS public.get_user_metrics(uuid);
DROP FUNCTION IF EXISTS public.list_all_user_metrics();
DROP FUNCTION IF EXISTS public.list_company_user_metrics(uuid);
DROP FUNCTION IF EXISTS public.get_admin_user_metrics();

-- Drop any triggers that reference user_metrics
DROP TRIGGER IF EXISTS update_user_metrics_trigger ON public.podcast_progress;
DROP FUNCTION IF EXISTS public.update_user_metrics_from_progress();

-- Finally, drop the user_metrics table
DROP TABLE IF EXISTS public.user_metrics;

COMMIT;