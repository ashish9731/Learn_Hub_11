-- Ensure we are in the public schema
SET search_path = public;

-- Drop existing tables and types to avoid conflicts (run only if needed)
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS chat_history CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS pdfs CASCADE;
DROP TABLE IF EXISTS podcasts CASCADE;
DROP TABLE IF EXISTS user_courses CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS podcast_category;
DROP TYPE IF EXISTS user_role;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS super_admin_podcasts_storage ON storage.objects;
DROP POLICY IF EXISTS admin_podcasts_storage ON storage.objects;
DROP POLICY IF EXISTS user_podcasts_storage ON storage.objects;
DROP POLICY IF EXISTS super_admin_documents_storage ON storage.objects;
DROP POLICY IF EXISTS admin_documents_storage ON storage.objects;
DROP POLICY IF EXISTS user_documents_storage ON storage.objects;
DROP POLICY IF EXISTS super_admin_images_storage ON storage.objects;
DROP POLICY IF EXISTS admin_images_storage ON storage.objects;
DROP POLICY IF EXISTS user_images_storage ON storage.objects;

-- Create Enum for podcast categories
CREATE TYPE podcast_category AS ENUM ('Books', 'HBR', 'TED Talks', 'Concept', 'Role Play');

-- Create Enum for user roles
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'user');

-- Users table with profile picture URL
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'user',
    company_id UUID,
    profile_picture_url TEXT, -- Stores the Supabase storage path (e.g., 'images/profile_<uuid>.png')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Companies table
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Courses table with optional image URL
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    image_url TEXT, -- Stores the Supabase storage path for course images (e.g., 'images/course_<uuid>.png')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User-Course assignments
CREATE TABLE user_courses (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);

-- Podcasts table
CREATE TABLE podcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    category podcast_category NOT NULL,
    mp3_url TEXT NOT NULL, -- Stores the Supabase storage path (e.g., 'podcasts/<uuid>.mp3')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- PDFs table
CREATE TABLE pdfs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    pdf_url TEXT NOT NULL, -- Stores the Supabase storage path (e.g., 'documents/<uuid>.pdf')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Quizzes table
CREATE TABLE quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Chat history table
CREATE TABLE chat_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table for tracking all actions
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Temporarily disable RLS for initial setup
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts DISABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs DISABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Insert default super admin
INSERT INTO users (id, email, role) 
VALUES (gen_random_uuid(), 'ankur@c2x.co.in', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE podcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdfs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY super_admin_users ON users
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_users ON users
    FOR ALL
    USING (auth.role() = 'admin' AND company_id = (SELECT company_id FROM users WHERE email = auth.email()))
    WITH CHECK (auth.role() = 'admin' AND company_id = (SELECT company_id FROM users WHERE email = auth.email()));

CREATE POLICY user_users ON users
    FOR SELECT
    USING (auth.uid() = id);

-- Companies table policies
CREATE POLICY super_admin_companies ON companies
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_companies ON companies
    FOR SELECT
    USING (auth.role() = 'admin' AND id = (SELECT company_id FROM users WHERE email = auth.email()));

-- Courses table policies
CREATE POLICY super_admin_courses ON courses
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_courses ON courses
    FOR ALL
    USING (auth.role() = 'admin' AND company_id = (SELECT company_id FROM users WHERE email = auth.email()))
    WITH CHECK (auth.role() = 'admin' AND company_id = (SELECT company_id FROM users WHERE email = auth.email()));

CREATE POLICY user_courses ON courses
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_courses WHERE course_id = courses.id AND user_id = auth.uid()));

-- User-Course assignments policies
CREATE POLICY super_admin_user_courses ON user_courses
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_user_courses ON user_courses
    FOR ALL
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = user_courses.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ))
    WITH CHECK (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = user_courses.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_user_courses ON user_courses
    FOR SELECT
    USING (user_id = auth.uid());

-- Podcasts table policies
CREATE POLICY super_admin_podcasts ON podcasts
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_podcasts ON podcasts
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = podcasts.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_podcasts ON podcasts
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = podcasts.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- PDFs table policies
CREATE POLICY super_admin_pdfs ON pdfs
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_pdfs ON pdfs
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = pdfs.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_pdfs ON pdfs
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = pdfs.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Quizzes table policies
CREATE POLICY super_admin_quizzes ON quizzes
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_quizzes ON quizzes
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = quizzes.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_quizzes ON quizzes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Chat history policies
CREATE POLICY super_admin_chat_history ON chat_history
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_chat_history ON chat_history
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = chat_history.user_id 
        AND u.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_chat_history ON chat_history
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Activity logs policies
CREATE POLICY super_admin_activity_logs ON activity_logs
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_activity_logs ON activity_logs
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = activity_logs.user_id 
        AND u.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

-- Storage policies for 'podcasts' bucket
CREATE POLICY super_admin_podcasts_storage ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (bucket_id = 'podcasts' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_podcasts_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'podcasts' 
        AND auth.role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM podcasts p
            JOIN courses c ON p.course_id = c.id
            WHERE p.mp3_url = ('podcasts/' || storage.objects.name)
            AND c.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    );

CREATE POLICY user_podcasts_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'podcasts'
        AND EXISTS (
            SELECT 1 FROM podcasts p
            JOIN user_courses uc ON p.course_id = uc.course_id
            WHERE p.mp3_url = ('podcasts/' || storage.objects.name)
            AND uc.user_id = auth.uid()
        )
    );

-- Storage policies for 'documents' bucket
CREATE POLICY super_admin_documents_storage ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (bucket_id = 'documents' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_documents_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents' 
        AND auth.role() = 'admin'
        AND EXISTS (
            SELECT 1 FROM pdfs p
            JOIN courses c ON p.course_id = c.id
            WHERE p.pdf_url = ('documents/' || storage.objects.name)
            AND c.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    );

CREATE POLICY user_documents_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'documents'
        AND EXISTS (
            SELECT 1 FROM pdfs p
            JOIN user_courses uc ON p.course_id = uc.course_id
            WHERE p.pdf_url = ('documents/' || storage.objects.name)
            AND uc.user_id = auth.uid()
        )
    );

-- Storage policies for 'images' bucket (for profile pictures and course images)
CREATE POLICY super_admin_images_storage ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'images' AND auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (bucket_id = 'images' AND auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_images_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'images'
        AND auth.role() = 'admin'
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.profile_picture_url = ('images/' || storage.objects.name)
                AND u.company_id = (SELECT company_id FROM users WHERE email = auth.email())
            )
            OR EXISTS (
                SELECT 1 FROM courses c
                WHERE c.image_url = ('images/' || storage.objects.name)
                AND c.company_id = (SELECT company_id FROM users WHERE email = auth.email())
            )
        )
    );

CREATE POLICY user_images_storage ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'images'
        AND (
            EXISTS (
                SELECT 1 FROM users u
                WHERE u.profile_picture_url = ('images/' || storage.objects.name)
                AND u.id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM courses c
                JOIN user_courses uc ON c.id = uc.course_id
                WHERE c.image_url = ('images/' || storage.objects.name)
                AND uc.user_id = auth.uid()
            )
        )
    );

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity(
    p_user_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_details JSONB
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_details);
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for automatic activity logging
CREATE OR REPLACE FUNCTION trigger_activity_log()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM log_activity(
        auth.uid(),
        TG_OP,
        TG_TABLE_NAME,
        NEW.id,
        jsonb_build_object('table', TG_TABLE_NAME, 'record', to_jsonb(NEW))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables
CREATE TRIGGER log_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_companies
    AFTER INSERT OR UPDATE OR DELETE ON companies
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_courses
    AFTER INSERT OR UPDATE OR DELETE ON courses
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_user_courses
    AFTER INSERT OR UPDATE OR DELETE ON user_courses
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_podcasts
    AFTER INSERT OR UPDATE OR DELETE ON podcasts
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_pdfs
    AFTER INSERT OR UPDATE OR DELETE ON pdfs
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_quizzes
    AFTER INSERT OR UPDATE OR DELETE ON quizzes
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_chat_history
    AFTER INSERT OR UPDATE OR DELETE ON chat_history
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();