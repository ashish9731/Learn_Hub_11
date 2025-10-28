/*
  # Clean Database and Fix Sync Issues

  1. Database Cleanup
    - Remove any unused or duplicate tables
    - Fix foreign key constraints
    - Ensure proper synchronization between application and database
    - Clean up any orphaned records

  2. Security
    - Ensure proper RLS policies
    - Fix role-based access control
    - Maintain data integrity
*/

-- Check for and drop any unused tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- List of tables that should exist in our schema
    IF EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'old'
    ) THEN
        DROP TABLE public.old CASCADE;
        RAISE NOTICE 'Dropped unused table: old';
    END IF;
    
    -- Check for any other tables with 'test', 'temp', or 'old' in the name
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

-- Fix trigger_activity_log function to properly handle OLD/NEW records
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
DECLARE
    record_id UUID;
    record_data JSONB;
BEGIN
    -- Different handling based on operation type
    IF TG_OP = 'DELETE' THEN
        -- For DELETE operations, use OLD record directly
        record_id := OLD.id;
        record_data := to_jsonb(OLD);
    ELSE
        -- For INSERT and UPDATE operations, use NEW record directly
        record_id := NEW.id;
        record_data := to_jsonb(NEW);
    END IF;

    -- Insert the activity log
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
            record_id, 
            jsonb_build_object('table', TG_TABLE_NAME, 'record', record_data)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error logging activity for %: %', TG_OP, SQLERRM;
    END;

    -- Return the appropriate record based on operation
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix validate_user_company_assignment function to properly handle role validation
CREATE OR REPLACE FUNCTION validate_user_company_assignment()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip validation for super_admin
    IF NEW.role = 'super_admin' THEN
        RETURN NEW;
    END IF;
    
    -- For admin and regular users, ensure they have a company_id
    IF (NEW.role = 'admin' OR NEW.role = 'user') AND NEW.company_id IS NULL THEN
        RAISE EXCEPTION 'User must be assigned to a company';
    END IF;
    
    -- Ensure the company exists
    IF NEW.company_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM companies WHERE id = NEW.company_id
    ) THEN
        RAISE EXCEPTION 'Company with ID % does not exist', NEW.company_id;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in validate_user_company_assignment: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fix handle_new_user function to properly handle user creation during signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user users;
BEGIN
    -- Create user with improved conflict handling
    BEGIN
        INSERT INTO users (id, email, role)
        VALUES (NEW.id, NEW.email, 'user')
        ON CONFLICT (id) DO UPDATE SET 
            email = EXCLUDED.email
        RETURNING * INTO new_user;
        
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
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix ensure_user_exists function to properly handle user creation before profile
CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    user_exists boolean;
    user_email text;
    new_user users;
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
                VALUES (NEW.user_id, user_email, 'user')
                RETURNING * INTO new_user;
                
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

-- Fix sync_podcast_category function to properly handle category synchronization
CREATE OR REPLACE FUNCTION sync_podcast_category()
RETURNS TRIGGER AS $$
DECLARE
    category_record RECORD;
    category_name TEXT;
BEGIN
    -- If category_id is set but category is not, update category from category_id
    IF NEW.category_id IS NOT NULL AND (NEW.category IS NULL OR NEW.category::text = '') THEN
        SELECT name INTO category_record
        FROM content_categories
        WHERE id = NEW.category_id;
        
        IF FOUND THEN
            category_name := category_record.name;
            
            -- Try to convert the category name to the enum type with case handling
            BEGIN
                -- First try direct conversion
                NEW.category := category_name::podcast_category;
                RAISE NOTICE 'Updated category to % based on category_id %', NEW.category, NEW.category_id;
            EXCEPTION WHEN OTHERS THEN
                -- If direct conversion fails, try case-insensitive matching
                CASE LOWER(category_name)
                    WHEN 'books' THEN 
                        NEW.category := 'Books'::podcast_category;
                    WHEN 'hbr' THEN 
                        NEW.category := 'HBR'::podcast_category;
                    WHEN 'ted talks' THEN 
                        NEW.category := 'TED Talks'::podcast_category;
                    WHEN 'concept' THEN 
                        NEW.category := 'Concept'::podcast_category;
                    WHEN 'role play' THEN 
                        NEW.category := 'Role Play'::podcast_category;
                    ELSE
                        -- Try partial matching
                        IF LOWER(category_name) LIKE '%book%' THEN
                            NEW.category := 'Books'::podcast_category;
                        ELSIF LOWER(category_name) LIKE '%hbr%' OR LOWER(category_name) LIKE '%harvard%' THEN
                            NEW.category := 'HBR'::podcast_category;
                        ELSIF LOWER(category_name) LIKE '%ted%' OR LOWER(category_name) LIKE '%talk%' THEN
                            NEW.category := 'TED Talks'::podcast_category;
                        ELSIF LOWER(category_name) LIKE '%concept%' THEN
                            NEW.category := 'Concept'::podcast_category;
                        ELSIF LOWER(category_name) LIKE '%role%' OR LOWER(category_name) LIKE '%play%' THEN
                            NEW.category := 'Role Play'::podcast_category;
                        ELSE
                            -- Default to Books if no match
                            NEW.category := 'Books'::podcast_category;
                            RAISE NOTICE 'Could not match category name %, defaulting to Books', category_name;
                        END IF;
                END CASE;
                
                RAISE NOTICE 'Converted category name % to enum value % for podcast', category_name, NEW.category;
            END;
        END IF;
    -- If category is set but category_id is not, find or create the category
    ELSIF NEW.category IS NOT NULL AND NEW.category_id IS NULL AND NEW.course_id IS NOT NULL THEN
        -- Check if a category with this name exists for this course
        SELECT id, name INTO category_record
        FROM content_categories
        WHERE course_id = NEW.course_id
        AND LOWER(name) = LOWER(NEW.category::text)
        LIMIT 1;
        
        -- If category doesn't exist, create it
        IF NOT FOUND THEN
            INSERT INTO content_categories (name, course_id)
            VALUES (NEW.category::text, NEW.course_id)
            RETURNING id, name INTO category_record;
            
            RAISE NOTICE 'Created new category % for course %', category_record.name, NEW.course_id;
        END IF;
        
        -- Set the category_id
        NEW.category_id := category_record.id;
        RAISE NOTICE 'Updated category_id to % based on category %', NEW.category_id, NEW.category;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in sync_podcast_category: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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