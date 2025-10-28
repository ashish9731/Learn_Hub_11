/*
  # Fix Podcast Likes Table and Unique Index

  1. Problem
    - Duplicate policy error when creating podcast_likes table
    - Unique index constraint causing issues
    - Need to ensure podcast_likes table exists with proper structure

  2. Solution
    - Check if table and policies exist before creating
    - Create unique index only if it doesn't exist
    - Ensure proper error handling for all operations
*/

-- Create podcast_likes table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'podcast_likes') THEN
        CREATE TABLE podcast_likes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, podcast_id)
        );
        
        -- Enable RLS on podcast_likes
        ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Check if policy exists before creating
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'podcast_likes' 
        AND policyname = 'podcast_likes_own'
    ) THEN
        CREATE POLICY "podcast_likes_own" 
          ON podcast_likes 
          FOR ALL 
          TO authenticated 
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Check if trigger exists before creating
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'log_podcast_likes' 
        AND tgrelid = 'podcast_likes'::regclass
    ) THEN
        CREATE TRIGGER log_podcast_likes
            AFTER INSERT OR DELETE ON podcast_likes
            FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();
    END IF;
END $$;

-- Create indexes for better performance (if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_podcast_likes_user_id'
    ) THEN
        CREATE INDEX idx_podcast_likes_user_id ON podcast_likes(user_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_podcast_likes_podcast_id'
    ) THEN
        CREATE INDEX idx_podcast_likes_podcast_id ON podcast_likes(podcast_id);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_podcast_likes_user_podcast'
    ) THEN
        CREATE INDEX idx_podcast_likes_user_podcast ON podcast_likes(user_id, podcast_id);
    END IF;
END $$;

-- Update statistics
ANALYZE podcast_likes;