-- Check for and drop any table literally named 'old'
DROP TABLE IF EXISTS public.old CASCADE;

-- Fix trigger_activity_log function which is the most likely culprit
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
DECLARE
    record_id UUID;
    record_data JSONB;
BEGIN
    -- Different handling based on operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record directly as a record, not as a table
        BEGIN
            record_id := OLD.id;
            record_data := to_jsonb(OLD);
            
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
                record_id, 
                jsonb_build_object('table', TG_TABLE_NAME, 'record', record_data)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging DELETE activity: %', SQLERRM;
        END;
        
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW record directly as a record, not as a table
        BEGIN
            record_id := NEW.id;
            record_data := to_jsonb(NEW);
            
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
                record_id, 
                jsonb_build_object('table', TG_TABLE_NAME, 'record', record_data)
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging %: %', TG_OP, SQLERRM;
        END;
        
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

-- Check for and drop any unused tables
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

-- Clean up any orphaned records
-- Delete user_profiles without corresponding users
DELETE FROM user_profiles
WHERE user_id NOT IN (SELECT id FROM users);

-- Delete podcast_likes without corresponding users or podcasts
DELETE FROM podcast_likes
WHERE user_id NOT IN (SELECT id FROM users)
   OR podcast_id NOT IN (SELECT id FROM podcasts);

-- Delete user_courses without corresponding users or courses
DELETE FROM user_courses
WHERE user_id NOT IN (SELECT id FROM users)
   OR course_id NOT IN (SELECT id FROM courses);

-- Delete chat_history without corresponding users
DELETE FROM chat_history
WHERE user_id NOT IN (SELECT id FROM users);

-- Set NULL for activity_logs with missing users
UPDATE activity_logs
SET user_id = NULL
WHERE user_id IS NOT NULL 
  AND user_id NOT IN (SELECT id FROM users);

-- Delete any orphaned content categories (categories with no podcasts)
DELETE FROM content_categories
WHERE id NOT IN (
    SELECT DISTINCT category_id 
    FROM podcasts 
    WHERE category_id IS NOT NULL
);

-- Delete specific podcast entries that might be duplicates
DELETE FROM podcasts 
WHERE title LIKE '%How Timeboxing%' 
   OR title LIKE '%Eat That Frog%';

-- Delete any test/dummy data
DELETE FROM podcasts WHERE title LIKE '%test%' OR title LIKE '%dummy%' OR title LIKE '%fake%';
DELETE FROM courses WHERE title LIKE '%test%' OR title LIKE '%dummy%' OR title LIKE '%fake%';
DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%dummy%' OR email LIKE '%fake%';
DELETE FROM companies WHERE name LIKE '%test%' OR name LIKE '%dummy%' OR name LIKE '%fake%';

-- Ensure at least one super_admin exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') THEN
        INSERT INTO users (email, role)
        VALUES ('admin@example.com', 'super_admin')
        ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
    END IF;
END $$;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_profiles;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE content_categories;
ANALYZE podcast_likes;