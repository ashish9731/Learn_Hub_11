/*
  # Fix Foreign Key Constraint for User Deletion

  1. Problem
    - Unable to delete users due to foreign key constraint from activity_logs table
    - Error message: "Unable to delete rows as one of them is currently referenced by a foreign key constraint from the table 'activity_logs'"
    - Need to modify the constraint to allow user deletion

  2. Solution
    - Add ON DELETE SET NULL to the activity_logs_user_id_fkey constraint
    - This allows users to be deleted while preserving activity logs
    - Activity logs will have NULL user_id when the referenced user is deleted
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