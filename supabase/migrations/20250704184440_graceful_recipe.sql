/*
  # Fix Podcast Category Constraint

  1. Problem
    - Error: "null value in column 'category' of relation 'podcasts' violates not-null constraint"
    - The podcasts table has a NOT NULL constraint on the category column
    - The application is using category_id but not setting the category field

  2. Solution
    - Make the category column nullable to allow using only category_id
    - This allows the application to work with the content_categories table
    - Maintains backward compatibility with existing code
*/

-- Make the category column nullable to resolve the constraint violation
ALTER TABLE podcasts ALTER COLUMN category DROP NOT NULL;