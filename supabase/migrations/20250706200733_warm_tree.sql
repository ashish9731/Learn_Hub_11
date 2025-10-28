/*
  # Fix Unused Indexes

  1. Purpose
    - Remove unused indexes identified by the performance advisor
    - Improve database performance by reducing index maintenance overhead
    - Reduce storage space used by unnecessary indexes

  2. Changes
    - Drop unused indexes from users, courses, user_courses, podcasts, pdfs, quizzes, chat_history tables
    - Update table statistics after removing the indexes
*/

-- Drop unused indexes on users table
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;
DROP INDEX IF EXISTS idx_users_company_id;

-- Drop unused indexes on courses table
DROP INDEX IF EXISTS idx_courses_company_id;
DROP INDEX IF EXISTS idx_courses_created_at;

-- Drop unused indexes on user_courses table
DROP INDEX IF EXISTS idx_user_courses_user_id;
DROP INDEX IF EXISTS idx_user_courses_course_id;

-- Drop unused indexes on podcasts table
DROP INDEX IF EXISTS idx_podcasts_course_id;
DROP INDEX IF EXISTS idx_podcasts_created_by;
DROP INDEX IF EXISTS idx_podcasts_category;
DROP INDEX IF EXISTS idx_podcasts_created_at;

-- Drop unused indexes on pdfs table
DROP INDEX IF EXISTS idx_pdfs_course_id;
DROP INDEX IF EXISTS idx_pdfs_created_by;

-- Drop unused indexes on quizzes table
DROP INDEX IF EXISTS idx_quizzes_course_id;
DROP INDEX IF EXISTS idx_quizzes_created_by;

-- Drop unused indexes on chat_history table
DROP INDEX IF EXISTS idx_chat_history_user_id;

-- Drop unused indexes on logos table
DROP INDEX IF EXISTS idx_logos_company_id;

-- Drop unused indexes on content_categories table
DROP INDEX IF EXISTS idx_content_categories_course_id;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE logos;
ANALYZE content_categories;