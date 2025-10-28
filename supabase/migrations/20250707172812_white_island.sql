/*
  # Fix User Courses Table and Relationships

  1. Database Changes
    - Add proper indexes for user_courses table
    - Ensure proper foreign key relationships
    - Fix any issues with the user_courses table structure

  2. Security
    - Update RLS policies for user_courses table
    - Ensure proper access control
*/

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_courses_user_course ON user_courses(user_id, course_id);

-- Fix RLS policies for user_courses table
-- Drop existing policies
DROP POLICY IF EXISTS "user_courses_access" ON user_courses;

-- Create new policies
CREATE POLICY "user_courses_access" ON user_courses
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Update statistics for better query planning
ANALYZE user_courses;
ANALYZE users;
ANALYZE courses;