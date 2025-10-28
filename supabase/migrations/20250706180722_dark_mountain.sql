/*
  # Fix Foreign Key Constraints for User Deletion

  1. Problem
    - Unable to delete users due to foreign key constraint from activity_logs
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

-- Check and fix other tables that might reference users
DO $$ 
BEGIN
  -- Check if the constraint exists before trying to modify it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'chat_history_user_id_fkey'
  ) THEN
    -- Fix chat_history foreign key
    ALTER TABLE chat_history
    DROP CONSTRAINT chat_history_user_id_fkey;
    
    ALTER TABLE chat_history
    ADD CONSTRAINT chat_history_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;

  -- Check if the constraint exists before trying to modify it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'user_profiles_user_id_fkey'
  ) THEN
    -- Fix user_profiles foreign key
    ALTER TABLE user_profiles
    DROP CONSTRAINT user_profiles_user_id_fkey;
    
    ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;

  -- Check if the constraint exists before trying to modify it
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'podcast_likes_user_id_fkey'
  ) THEN
    -- Fix podcast_likes foreign key
    ALTER TABLE podcast_likes
    DROP CONSTRAINT podcast_likes_user_id_fkey;
    
    ALTER TABLE podcast_likes
    ADD CONSTRAINT podcast_likes_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- Update statistics for better query planning
ANALYZE activity_logs;
ANALYZE users;
ANALYZE chat_history;
ANALYZE user_profiles;
ANALYZE podcast_likes;