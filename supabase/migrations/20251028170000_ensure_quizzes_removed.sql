/*
  # Ensure quizzes table is completely removed

  This migration ensures that the quizzes table and all related components 
  are completely removed from the database, even if previous migrations 
  didn't fully complete.
*/

-- Disable RLS temporarily to avoid conflicts
ALTER TABLE IF EXISTS quizzes DISABLE ROW LEVEL SECURITY;

-- Drop all policies related to quizzes (if they still exist)
DROP POLICY IF EXISTS super_admin_quizzes ON quizzes;
DROP POLICY IF EXISTS admin_quizzes ON quizzes;
DROP POLICY IF EXISTS user_quizzes ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin ON quizzes;
DROP POLICY IF EXISTS quizzes_read_all ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin_role ON quizzes;
DROP POLICY IF EXISTS quizzes_super_admin_access ON quizzes;

-- Drop the quizzes table and all dependent objects
DROP TABLE IF EXISTS quizzes CASCADE;

-- Remove any triggers related to quizzes (if they exist)
DROP TRIGGER IF EXISTS log_quizzes ON activity_logs;
DROP TRIGGER IF EXISTS log_quizzes ON quizzes;

-- Remove quizzes from the activity log trigger function
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
    WHEN 'podcast_progress' THEN
      entity_type := 'podcast_progress';
      entity_id := NEW.id;
    WHEN 'podcast_assignments' THEN
      entity_type := 'podcast_assignment';
      entity_id := NEW.id;
    WHEN 'temp_passwords' THEN
      entity_type := 'temp_password';
      entity_id := NEW.id;
    WHEN 'user_registrations' THEN
      entity_type := 'user_registration';
      entity_id := NEW.id;
    WHEN 'approval_logs' THEN
      entity_type := 'approval_log';
      entity_id := NEW.id;
    WHEN 'audit_logs' THEN
      entity_type := 'audit_log';
      entity_id := NEW.id;
    WHEN 'contact_messages' THEN
      entity_type := 'contact_message';
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

-- Update statistics for better query planning
ANALYZE activity_logs;

-- Refresh the database statistics
ANALYZE;