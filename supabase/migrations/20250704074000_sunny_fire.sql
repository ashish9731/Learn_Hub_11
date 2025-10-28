/*
  # Fix Duplicate Users and Profile Creation Issues

  1. Database Fixes
    - Remove duplicate users in the database
    - Fix user profile creation issues
    - Ensure proper foreign key relationships
    - Update super admin credentials

  2. Changes
    - Identify and remove duplicate user entries
    - Fix user_profiles foreign key constraints
    - Update super admin email to use admin@example.com
    - Add function to ensure user exists before profile creation
*/

-- Identify and remove duplicate users, keeping the one with the most relationships
DO $$
DECLARE
    r RECORD;
    duplicate_count INT;
BEGIN
    -- Find emails with multiple user records
    FOR r IN (
        SELECT email, COUNT(*) as count
        FROM users
        GROUP BY email
        HAVING COUNT(*) > 1
    ) LOOP
        RAISE NOTICE 'Found % duplicate entries for email: %', r.count, r.email;
        
        -- Keep the user with the most relationships and delete others
        WITH ranked_users AS (
            SELECT 
                id,
                email,
                ROW_NUMBER() OVER (
                    PARTITION BY email 
                    ORDER BY 
                        -- Count relationships to determine which record to keep
                        (SELECT COUNT(*) FROM user_courses WHERE user_id = users.id) +
                        (SELECT COUNT(*) FROM user_profiles WHERE user_id = users.id) +
                        (SELECT COUNT(*) FROM chat_history WHERE user_id = users.id) +
                        (SELECT COUNT(*) FROM activity_logs WHERE user_id = users.id) DESC,
                        -- If tie, keep the oldest record
                        created_at ASC
                ) as rn
            FROM users
            WHERE email = r.email
        )
        DELETE FROM users
        WHERE id IN (
            SELECT id FROM ranked_users WHERE rn > 1
        );
        
        GET DIAGNOSTICS duplicate_count = ROW_COUNT;
        RAISE NOTICE 'Deleted % duplicate users for email: %', duplicate_count, r.email;
    END LOOP;
END $$;

-- Update super admin email if needed
UPDATE users
SET email = 'admin@example.com'
WHERE role = 'super_admin' AND email = 'ankur@c2x.co.in';

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
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure user exists before profile creation
DROP TRIGGER IF EXISTS ensure_user_before_profile ON user_profiles;
CREATE TRIGGER ensure_user_before_profile
    BEFORE INSERT ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

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