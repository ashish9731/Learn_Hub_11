/*
  # Fix Unused Indexes

  1. Problem
    - Multiple unused indexes detected by the Performance Advisor
    - These indexes are consuming storage space and slowing down write operations
    - They're not being used by any queries, so they provide no benefit

  2. Solution
    - Drop all unused indexes identified by the Performance Advisor
    - Create more efficient composite indexes for frequently joined tables
    - Update table statistics for better query planning
*/

-- Drop unused indexes on chat_history table
DROP INDEX IF EXISTS idx_chat_history_user_id;

-- Drop unused indexes on content_categories table
DROP INDEX IF EXISTS idx_content_categories_course_id;
DROP INDEX IF EXISTS idx_content_categories_created_by;

-- Drop unused indexes on courses table
DROP INDEX IF EXISTS idx_courses_company_id;

-- Drop unused indexes on logos table
DROP INDEX IF EXISTS idx_logos_company_id;
DROP INDEX IF EXISTS idx_logos_created_by;

-- Drop unused indexes on pdfs table
DROP INDEX IF EXISTS idx_pdfs_course_id;
DROP INDEX IF EXISTS idx_pdfs_created_by;

-- Drop unused indexes on podcast_likes table
DROP INDEX IF EXISTS idx_podcast_likes_user_id;
DROP INDEX IF EXISTS idx_podcast_likes_podcast_id;

-- Drop unused indexes on podcasts table
DROP INDEX IF EXISTS idx_podcasts_course_id;
DROP INDEX IF EXISTS idx_podcasts_created_by;
DROP INDEX IF EXISTS idx_podcasts_category_id;

-- Drop unused indexes on quizzes table
DROP INDEX IF EXISTS idx_quizzes_course_id;
DROP INDEX IF EXISTS idx_quizzes_created_by;

-- Drop unused indexes on user_courses table
DROP INDEX IF EXISTS idx_user_courses_user_id;
DROP INDEX IF EXISTS idx_user_courses_course_id;

-- Create more efficient composite indexes for frequently joined tables
CREATE INDEX IF NOT EXISTS idx_podcasts_course_category ON podcasts(course_id, category_id);
CREATE INDEX IF NOT EXISTS idx_user_courses_user_course ON user_courses(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_content_categories_course_name ON content_categories(course_id, name);

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