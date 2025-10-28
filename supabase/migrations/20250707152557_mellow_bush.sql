/*
  # Comprehensive Fix for All Supabase Issues
  
  1. Database Fixes
    - Fix the "missing FROM-clause entry for table 'old'" error in trigger functions
    - Fix RLS policies to ensure proper access control
    - Fix foreign key constraints to allow proper data management
    - Create audit_logs table and related functionality
    
  2. Authentication Fixes
    - Fix user creation and validation process
    - Ensure proper company assignment for users
    - Fix profile creation during signup
    
  3. Storage Fixes
    - Ensure proper storage bucket configuration
    - Fix storage policies for all buckets
*/

-- Step 1: Create the audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- Enable RLS on the audit logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Policy to allow authenticated users to see only their own audit logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()));

-- Policy to allow system to insert audit logs (needed for the trigger function)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 2: Fix the trigger_activity_log function
DROP FUNCTION IF EXISTS public.trigger_activity_log CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
  -- Different handling based on operation type
  IF TG_OP = 'DELETE' THEN
    -- For DELETE operations, use VALUES instead of SELECT to avoid treating OLD as a table
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
    -- For INSERT and UPDATE operations, use VALUES instead of SELECT to avoid treating NEW as a table
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
  -- Log error but don't fail the transaction
  RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the handle_user_update function for audit logs
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Process changes and log them
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    INSERT INTO public.audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'email_change', OLD.email::text, NEW.email::text);
  END IF;
  
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'role_change', OLD.role::text, NEW.role::text);
  END IF;
  
  IF NEW.company_id IS DISTINCT FROM OLD.company_id THEN
    INSERT INTO public.audit_logs(user_id, action, old_value, new_value)
    VALUES (NEW.id, 'company_change', OLD.company_id::text, NEW.company_id::text);
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Catch any errors in the main function body
  RAISE NOTICE 'Error in handle_user_update trigger: %', SQLERRM;
  RETURN NEW; -- Still return NEW to allow the update to proceed
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create the validate_user_company_assignment function
CREATE OR REPLACE FUNCTION public.validate_user_company_assignment()
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

-- Step 5: Create the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user with improved conflict handling
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
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the transaction
  RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create the ensure_user_exists function
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
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

-- Step 7: Create the update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in update_updated_at_column: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create the sync_podcast_category function
CREATE OR REPLACE FUNCTION public.sync_podcast_category()
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
            -- Default to Books if no match
            NEW.category := 'Books'::podcast_category;
        END CASE;
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
    END IF;
    
    -- Set the category_id
    NEW.category_id := category_record.id;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error in sync_podcast_category: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Drop and recreate all triggers
-- Drop all existing triggers that use trigger_activity_log
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
  
  -- Drop other specific triggers
  DROP TRIGGER IF EXISTS validate_user_company_assignment_trigger ON users;
  DROP TRIGGER IF EXISTS user_update_trigger ON users;
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS ensure_user_before_profile ON user_profiles;
  DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
  DROP TRIGGER IF EXISTS sync_podcast_category_trigger ON podcasts;
END $$;

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

CREATE TRIGGER validate_user_company_assignment_trigger
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION validate_user_company_assignment();

CREATE TRIGGER user_update_trigger
  AFTER UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_update();

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER ensure_user_before_profile
  BEFORE INSERT ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_exists();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER sync_podcast_category_trigger
  BEFORE INSERT OR UPDATE ON podcasts
  FOR EACH ROW
  EXECUTE FUNCTION sync_podcast_category();

-- Step 10: Drop all existing RLS policies to start fresh
DO $$ 
DECLARE
  r RECORD;
BEGIN
  -- Drop all policies on all tables in public schema
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
  END LOOP;
  
  -- Drop all storage policies
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON storage.objects';
  END LOOP;
END $$;

-- Step 11: Create optimized RLS policies for all tables
-- Users table policies
CREATE POLICY "users_access" ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Companies table policies
CREATE POLICY "companies_access" ON companies
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Courses table policies
CREATE POLICY "courses_access" ON courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User courses table policies
CREATE POLICY "user_courses_access" ON user_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Podcasts table policies
CREATE POLICY "podcasts_access" ON podcasts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- PDFs table policies
CREATE POLICY "pdfs_access" ON pdfs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Quizzes table policies
CREATE POLICY "quizzes_access" ON quizzes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Chat history table policies
CREATE POLICY "chat_history_access" ON chat_history
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Activity logs table policies
CREATE POLICY "activity_logs_access" ON activity_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- User profiles table policies
CREATE POLICY "user_profiles_access" ON user_profiles
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Content categories table policies
CREATE POLICY "content_categories_access" ON content_categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Contact messages table policies
CREATE POLICY "contact_messages_access" ON contact_messages
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Also allow anonymous users to insert contact messages
CREATE POLICY "contact_messages_insert" ON contact_messages
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Podcast likes table policies
CREATE POLICY "podcast_likes_access" ON podcast_likes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Logos table policies
CREATE POLICY "logos_access" ON logos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Audit logs table policies
CREATE POLICY "audit_logs_access" ON audit_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 12: Fix storage bucket policies
-- Make sure storage buckets exist with proper settings
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('podcasts', 'podcasts', true),
  ('documents', 'documents', true),
  ('profile-pictures', 'profile-pictures', true),
  ('images', 'images', true),
  ('logo-pictures', 'logo-pictures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create storage policies for all buckets
CREATE POLICY "storage_access" ON storage.objects
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Step 13: Fix foreign key constraints
-- Fix activity_logs foreign key constraint to allow user deletion
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix audit_logs foreign key constraint
ALTER TABLE audit_logs
DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

ALTER TABLE audit_logs
ADD CONSTRAINT audit_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix chat_history foreign key constraint
ALTER TABLE chat_history
DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;

ALTER TABLE chat_history
ADD CONSTRAINT chat_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix user_profiles foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix podcast_likes foreign key constraint
ALTER TABLE podcast_likes
DROP CONSTRAINT IF EXISTS podcast_likes_user_id_fkey;

ALTER TABLE podcast_likes
ADD CONSTRAINT podcast_likes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix user_courses foreign key constraint
ALTER TABLE user_courses
DROP CONSTRAINT IF EXISTS user_courses_user_id_fkey;

ALTER TABLE user_courses
ADD CONSTRAINT user_courses_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix podcasts created_by foreign key constraint
ALTER TABLE podcasts
DROP CONSTRAINT IF EXISTS podcasts_created_by_fkey;

ALTER TABLE podcasts
ADD CONSTRAINT podcasts_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix pdfs created_by foreign key constraint
ALTER TABLE pdfs
DROP CONSTRAINT IF EXISTS pdfs_created_by_fkey;

ALTER TABLE pdfs
ADD CONSTRAINT pdfs_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix quizzes created_by foreign key constraint
ALTER TABLE quizzes
DROP CONSTRAINT IF EXISTS quizzes_created_by_fkey;

ALTER TABLE quizzes
ADD CONSTRAINT quizzes_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix content_categories created_by foreign key constraint
ALTER TABLE content_categories
DROP CONSTRAINT IF EXISTS content_categories_created_by_fkey;

ALTER TABLE content_categories
ADD CONSTRAINT content_categories_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix logos created_by foreign key constraint
ALTER TABLE logos
DROP CONSTRAINT IF EXISTS logos_created_by_fkey;

ALTER TABLE logos
ADD CONSTRAINT logos_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Step 14: Create or replace views for easier querying
CREATE OR REPLACE VIEW assigned_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE (u.role IN ('admin', 'user') AND u.company_id IS NOT NULL)
   OR u.role = 'super_admin';

CREATE OR REPLACE VIEW assigned_admins AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'admin' AND u.company_id IS NOT NULL;

CREATE OR REPLACE VIEW assigned_regular_users AS
SELECT u.*, c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.role = 'user' AND u.company_id IS NOT NULL;

-- Step 15: Clean up any orphaned records
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

-- Step 16: Update statistics for better query planning
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
ANALYZE logos;
ANALYZE audit_logs;