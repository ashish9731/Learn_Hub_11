/*
  # Clean User Courses Assignment

  This migration ensures the user_courses table has proper structure
  for course assignments without any pg_net conflicts.

  ## Changes Made:
  - Ensure assigned_by and due_date columns exist
  - Add proper foreign key constraints
  - Add performance indexes
  - Set up RLS policies
  - Remove any conflicting triggers or functions
*/

-- Step 1: Ensure user_courses table has required columns
DO $$
BEGIN
  -- Add assigned_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_courses' AND column_name = 'assigned_by'
  ) THEN
    ALTER TABLE user_courses ADD COLUMN assigned_by uuid;
  END IF;

  -- Add due_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_courses' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE user_courses ADD COLUMN due_date timestamptz;
  END IF;
END $$;

-- Step 2: Add foreign key constraint for assigned_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_courses_assigned_by_fkey'
  ) THEN
    ALTER TABLE user_courses 
    ADD CONSTRAINT user_courses_assigned_by_fkey 
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Add index for assigned_by if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_user_courses_assigned_by'
  ) THEN
    CREATE INDEX idx_user_courses_assigned_by ON user_courses(assigned_by);
  END IF;
END $$;

-- Step 4: Ensure RLS is enabled
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;

-- Step 5: Clean up any problematic triggers that might use pg_net incorrectly
-- Remove any triggers that might be causing the pg_net conflict
DROP TRIGGER IF EXISTS course_assignment_notification_trigger ON user_courses;
DROP TRIGGER IF EXISTS notify_course_assignment_trigger ON user_courses;

-- Step 6: Create a simple, safe trigger for course assignments
-- This trigger will NOT use pg_net to avoid conflicts
CREATE OR REPLACE FUNCTION handle_course_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Simple logging without external HTTP calls
  INSERT INTO activity_logs (
    user_id,
    action,
    entity_type,
    entity_id,
    details,
    created_at
  ) VALUES (
    NEW.user_id,
    'course_assigned',
    'user_courses',
    NEW.course_id,
    jsonb_build_object(
      'assigned_by', NEW.assigned_by,
      'due_date', NEW.due_date,
      'assigned_at', NEW.assigned_at
    ),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
CREATE TRIGGER course_assignment_log_trigger
  AFTER INSERT ON user_courses
  FOR EACH ROW
  EXECUTE FUNCTION handle_course_assignment();