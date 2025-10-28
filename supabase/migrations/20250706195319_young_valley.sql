/*
  # Fix Unused Indexes

  1. Problem
    - Multiple unused indexes detected across tables
    - These indexes consume storage space and can slow down write operations
    - They provide no benefit if they're never used in queries

  2. Solution
    - Drop unused indexes to improve database performance
    - Keep only necessary indexes that are actually used in queries
    - This will reduce storage usage and improve write performance
*/

-- Drop unused indexes on users table
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role_company;

-- Drop unused indexes on courses table
DROP INDEX IF EXISTS idx_courses_company_created;

-- Drop unused indexes on user_courses table
DROP INDEX IF EXISTS idx_user_courses_assigned_at;

-- Drop unused indexes on podcasts table
DROP INDEX IF EXISTS idx_podcasts_course_category;

-- Drop unused indexes on pdfs table
DROP INDEX IF EXISTS idx_pdfs_created_at;

-- Drop unused indexes on quizzes table
DROP INDEX IF EXISTS idx_quizzes_created_at;

-- Drop unused indexes on chat_history table
DROP INDEX IF EXISTS idx_chat_history_created_at;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;