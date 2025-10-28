-- Fix the trigger_activity_log function which is causing the "missing FROM-clause entry for table 'old'" error
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
    -- Different handling based on operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use VALUES instead of SELECT to avoid treating OLD as a table
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
        
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use VALUES instead of SELECT to avoid treating NEW as a table
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
        
        RETURN NEW;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate all triggers that use this function to ensure they're using the fixed version
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing triggers that use trigger_activity_log
    FOR r IN (
        SELECT tgname, relname
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_class c ON t.tgrelid = c.oid
        WHERE p.proname = 'trigger_activity_log'
    ) LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.tgname) || ' ON ' || quote_ident(r.relname);
    END LOOP;
    
    -- Recreate all the triggers
    CREATE TRIGGER log_users
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_companies
        AFTER INSERT OR UPDATE OR DELETE ON companies
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_courses
        AFTER INSERT OR UPDATE OR DELETE ON courses
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_user_courses
        AFTER INSERT OR UPDATE OR DELETE ON user_courses
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_podcasts
        AFTER INSERT OR UPDATE OR DELETE ON podcasts
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_pdfs
        AFTER INSERT OR UPDATE OR DELETE ON pdfs
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_quizzes
        AFTER INSERT OR UPDATE OR DELETE ON quizzes
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_chat_history
        AFTER INSERT OR UPDATE OR DELETE ON chat_history
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_user_profiles
        AFTER INSERT OR UPDATE OR DELETE ON user_profiles
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

    CREATE TRIGGER log_logos
        AFTER INSERT OR UPDATE OR DELETE ON logos
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
        
    CREATE TRIGGER log_content_categories
        AFTER INSERT OR UPDATE OR DELETE ON content_categories
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
        
    CREATE TRIGGER log_podcast_likes
        AFTER INSERT OR DELETE ON podcast_likes
        FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
END $$;

-- Drop any table literally named 'old' if it exists
DROP TABLE IF EXISTS public.old CASCADE;

-- Check for and drop any unused tables with suspicious names
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Check for any tables with 'test', 'temp', 'old', 'backup', or 'copy' in the name
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (
            tablename LIKE '%test%' OR 
            tablename LIKE '%temp%' OR 
            tablename LIKE '%old%' OR
            tablename LIKE '%backup%' OR
            tablename LIKE '%copy%'
        )
    ) LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped unused table: %', r.tablename;
    END LOOP;
END $$;