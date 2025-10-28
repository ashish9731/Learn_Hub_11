-- Fix Remaining Unused Indexes
-- This migration drops all unused indexes identified by the performance advisor

-- Drop unused indexes on pdfs table
DROP INDEX IF EXISTS idx_pdfs_created_at;

-- Drop unused indexes on quizzes table
DROP INDEX IF EXISTS idx_quizzes_created_at;

-- Drop unused indexes on chat_history table
DROP INDEX IF EXISTS idx_chat_history_created_at;

-- Drop unused indexes on activity_logs table
DROP INDEX IF EXISTS idx_activity_logs_created_at;
DROP INDEX IF EXISTS idx_activity_logs_entity_id;
DROP INDEX IF EXISTS idx_activity_logs_entity_type;
DROP INDEX IF EXISTS idx_activity_logs_user_entity;

-- Drop unused indexes on user_profiles table
DROP INDEX IF EXISTS idx_user_profiles_updated_at;

-- Drop unused indexes on logos table
DROP INDEX IF EXISTS idx_logos_created_at;
DROP INDEX IF EXISTS idx_logos_created_by;

-- Drop unused indexes on content_categories table
DROP INDEX IF EXISTS idx_content_categories_created_at;
DROP INDEX IF EXISTS idx_content_categories_created_by;

-- Drop unused indexes on contact_messages table
DROP INDEX IF EXISTS idx_contact_messages_created_at;
DROP INDEX IF EXISTS idx_contact_messages_is_read;

-- Drop unused indexes on podcast_likes table
DROP INDEX IF EXISTS idx_podcast_likes_user_id;
DROP INDEX IF EXISTS idx_podcast_likes_podcast_id;
DROP INDEX IF EXISTS idx_podcast_likes_user_podcast;

-- Update statistics for better query planning
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE user_profiles;
ANALYZE logos;
ANALYZE content_categories;
ANALYZE contact_messages;
ANALYZE podcast_likes;