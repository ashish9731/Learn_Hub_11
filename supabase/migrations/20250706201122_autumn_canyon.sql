/*
  # Fix Unindexed Foreign Keys

  1. Problem
    - Foreign key constraints without covering indexes
    - This can impact database performance during joins and lookups
    - Performance advisor is showing multiple unindexed foreign keys

  2. Solution
    - Add indexes for all foreign key constraints that are missing them
    - This will improve query performance for joins and lookups
    - Properly index all relationships between tables
*/

-- Add indexes for chat_history foreign keys
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);

-- Add indexes for content_categories foreign keys
CREATE INDEX IF NOT EXISTS idx_content_categories_course_id ON content_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_created_by ON content_categories(created_by);

-- Add indexes for courses foreign keys
CREATE INDEX IF NOT EXISTS idx_courses_company_id ON courses(company_id);

-- Add indexes for logos foreign keys
CREATE INDEX IF NOT EXISTS idx_logos_company_id ON logos(company_id);
CREATE INDEX IF NOT EXISTS idx_logos_created_by ON logos(created_by);

-- Add indexes for pdfs foreign keys
CREATE INDEX IF NOT EXISTS idx_pdfs_course_id ON pdfs(course_id);
CREATE INDEX IF NOT EXISTS idx_pdfs_created_by ON pdfs(created_by);

-- Add indexes for podcast_likes foreign keys
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_id ON podcast_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_podcast_id ON podcast_likes(podcast_id);

-- Add indexes for podcasts foreign keys
CREATE INDEX IF NOT EXISTS idx_podcasts_course_id ON podcasts(course_id);
CREATE INDEX IF NOT EXISTS idx_podcasts_created_by ON podcasts(created_by);
CREATE INDEX IF NOT EXISTS idx_podcasts_category_id ON podcasts(category_id);

-- Add indexes for quizzes foreign keys
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON quizzes(created_by);

-- Add indexes for user_courses foreign keys
CREATE INDEX IF NOT EXISTS idx_user_courses_user_id ON user_courses(user_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_course_id ON user_courses(course_id);

-- Update statistics for better query planning
ANALYZE chat_history;
ANALYZE content_categories;
ANALYZE courses;
ANALYZE logos;
ANALYZE pdfs;
ANALYZE podcast_likes;
ANALYZE podcasts;
ANALYZE quizzes;
ANALYZE user_courses;