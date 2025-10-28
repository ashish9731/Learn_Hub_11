/*
  # Remove quizzes table and related components

  1. Drop Tables
    - Drop `quizzes` table and all related policies
    - Remove quizzes-related RLS policies
    - Remove quizzes-related indexes
    - Remove quizzes-related triggers

  2. Update Related Components
    - Remove quizzes references from activity logs
    - Remove quizzes references from real-time sync
    - Update any views that reference quizzes

  3. Clean Up
    - Remove quizzes-related functions
    - Remove quizzes-related triggers
*/

-- First, disable RLS temporarily
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;

-- Drop all policies related to quizzes
DROP POLICY IF EXISTS super_admin_quizzes ON quizzes;
DROP POLICY IF EXISTS admin_quizzes ON quizzes;
DROP POLICY IF EXISTS user_quizzes ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin ON quizzes;
DROP POLICY IF EXISTS quizzes_read_all ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin_role ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin_access ON quizzes;

-- Drop the quizzes table
DROP TABLE IF EXISTS quizzes CASCADE;

-- Remove any triggers related to quizzes (if they exist)
DROP TRIGGER IF EXISTS log_quizzes ON activity_logs;

-- Update the trigger function to remove quizzes references
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
DECLARE
  entity_type TEXT;
  entity_id UUID;
BEGIN
  -- Determine the entity type and ID based on the table name
  CASE TG_TABLE_NAME
    WHEN 'users' THEN
      entity_type := 'user';
      entity_id := NEW.id;
    WHEN 'companies' THEN
      entity_type := 'company';
      entity_id := NEW.id;
    WHEN 'courses' THEN
      entity_type := 'course';
      entity_id := NEW.id;
    WHEN 'user_courses' THEN
      entity_type := 'user_course';
      entity_id := NEW.id;
    WHEN 'podcasts' THEN
      entity_type := 'podcast';
      entity_id := NEW.id;
    WHEN 'pdfs' THEN
      entity_type := 'pdf';
      entity_id := NEW.id;
    WHEN 'chat_history' THEN
      entity_type := 'chat';
      entity_id := NEW.id;
    WHEN 'activity_logs' THEN
      entity_type := 'activity_log';
      entity_id := NEW.id;
    WHEN 'user_profiles' THEN
      entity_type := 'user_profile';
      entity_id := NEW.id;
    WHEN 'logos' THEN
      entity_type := 'logo';
      entity_id := NEW.id;
    WHEN 'content_categories' THEN
      entity_type := 'category';
      entity_id := NEW.id;
    WHEN 'podcast_likes' THEN
      entity_type := 'podcast_like';
      entity_id := NEW.id;
    ELSE
      entity_type := TG_TABLE_NAME;
      entity_id := NEW.id;
  END CASE;

  -- Insert activity log
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    current_user_id(),
    TG_OP,
    entity_type,
    entity_id,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'new_record', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END,
      'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in trigger_activity_log: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove quizzes from real-time sync in App.tsx (this will be handled in the frontend code)
-- Note: This is just a comment for reference as the actual change will be in the frontend

-- Update statistics for better query planning
ANALYZE activity_logs;