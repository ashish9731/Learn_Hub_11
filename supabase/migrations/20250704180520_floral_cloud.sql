-- Create podcast_likes table
CREATE TABLE IF NOT EXISTS podcast_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    podcast_id UUID NOT NULL REFERENCES podcasts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, podcast_id)
);

-- Enable RLS on podcast_likes
ALTER TABLE podcast_likes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for podcast_likes (only if they don't exist)
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

-- Create trigger for activity logging (only if it doesn't exist)
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
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_id ON podcast_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_podcast_id ON podcast_likes(podcast_id);
CREATE INDEX IF NOT EXISTS idx_podcast_likes_user_podcast ON podcast_likes(user_id, podcast_id);

-- Update statistics
ANALYZE podcast_likes;