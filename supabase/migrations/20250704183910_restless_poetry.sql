/*
  # Fix podcast category constraint

  1. Schema Changes
    - Make the `category` column in `podcasts` table nullable to allow using `category_id` instead
    - This resolves the NOT NULL constraint violation when inserting podcasts

  2. Security
    - No changes to existing RLS policies
    - Maintains existing foreign key relationships

  3. Notes
    - This allows the application to use either the enum `category` or the `category_id` foreign key
    - Existing data remains unchanged
*/

-- Make the category column nullable to resolve the constraint violation
ALTER TABLE podcasts ALTER COLUMN category DROP NOT NULL;