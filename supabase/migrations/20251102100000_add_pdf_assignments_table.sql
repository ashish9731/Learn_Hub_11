-- Create pdf_assignments table for tracking PDF content assignments
CREATE TABLE IF NOT EXISTS pdf_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pdf_id UUID REFERENCES pdfs(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a user can only be assigned a PDF once
  UNIQUE(user_id, pdf_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pdf_assignments_user_id ON pdf_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_assignments_pdf_id ON pdf_assignments(pdf_id);
CREATE INDEX IF NOT EXISTS idx_pdf_assignments_assigned_by ON pdf_assignments(assigned_by);

-- Enable RLS
ALTER TABLE pdf_assignments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own PDF assignments
CREATE POLICY "Users can view their own PDF assignments" 
ON pdf_assignments FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Admins can view PDF assignments for users in their company
CREATE POLICY "Admins can view PDF assignments for their company users" 
ON pdf_assignments FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users u1 
    JOIN users u2 ON u1.company_id = u2.company_id 
    WHERE u1.id = user_id AND u2.id = auth.uid() AND u2.role = 'admin'
  )
);

-- Admins can insert PDF assignments for users in their company
CREATE POLICY "Admins can insert PDF assignments for their company users" 
ON pdf_assignments FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u1 
    JOIN users u2 ON u1.company_id = u2.company_id 
    WHERE u1.id = user_id AND u2.id = auth.uid() AND u2.role = 'admin'
  )
);

-- Admins can update PDF assignments for users in their company
CREATE POLICY "Admins can update PDF assignments for their company users" 
ON pdf_assignments FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users u1 
    JOIN users u2 ON u1.company_id = u2.company_id 
    WHERE u1.id = user_id AND u2.id = auth.uid() AND u2.role = 'admin'
  )
);

-- Admins can delete PDF assignments for users in their company
CREATE POLICY "Admins can delete PDF assignments for their company users" 
ON pdf_assignments FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users u1 
    JOIN users u2 ON u1.company_id = u2.company_id 
    WHERE u1.id = user_id AND u2.id = auth.uid() AND u2.role = 'admin'
  )
);

-- Super admins can view all PDF assignments
CREATE POLICY "Super admins can view all PDF assignments" 
ON pdf_assignments FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admins can insert any PDF assignments
CREATE POLICY "Super admins can insert any PDF assignments" 
ON pdf_assignments FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admins can update any PDF assignments
CREATE POLICY "Super admins can update any PDF assignments" 
ON pdf_assignments FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Super admins can delete any PDF assignments
CREATE POLICY "Super admins can delete any PDF assignments" 
ON pdf_assignments FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pdf_assignments_updated_at 
BEFORE UPDATE ON pdf_assignments 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add comment to explain the purpose of the table
COMMENT ON TABLE pdf_assignments IS 'Tracks assignments of PDF content to users by admins';