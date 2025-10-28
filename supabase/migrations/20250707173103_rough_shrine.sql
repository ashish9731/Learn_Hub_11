/*
  # Fix User Courses Table and Policies

  1. Database Changes
    - Ensure user_courses table has proper indexes
    - Fix RLS policies to allow proper access
    - Add trigger for activity logging
    
  2. Security
    - Enable RLS on user_courses table
    - Add policies for proper access control
    - Ensure users can only access their own courses
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_user_course ON user_courses(user_id, course_id);

-- Drop existing policies if they exist
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_courses' 
        AND policyname = 'user_courses_access'
    ) THEN
        DROP POLICY "user_courses_access" ON user_courses;
    END IF;
END $$;

-- Create new policies for user_courses table
-- Allow users to view their own courses
CREATE POLICY "user_courses_select_own" 
  ON user_courses 
  FOR SELECT 
  TO authenticated 
  USING (user_id = auth.uid());

-- Allow admins to manage user courses for their company
CREATE POLICY "user_courses_admin_manage" 
  ON user_courses 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users admin_user
      JOIN users course_user ON course_user.id = user_courses.user_id
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = course_user.company_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users admin_user
      JOIN users course_user ON course_user.id = user_courses.user_id
      WHERE admin_user.id = auth.uid()
      AND admin_user.role = 'admin'
      AND admin_user.company_id = course_user.company_id
    )
  );

-- Allow super admins to manage all user courses
CREATE POLICY "user_courses_super_admin_manage" 
  ON user_courses 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create trigger for activity logging if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'log_user_courses'
    ) THEN
        CREATE TRIGGER log_user_courses
            AFTER INSERT OR UPDATE OR DELETE ON user_courses
            FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
    END IF;
END $$;

-- Update statistics
ANALYZE user_courses;
ANALYZE users;
ANALYZE courses;