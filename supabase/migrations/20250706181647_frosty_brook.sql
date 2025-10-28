/*
  # Fix Foreign Key Constraints for User Deletion

  1. Problem
    - Unable to delete users due to foreign key constraints
    - Activity logs and other tables reference users with ON DELETE NO ACTION
    - This prevents user deletion when there are related records

  2. Solution
    - Update foreign key constraints to use appropriate deletion behavior
    - Set activity_logs.user_id to use ON DELETE SET NULL
    - Set user-specific tables to use ON DELETE CASCADE
    - This allows deleting users while preserving activity logs
*/

-- Fix activity_logs foreign key constraint
ALTER TABLE activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE activity_logs
ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix chat_history foreign key constraint
ALTER TABLE chat_history
DROP CONSTRAINT IF EXISTS chat_history_user_id_fkey;

ALTER TABLE chat_history
ADD CONSTRAINT chat_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix user_profiles foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix podcast_likes foreign key constraint
ALTER TABLE podcast_likes
DROP CONSTRAINT IF EXISTS podcast_likes_user_id_fkey;

ALTER TABLE podcast_likes
ADD CONSTRAINT podcast_likes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix user_courses foreign key constraint
ALTER TABLE user_courses
DROP CONSTRAINT IF EXISTS user_courses_user_id_fkey;

ALTER TABLE user_courses
ADD CONSTRAINT user_courses_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES users(id)
  ON DELETE CASCADE;

-- Fix podcasts created_by foreign key constraint
ALTER TABLE podcasts
DROP CONSTRAINT IF EXISTS podcasts_created_by_fkey;

ALTER TABLE podcasts
ADD CONSTRAINT podcasts_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix pdfs created_by foreign key constraint
ALTER TABLE pdfs
DROP CONSTRAINT IF EXISTS pdfs_created_by_fkey;

ALTER TABLE pdfs
ADD CONSTRAINT pdfs_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix quizzes created_by foreign key constraint
ALTER TABLE quizzes
DROP CONSTRAINT IF EXISTS quizzes_created_by_fkey;

ALTER TABLE quizzes
ADD CONSTRAINT quizzes_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix content_categories created_by foreign key constraint
ALTER TABLE content_categories
DROP CONSTRAINT IF EXISTS content_categories_created_by_fkey;

ALTER TABLE content_categories
ADD CONSTRAINT content_categories_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Fix logos created_by foreign key constraint
ALTER TABLE logos
DROP CONSTRAINT IF EXISTS logos_created_by_fkey;

ALTER TABLE logos
ADD CONSTRAINT logos_created_by_fkey
  FOREIGN KEY (created_by)
  REFERENCES users(id)
  ON DELETE SET NULL;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE activity_logs;
ANALYZE chat_history;
ANALYZE user_profiles;
ANALYZE podcast_likes;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE content_categories;
ANALYZE logos;