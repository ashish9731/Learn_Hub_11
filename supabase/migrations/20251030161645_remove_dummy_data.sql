/*
  # Remove All Dummy/Test/Fake Data

  1. Purpose
    - Remove all dummy, test, or fake data from the database
    - Clean up all tables to ensure only real production data remains
    - Specifically target podcasts, courses, users, and companies with test/dummy names

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
WHERE title ILIKE '%test%' 
   OR title ILIKE '%dummy%' 
   OR title ILIKE '%fake%'
   OR title ILIKE '%example%'
   OR title ILIKE '%sample%'
   OR title ILIKE '%Eat That Frog%'
   OR title ILIKE '%Timeboxing%';

-- Delete all content categories with dummy/test/fake names
DELETE FROM content_categories 
WHERE name ILIKE '%test%' 
   OR name ILIKE '%dummy%' 
   OR name ILIKE '%fake%'
   OR name ILIKE '%example%'
   OR name ILIKE '%sample%'
   OR name ILIKE '%Uncategorized%';

-- Delete all courses with dummy/test/fake titles
DELETE FROM courses 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%dummy%' 
   OR title ILIKE '%fake%'
   OR title ILIKE '%example%'
   OR title ILIKE '%sample%';

-- Delete all PDFs with dummy/test/fake titles
DELETE FROM pdfs 
WHERE title ILIKE '%test%' 
   OR title ILIKE '%dummy%' 
   OR title ILIKE '%fake%'
   OR title ILIKE '%example%'
   OR title ILIKE '%sample%';

-- Delete all user_courses entries for test users
DELETE FROM user_courses 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%dummy%' 
       OR email ILIKE '%fake%'
       OR email ILIKE '%example%'
       OR email ILIKE '%sample%'
);

-- Delete all chat_history entries for test users
DELETE FROM chat_history 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%dummy%' 
       OR email ILIKE '%fake%'
       OR email ILIKE '%example%'
       OR email ILIKE '%sample%'
);

-- Delete all activity_logs entries for test users
DELETE FROM activity_logs 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%dummy%' 
       OR email ILIKE '%fake%'
       OR email ILIKE '%example%'
       OR email ILIKE '%sample%'
);

-- Delete all user_profiles for test users
DELETE FROM user_profiles 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE email ILIKE '%test%' 
       OR email ILIKE '%dummy%' 
       OR email ILIKE '%fake%'
       OR email ILIKE '%example%'
       OR email ILIKE '%sample%'
);

-- Delete all logos for test companies
DELETE FROM logos 
WHERE company_id IN (
    SELECT id FROM companies 
    WHERE name ILIKE '%test%' 
       OR name ILIKE '%dummy%' 
       OR name ILIKE '%fake%'
       OR name ILIKE '%example%'
       OR name ILIKE '%sample%'
);

-- Delete all test users (except super admin)
DELETE FROM users 
WHERE (email ILIKE '%test%' 
    OR email ILIKE '%dummy%' 
    OR email ILIKE '%fake%'
    OR email ILIKE '%example%'
    OR email ILIKE '%sample%')
  AND role != 'super_admin';

-- Delete all test companies
DELETE FROM companies 
WHERE name ILIKE '%test%' 
   OR name ILIKE '%dummy%' 
   OR name ILIKE '%fake%'
   OR name ILIKE '%example%'
   OR name ILIKE '%sample%';

-- Update statistics
ANALYZE content_categories;
ANALYZE podcasts;
ANALYZE courses;
ANALYZE users;
ANALYZE companies;