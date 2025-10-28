/*
  # Remove Role Play from podcast_category enum

  1. Changes
     - Removes 'Role Play' from the podcast_category enum type
     - Updates any existing podcasts with 'Role Play' category to 'Concept'
*/

-- First update any podcasts with 'Role Play' category to 'Concept'
UPDATE podcasts
SET category = 'Concept'
WHERE category = 'Role Play';

-- Recreate the enum type without 'Role Play'
ALTER TYPE podcast_category RENAME TO podcast_category_old;
CREATE TYPE podcast_category AS ENUM ('Books', 'HBR', 'TED Talks', 'Concept');

-- Update the column to use the new enum type
ALTER TABLE podcasts 
  ALTER COLUMN category TYPE podcast_category 
  USING category::text::podcast_category;

-- Drop the old enum type
DROP TYPE podcast_category_old;