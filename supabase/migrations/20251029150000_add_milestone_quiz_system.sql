/*
  # Add milestone quiz system tables

  1. Create tables for:
    - module_quizzes: Store 5-question quizzes for each module (category)
    - course_quizzes: Store 10-question final quizzes for each course
    - quiz_questions: Store individual quiz questions
    - quiz_answers: Store possible answers for each question
    - user_quiz_attempts: Store user quiz attempts and results
    - user_quiz_answers: Store user's answers to specific questions

  2. Add RLS policies for all tables
  3. Add indexes for better performance
*/

-- Create module_quizzes table for 5-question module quizzes
CREATE TABLE IF NOT EXISTS module_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES content_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create course_quizzes table for 10-question final course quizzes
CREATE TABLE IF NOT EXISTS course_quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create quiz_questions table for individual questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_quiz_id UUID REFERENCES module_quizzes(id) ON DELETE CASCADE,
    course_quiz_id UUID REFERENCES course_quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice', -- multiple_choice, true_false, short_answer
    difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_exclusive_quiz_type CHECK (
        (module_quiz_id IS NOT NULL AND course_quiz_id IS NULL) OR
        (module_quiz_id IS NULL AND course_quiz_id IS NOT NULL)
    )
);

-- Create quiz_answers table for possible answers
CREATE TABLE IF NOT EXISTS quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create user_quiz_attempts table to track user quiz attempts
CREATE TABLE IF NOT EXISTS user_quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    module_quiz_id UUID REFERENCES module_quizzes(id) ON DELETE CASCADE,
    course_quiz_id UUID REFERENCES course_quizzes(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    score INTEGER,
    total_questions INTEGER,
    passed BOOLEAN,
    CONSTRAINT check_exclusive_attempt_type CHECK (
        (module_quiz_id IS NOT NULL AND course_quiz_id IS NULL) OR
        (module_quiz_id IS NULL AND course_quiz_id IS NOT NULL)
    )
);

-- Create user_quiz_answers table to store user's answers
CREATE TABLE IF NOT EXISTS user_quiz_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID REFERENCES user_quiz_attempts(id) ON DELETE CASCADE,
    question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
    selected_answer_id UUID REFERENCES quiz_answers(id) ON DELETE SET NULL,
    short_answer_text TEXT,
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_module_quizzes_course ON module_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_module_quizzes_category ON module_quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_course_quizzes_course ON course_quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_module ON quiz_questions(module_quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_course ON quiz_questions(course_quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_question ON quiz_answers(question_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_user ON user_quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_module ON user_quiz_attempts(module_quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_attempts_course ON user_quiz_attempts(course_quiz_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_answers_attempt ON user_quiz_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_user_quiz_answers_question ON user_quiz_answers(question_id);

-- Enable RLS on all tables
ALTER TABLE module_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quiz_answers ENABLE ROW LEVEL SECURITY;

-- Module Quizzes Policies
CREATE POLICY super_admin_module_quizzes ON module_quizzes
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_module_quizzes ON module_quizzes
    FOR ALL
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = module_quizzes.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ))
    WITH CHECK (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = module_quizzes.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_module_quizzes ON module_quizzes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = module_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Course Quizzes Policies
CREATE POLICY super_admin_course_quizzes ON course_quizzes
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_course_quizzes ON course_quizzes
    FOR ALL
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = course_quizzes.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ))
    WITH CHECK (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM courses 
        WHERE courses.id = course_quizzes.course_id 
        AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
    ));

CREATE POLICY user_course_quizzes ON course_quizzes
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_courses 
        WHERE user_courses.course_id = course_quizzes.course_id 
        AND user_courses.user_id = auth.uid()
    ));

-- Quiz Questions Policies
CREATE POLICY super_admin_quiz_questions ON quiz_questions
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_quiz_questions ON quiz_questions
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM module_quizzes 
        WHERE module_quizzes.id = quiz_questions.module_quiz_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = module_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ) OR auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM course_quizzes 
        WHERE course_quizzes.id = quiz_questions.course_quiz_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ));

CREATE POLICY user_quiz_questions ON quiz_questions
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM module_quizzes 
        WHERE module_quizzes.id = quiz_questions.module_quiz_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = module_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ) OR EXISTS (
        SELECT 1 FROM course_quizzes 
        WHERE course_quizzes.id = quiz_questions.course_quiz_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = course_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ));

-- Quiz Answers Policies
CREATE POLICY super_admin_quiz_answers ON quiz_answers
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_quiz_answers ON quiz_answers
    FOR SELECT
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN module_quizzes ON module_quizzes.id = quiz_questions.module_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = module_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ) OR auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN course_quizzes ON course_quizzes.id = quiz_questions.course_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ));

CREATE POLICY user_quiz_answers ON quiz_answers
    FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN module_quizzes ON module_quizzes.id = quiz_questions.module_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = module_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ) OR EXISTS (
        SELECT 1 FROM quiz_questions 
        JOIN course_quizzes ON course_quizzes.id = quiz_questions.course_quiz_id
        WHERE quiz_questions.id = quiz_answers.question_id 
        AND EXISTS (
            SELECT 1 FROM user_courses 
            WHERE user_courses.course_id = course_quizzes.course_id 
            AND user_courses.user_id = auth.uid()
        )
    ));

-- User Quiz Attempts Policies
CREATE POLICY super_admin_user_quiz_attempts ON user_quiz_attempts
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_user_quiz_attempts ON user_quiz_attempts
    FOR ALL
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM module_quizzes 
        WHERE module_quizzes.id = user_quiz_attempts.module_quiz_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = module_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ) OR auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM course_quizzes 
        WHERE course_quizzes.id = user_quiz_attempts.course_quiz_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ));

CREATE POLICY user_user_quiz_attempts ON user_quiz_attempts
    FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- User Quiz Answers Policies
CREATE POLICY super_admin_user_quiz_answers ON user_quiz_answers
    FOR ALL
    USING (auth.email() = 'ankur@c2x.co.in')
    WITH CHECK (auth.email() = 'ankur@c2x.co.in');

CREATE POLICY admin_user_quiz_answers ON user_quiz_answers
    FOR ALL
    USING (auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        JOIN module_quizzes ON module_quizzes.id = user_quiz_attempts.module_quiz_id
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = module_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ) OR auth.role() = 'admin' AND EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        JOIN course_quizzes ON course_quizzes.id = user_quiz_attempts.course_quiz_id
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = course_quizzes.course_id 
            AND courses.company_id = (SELECT company_id FROM users WHERE email = auth.email())
        )
    ));

CREATE POLICY user_user_quiz_answers ON user_quiz_answers
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND user_quiz_attempts.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM user_quiz_attempts 
        WHERE user_quiz_attempts.id = user_quiz_answers.attempt_id 
        AND user_quiz_attempts.user_id = auth.uid()
    ));

-- Refresh statistics
ANALYZE module_quizzes;
ANALYZE course_quizzes;
ANALYZE quiz_questions;
ANALYZE quiz_answers;
ANALYZE user_quiz_attempts;
ANALYZE user_quiz_answers;