-- Add description column to podcasts table
ALTER TABLE podcasts ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description column to pdfs table
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS description TEXT;

-- Add comments to explain the purpose of the columns
COMMENT ON COLUMN podcasts.description IS 'Description of the podcast content';
COMMENT ON COLUMN pdfs.description IS 'Description of the PDF content';