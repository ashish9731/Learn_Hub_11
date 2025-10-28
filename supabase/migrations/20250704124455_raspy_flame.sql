/*
  # Add Homepage Content Tables
  
  1. New Tables
    - `homepage_content` - Stores content for the homepage sections
    - `contact_messages` - Stores contact form submissions
    - `faqs` - Stores frequently asked questions
    
  2. Security
    - Enable RLS on all new tables
    - Add policies for content management
    - Ensure proper access control
*/

-- Create homepage_content table
CREATE TABLE IF NOT EXISTS homepage_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_name TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    content TEXT,
    image_url TEXT,
    button_text TEXT,
    button_link TEXT,
    order_index INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    company TEXT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create faqs table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    order_index INT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Enable RLS on all tables
ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs ENABLE ROW LEVEL SECURITY;

-- Create policies for homepage_content
CREATE POLICY "homepage_content_select_all" 
  ON homepage_content 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "homepage_content_super_admin_access" 
  ON homepage_content 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create policies for contact_messages
CREATE POLICY "contact_messages_insert_anon" 
  ON contact_messages 
  FOR INSERT 
  TO anon 
  WITH CHECK (true);

CREATE POLICY "contact_messages_super_admin_access" 
  ON contact_messages 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create policies for faqs
CREATE POLICY "faqs_select_all" 
  ON faqs 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "faqs_super_admin_access" 
  ON faqs 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'super_admin'
    )
  );

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_homepage_content_updated_at
    BEFORE UPDATE ON homepage_content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
    BEFORE UPDATE ON faqs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for activity logging
CREATE TRIGGER log_homepage_content
    AFTER INSERT OR UPDATE OR DELETE ON homepage_content
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_contact_messages
    AFTER INSERT OR UPDATE OR DELETE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

CREATE TRIGGER log_faqs
    AFTER INSERT OR UPDATE OR DELETE ON faqs
    FOR EACH ROW EXECUTE FUNCTION trigger_activity_log();

-- Insert initial homepage content
INSERT INTO homepage_content (section_name, title, subtitle, content, image_url, order_index)
VALUES 
    ('hero', 'Elevate Your Learning Experience', 'Professional Learning Management System', 'LearnHub provides a comprehensive learning management system to help organizations deliver effective training and development programs.', 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', 1),
    
    ('about', 'About Us', 'Empowering organizations with innovative learning solutions since 2020', 'LearnHub was founded with a simple mission: to make professional learning accessible, engaging, and effective for organizations of all sizes. We believe that continuous learning is the key to individual growth and organizational success.', 'https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2', 2),
    
    ('services', 'What We Do', 'Comprehensive learning solutions tailored to your organization''s needs', 'We provide a range of learning solutions including a learning management system, podcast learning, and AI-powered personalized learning experiences.', null, 3),
    
    ('contact', 'Contact Us', 'Have questions? We''re here to help you get started with LearnHub', 'Our team is ready to answer any questions you may have about our platform.', null, 4);

-- Insert initial FAQs
INSERT INTO faqs (question, answer, category, order_index)
VALUES 
    ('How does LearnHub work?', 'LearnHub is a comprehensive learning management system that allows organizations to create, deliver, and track learning programs. Users can access courses, podcasts, and other learning materials through our intuitive platform.', 'General', 1),
    
    ('What types of content can I upload?', 'LearnHub supports various content formats including podcasts, PDFs, videos, quizzes, and interactive modules. Our platform is designed to handle diverse learning materials.', 'Content', 2),
    
    ('How do I get started?', 'Simply sign up for an account, and our team will guide you through the setup process. We offer comprehensive onboarding to ensure you can make the most of our platform.', 'Getting Started', 3),
    
    ('Is there a mobile app?', 'Yes, LearnHub is accessible on all devices. Our responsive web application works seamlessly on desktops, tablets, and mobile phones, allowing users to learn on the go.', 'Technical', 4);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_homepage_content_section_name ON homepage_content(section_name);
CREATE INDEX IF NOT EXISTS idx_homepage_content_order_index ON homepage_content(order_index);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON contact_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category);
CREATE INDEX IF NOT EXISTS idx_faqs_order_index ON faqs(order_index);

-- Update statistics
ANALYZE homepage_content;
ANALYZE contact_messages;
ANALYZE faqs;