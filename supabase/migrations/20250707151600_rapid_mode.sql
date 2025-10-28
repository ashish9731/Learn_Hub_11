-- Drop the existing trigger_activity_log function to ensure no stale version remains
DROP FUNCTION IF EXISTS public.trigger_activity_log CASCADE;

-- Create the corrected trigger_activity_log function
CREATE OR REPLACE FUNCTION public.trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    BEGIN
      INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        OLD.id,
        jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(OLD))
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error logging DELETE activity: %', SQLERRM;
    END;
    RETURN OLD;
  ELSE
    BEGIN
      INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        details
      )
      VALUES (
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error logging % activity: %', TG_OP, SQLERRM;
    END;
    RETURN NEW;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop all existing triggers that use trigger_activity_log to ensure they use the updated function
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tgname, relname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE p.proname = 'trigger_activity_log'
  ) LOOP
    EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON ' || quote_ident(r.relname);
  END LOOP;
END $$;

-- Recreate triggers for all relevant tables
CREATE TRIGGER log_users
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_companies
  AFTER INSERT OR UPDATE OR DELETE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_courses
  AFTER INSERT OR UPDATE OR DELETE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_user_courses
  AFTER INSERT OR UPDATE OR DELETE ON public.user_courses
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_podcasts
  AFTER INSERT OR UPDATE OR DELETE ON public.podcasts
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_pdfs
  AFTER INSERT OR UPDATE OR DELETE ON public.pdfs
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_quizzes
  AFTER INSERT OR UPDATE OR DELETE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_chat_history
  AFTER INSERT OR UPDATE OR DELETE ON public.chat_history
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_logos
  AFTER INSERT OR UPDATE OR DELETE ON public.logos
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_content_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.content_categories
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_podcast_likes
  AFTER INSERT OR DELETE ON public.podcast_likes
  FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

-- Drop any table literally named 'old' to prevent confusion
DROP TABLE IF EXISTS public.old CASCADE;

-- Update the users_update_own policy (unchanged, as it doesn't reference OLD)
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND policyname = 'users_update_own'
  ) INTO policy_exists;

  IF policy_exists THEN
    DROP POLICY users_update_own ON public.users;
  END IF;

  CREATE POLICY users_update_own ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;

-- Update the validate_user_company_assignment function (unchanged, as it doesn't reference OLD)
CREATE OR REPLACE FUNCTION public.validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    RETURN NEW;
  END IF;

  IF (NEW.role = 'admin' OR NEW.role = 'user') AND NEW.company_id IS NULL THEN
    RAISE EXCEPTION 'User must be assigned to a company';
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in validate_user_company_assignment: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update statistics for better query planning
ANALYZE public.users;
ANALYZE public.user_profiles;
ANALYZE public.companies;
ANALYZE public.courses;
ANALYZE public.user_courses;
ANALYZE public.podcasts;
ANALYZE public.pdfs;
ANALYZE public.quizzes;
ANALYZE public.chat_history;
ANALYZE public.activity_logs;
ANALYZE public.content_categories;
ANALYZE public.podcast_likes;