/*
  # Remove All Dummy/Test/Fake Data

  1. Purpose
    - Remove all dummy, test, or fake data from the database
    - Clean up all tables to ensure only real production data remains
    - Specifically target podcasts like "How Timeboxing..." and "Eat That Frog!.mp3"

  2. Changes
    - Delete all podcasts with test/dummy titles or content
    - Delete all courses with test/dummy titles
    - Delete all categories with test/dummy names
    - Delete all user records with test/dummy emails
    - Delete all company records with test/dummy names
    - Ensure cascading deletes work properly
*/

-- Delete all podcasts with dummy/test/fake titles
DELETE FROM podcasts 
WHERE title LIKE '%test%' 
   OR title LIKE '%dummy%' 
   OR title LIKE '%fake%'
   OR title LIKE '%Eat That Frog%'
   OR title LIKE '%Timeboxing%'
   OR title LIKE '%example%'
   OR title LIKE '%sample%';

-- Delete all content categories with dummy/test/fake names
DELETE FROM content_categories 
WHERE name LIKE '%test%' 
   OR name LIKE '%dummy%' 
   OR name LIKE '%fake%'
   OR name LIKE '%example%'
   OR name LIKE '%sample%'
   OR name LIKE '%Uncategorized%';

-- Delete all courses with dummy/test/fake titles
DELETE FROM courses 
WHERE title LIKE '%test%' 
   OR title LIKE '%dummy%' 
   OR title LIKE '%fake%'
   OR title LIKE '%example%'
   OR title LIKE '%sample%';

-- Delete all PDFs with dummy/test/fake titles
DELETE FROM pdfs 
WHERE title LIKE '%test%' 
   OR title LIKE '%dummy%' 
   OR title LIKE '%fake%'
   OR title LIKE '%example%'
   OR title LIKE '%sample%';

-- Delete all quizzes with dummy/test/fake titles
DELETE FROM quizzes 
WHERE title LIKE '%test%' 
   OR title LIKE '%dummy%' 
   OR title LIKE '%fake%'
   OR title LIKE '%example%'
   OR title LIKE '%sample%';

-- Delete all user_courses entries for test users
DELETE FROM user_courses 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%dummy%' 
       OR email LIKE '%fake%'
       OR email LIKE '%example%'
       OR email LIKE '%sample%'
);

-- Delete all chat_history entries for test users
DELETE FROM chat_history 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%dummy%' 
       OR email LIKE '%fake%'
       OR email LIKE '%example%'
       OR email LIKE '%sample%'
);

-- Delete all activity_logs entries for test users
DELETE FROM activity_logs 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%dummy%' 
       OR email LIKE '%fake%'
       OR email LIKE '%example%'
       OR email LIKE '%sample%'
);

-- Delete all user_profiles for test users
DELETE FROM user_profiles 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email LIKE '%test%' 
       OR email LIKE '%dummy%' 
       OR email LIKE '%fake%'
       OR email LIKE '%example%'
       OR email LIKE '%sample%'
);

-- Delete all test users (except super admin)
DELETE FROM users 
WHERE (email LIKE '%test%' 
    OR email LIKE '%dummy%' 
    OR email LIKE '%fake%'
    OR email LIKE '%example%'
    OR email LIKE '%sample%'
    OR email LIKE '%@company.com%')
AND role != 'super_admin';

-- Delete all logos for test companies
DELETE FROM logos 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE name LIKE '%test%' 
       OR name LIKE '%dummy%' 
       OR name LIKE '%fake%'
       OR name LIKE '%example%'
       OR name LIKE '%sample%'
       OR name LIKE '%Demo%'
);

-- Delete all test companies
DELETE FROM companies 
WHERE name LIKE '%test%' 
   OR name LIKE '%dummy%' 
   OR name LIKE '%fake%'
   OR name LIKE '%example%'
   OR name LIKE '%sample%'
   OR name LIKE '%Demo%';

-- Delete any orphaned content
DELETE FROM podcasts WHERE course_id IS NULL;
DELETE FROM pdfs WHERE course_id IS NULL;
DELETE FROM quizzes WHERE course_id IS NULL;
DELETE FROM content_categories WHERE course_id IS NULL;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_profiles;
ANALYZE companies;
ANALYZE courses;
ANALYZE user_courses;
ANALYZE podcasts;
ANALYZE pdfs;
ANALYZE quizzes;
ANALYZE chat_history;
ANALYZE activity_logs;
ANALYZE logos;
ANALYZE content_categories;