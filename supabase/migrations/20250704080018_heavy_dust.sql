/*
  # Fix Duplicate Key Constraint in Users Table

  1. Problem
    - Duplicate key violations in users table
    - Orphaned profiles without corresponding users
    - Foreign key constraint violations

  2. Solution
    - Remove duplicate users
    - Fix orphaned profiles
    - Improve user creation process
    - Add proper error handling
*/

-- First, identify and remove any duplicate users by ID
DO $$
DECLARE
    r RECORD;
    duplicate_count INT;
BEGIN
    -- Find IDs with multiple user records (should not happen, but checking anyway)
    FOR r IN (
        SELECT id, COUNT(*) as count
        FROM users
        GROUP BY id
        HAVING COUNT(*) > 1
    ) LOOP
        RAISE NOTICE 'Found % duplicate entries for ID: %', r.count, r.id;
        
        -- Keep one record and delete others
        WITH ranked_users AS (
            SELECT 
                id,
                email,
                ROW_NUMBER() OVER (
                    PARTITION BY id 
                    ORDER BY created_at ASC
                ) as rn
            FROM users
            WHERE id = r.id
        )
        DELETE FROM users
        WHERE id IN (
            SELECT id FROM ranked_users WHERE rn > 1
        );
        
        GET DIAGNOSTICS duplicate_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % duplicate users for ID: %', duplicate_count, r.id;
    END LOOP;
END $$;

-- Fix any orphaned profiles by creating missing users
DO $$
DECLARE
    r RECORD;
    user_email text;
BEGIN
    -- Find profiles without corresponding users
    FOR r IN (
        SELECT up.user_id
        FROM user_profiles up
        LEFT JOIN users u ON up.user_id = u.id
        WHERE u.id IS NULL
    ) LOOP
        -- Try to get email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = r.user_id;
        
        IF user_email IS NOT NULL THEN
            -- Create the missing user
            BEGIN
                INSERT INTO users (id, email, role)
                VALUES (r.user_id, user_email, 'user');
                
                RAISE NOTICE 'Created missing user % with email % for orphaned profile', r.user_id, user_email;
            EXCEPTION WHEN unique_violation THEN
                RAISE NOTICE 'User % already exists (created by another process)', r.user_id;
            END;
        ELSE
            RAISE NOTICE 'Cannot fix orphaned profile: User ID % not found in auth.users', r.user_id;
        END IF;
    END LOOP;
END $$;

-- Create a function to handle user creation with proper conflict handling
CREATE OR REPLACE FUNCTION create_user_safely(
    p_id UUID,
    p_email TEXT,
    p_role user_role DEFAULT 'user'
)
RETURNS VOID AS $$
BEGIN
    -- First try to insert
    BEGIN
        INSERT INTO users (id, email, role)
        VALUES (p_id, p_email, p_role);
        RETURN;
    EXCEPTION 
        WHEN unique_violation THEN
            -- If violation is on id, update the record
            BEGIN
                UPDATE users SET email = p_email, role = p_role
                WHERE id = p_id;
                RETURN;
            EXCEPTION WHEN unique_violation THEN
                -- If that fails, try updating by email
                UPDATE users SET id = p_id, role = p_role
                WHERE email = p_email;
                RETURN;
            END;
    END;
EXCEPTION WHEN OTHERS THEN
    -- Final fallback
    RAISE NOTICE 'Error in create_user_safely: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Create a function to ensure user exists before profile creation
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
            -- Insert the user with conflict handling
            PERFORM create_user_safely(NEW.user_id, user_email, 'user');
        ELSE
            RAISE EXCEPTION 'Cannot create user profile: User ID % not found in auth.users', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS ensure_user_before_profile ON user_profiles;
CREATE TRIGGER ensure_user_before_profile
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

-- Update the handle_new_user function to use our safe user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user with conflict handling
    PERFORM create_user_safely(NEW.id, NEW.email, 'user');
    
    -- Create profile
    BEGIN
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
        );
    EXCEPTION WHEN unique_violation THEN
        UPDATE user_profiles SET
            first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', user_profiles.first_name),
            last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', user_profiles.last_name),
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name)
        WHERE user_id = NEW.id;
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_profiles;