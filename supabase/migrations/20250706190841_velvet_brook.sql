/*
  # Fix Foreign Key Constraints for User Deletion

  1. Problem
    - Unable to delete users due to foreign key constraint from activity_logs table
    - Error: "Unable to delete rows as one of them is currently referenced by a foreign key constraint from the table 'activity_logs'"
    - Need to modify the constraint to allow user deletion

  2. Solution
    - Drop the existing foreign key constraint on activity_logs.user_id
    - Recreate it with ON DELETE SET NULL behavior
    - This allows users to be deleted while preserving activity logs with NULL user_id
*/

-- Drop the existing constraint
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

-- Recreate the constraint with ON DELETE SET NULL
ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update statistics
ANALYZE activity_logs;
ANALYZE users;