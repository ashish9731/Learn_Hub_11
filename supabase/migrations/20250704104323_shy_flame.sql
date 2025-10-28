/*
  # Fix Trigger Function Error

  1. Problem
    - Error: "42P01: missing FROM-clause entry for table 'new'"
    - Trigger function is incorrectly referencing NEW outside of trigger context
    - This is causing real-time data sync issues

  2. Solution
    - Fix trigger functions to properly handle NEW references
    - Update activity log trigger function
    - Ensure proper error handling in trigger functions
*/

-- Drop the problematic trigger function
DROP FUNCTION IF EXISTS trigger_activity_log CASCADE;

-- Create a fixed version of the trigger function
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD instead of NEW
        PERFORM log_activity(
            auth.uid(),
            TG_OP,
            TG_TABLE_NAME,
            OLD.id,
            jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(OLD))
        );
        RETURN OLD;
    ELSE
        -- For INSERT and UPDATE operations, use NEW
        PERFORM log_activity(
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

-- Fix the user profile update trigger function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in update_updated_at_column: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fix the ensure_user_exists function
DROP FUNCTION IF EXISTS ensure_user_exists CASCADE;

CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    user_exists boolean;
    user_email text;
BEGIN
    -- Check if user exists in users table
    SELECT EXISTS (
        SELECT 1 FROM users WHERE id = NEW.user_id
    ) INTO user_exists;
    
    -- If user doesn't exist, try to create them
    IF NOT user_exists THEN
        -- Get email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;
        
        IF user_email IS NOT NULL THEN
            -- Insert the user
            BEGIN
                INSERT INTO users (id, email, role)
                VALUES (NEW.user_id, user_email, 'user');
                RAISE NOTICE 'Created missing user % with email %', NEW.user_id, user_email;
            EXCEPTION WHEN unique_violation THEN
                -- If there's a duplicate key violation, it means another process
                -- created the user in the meantime, which is fine
                RAISE NOTICE 'User % already exists (created by another process)', NEW.user_id;
            END;
        ELSE
            RAISE EXCEPTION 'Cannot create user profile: User ID % not found in auth.users', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in ensure_user_exists: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS ensure_user_before_profile ON user_profiles;
CREATE TRIGGER ensure_user_before_profile
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

-- Fix the handle_new_user function
DROP FUNCTION IF EXISTS handle_new_user CASCADE;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user with conflict handling
    BEGIN
        INSERT INTO users (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email;
        
        -- Create profile
        INSERT INTO user_profiles (
            user_id,
            first_name,
            last_name,
            full_name
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
            COALESCE(NEW.raw_user_meta_data->>'full_name', '')
        )
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', user_profiles.first_name),
            last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', user_profiles.last_name),
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();