-- Fix content_type default value to prevent incorrect classification
-- Remove the fallback that was setting NULL values to 'docs'
-- Instead, we should ensure that all new records have their content_type explicitly set

-- For existing records that were incorrectly set to 'docs' but should be 'templates',
-- we need a more careful approach. Let's only update records that were explicitly set to 'docs'
-- by the previous migration (which would have been NULL before)

-- Update records that were set to 'docs' by the previous migration but should be 'templates'
-- We'll identify these by looking for records that don't match typical document extensions
-- but were categorized as 'docs'
UPDATE pdfs 
SET content_type = 'templates'
WHERE content_type = 'docs' 
AND NOT (
    title ILIKE '%.pdf' OR 
    title ILIKE '%.docx' OR 
    title ILIKE '%.pptx' OR 
    title ILIKE '%.xlsx' OR 
    title ILIKE '%.txt'
)
AND (
    title ILIKE '%.jpg' OR 
    title ILIKE '%.jpeg' OR 
    title ILIKE '%.png' OR 
    title ILIKE '%.gif' OR 
    title ILIKE '%.svg' OR
    -- Add other common template extensions that might have been misclassified
    title ILIKE '%.zip' OR 
    title ILIKE '%.rar' OR 
    title ILIKE '%.7z' OR 
    title ILIKE '%.exe' OR 
    title ILIKE '%.dmg' OR 
    title ILIKE '%.iso'
    -- Note: This is a conservative approach - we're only changing clearly misclassified items
);

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN pdfs.content_type IS 'Content type classification: docs, images, or templates. Must be explicitly set during upload.';