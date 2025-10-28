/*
  # Add Cascade Delete to Foreign Keys

  1. Database Changes
    - Add ON DELETE CASCADE to foreign key constraints
    - Ensure proper deletion of related records when a parent record is deleted
    - Fix foreign key constraints to prevent orphaned records

  2. Security
    - Maintain existing RLS policies
    - Ensure proper access control
*/

-- Add ON DELETE CASCADE to foreign key constraints for podcasts
ALTER TABLE podcasts
DROP CONSTRAINT IF EXISTS podcasts_course_id_fkey,
ADD CONSTRAINT podcasts_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES courses(id)
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to foreign key constraints for pdfs
ALTER TABLE pdfs
DROP CONSTRAINT IF EXISTS pdfs_course_id_fkey,
ADD CONSTRAINT pdfs_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES courses(id)
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to foreign key constraints for quizzes
ALTER TABLE quizzes
DROP CONSTRAINT IF EXISTS quizzes_course_id_fkey,
ADD CONSTRAINT quizzes_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES courses(id)
  ON DELETE CASCADE;

-- Add ON DELETE CASCADE to foreign key constraints for user_courses
ALTER TABLE user_courses
DROP CONSTRAINT IF EXISTS user_courses_course_id_fkey,
ADD CONSTRAINT user_courses_course_id_fkey
  FOREIGN KEY (course_id)
  REFERENCES courses(id)
  ON DELETE CASCADE;

-- Add ON DELETE SET NULL to foreign key constraints for activity_logs
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update statistics
ANALYZE courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE user_courses;
ANALYZE activity_logs;