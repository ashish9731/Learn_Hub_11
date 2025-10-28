/*
  # Add assigned_by column to user_courses table

  1. Changes
    - Add `assigned_by` column to `user_courses` table
    - Add foreign key constraint to reference users table
    - Add `due_date` column for assignment deadlines

  2. Security
    - No changes to RLS policies needed
*/

-- Add assigned_by column to track who assigned the course
ALTER TABLE user_courses 
ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES users(id) ON DELETE SET NULL;

-- Add due_date column for assignment deadlines
ALTER TABLE user_courses 
ADD COLUMN IF NOT EXISTS due_date timestamptz;

-- Add index for better performance on assigned_by queries
CREATE INDEX IF NOT EXISTS idx_user_courses_assigned_by ON user_courses(assigned_by);