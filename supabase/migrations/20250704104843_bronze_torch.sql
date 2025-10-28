/*
  # Fix Trigger Function Error

  1. Problem
    - Error: "42P01: missing FROM-clause entry for table 'new'"
    - Trigger function is incorrectly referencing the NEW record
    - This is causing real-time data sync issues

  2. Solution
    - Fix the trigger_activity_log function to properly handle different operation types
    - Ensure proper error handling in all trigger functions
    - Fix any other related trigger functions
*/

-- Drop the problematic trigger function
DROP FUNCTION IF EXISTS trigger_activity_log CASCADE;

-- Create a fixed version of the trigger function
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD instead of NEW
        BEGIN
            PERFORM log_activity(
                auth.uid(),
                TG_OP,
                TG_TABLE_NAME,
                OLD.id,
                jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(OLD))
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging activity for DELETE: %', SQLERRM;
        END;
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW
        BEGIN
            PERFORM log_activity(
                auth.uid(),
                TG_OP,
                TG_TABLE_NAME,
                NEW.id,
                jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Error logging activity for %: %', TG_OP, SQLERRM;
        END;
        RETURN NEW;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recreate all the triggers that use this function
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

-- Fix the log_activity function to handle errors better
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in log_activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;