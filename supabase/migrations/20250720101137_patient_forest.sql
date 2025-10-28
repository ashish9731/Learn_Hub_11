/*
  # User Profile Management System with Approval Workflow

  1. New Tables
    - `user_registrations` - Stores pending user registrations awaiting approval
    - `approval_logs` - Tracks all approval/rejection actions by superadmins
    - Updates to existing `users` table to add approval status

  2. Security
    - Enable RLS on new tables
    - Add policies for user registration and superadmin approval
    - Maintain existing security for approved users

  3. Workflow
    - Users register independently → pending approval
    - Superadmin reviews → approve as regular user or assign to company
    - Approved users get full access to system
*/

-- Add approval status to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'approval_status'
  ) THEN
    ALTER TABLE users ADD COLUMN approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE users ADD COLUMN approved_by uuid REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE users ADD COLUMN approved_at timestamptz;
  END IF;
END $$;

-- Create user_registrations table for pending registrations
CREATE TABLE IF NOT EXISTS user_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  first_name text,
  last_name text,
  full_name text,
  phone text,
  bio text,
  department text,
  position text,
  employee_id text,
  profile_picture_url text,
  registration_data jsonb DEFAULT '{}',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Create approval_logs table to track all approval actions
CREATE TABLE IF NOT EXISTS approval_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid REFERENCES user_registrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('approved_as_regular', 'approved_with_company', 'rejected')),
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_registrations
CREATE POLICY "Anyone can register"
  ON user_registrations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can read own registration"
  ON user_registrations
  FOR SELECT
  TO authenticated
  USING (email = current_setting('request.jwt.claims', true)::json->>'email');

CREATE POLICY "Super admins can read all registrations"
  ON user_registrations
  FOR SELECT
  TO authenticated
  USING (is_super_admin());

CREATE POLICY "Super admins can update registrations"
  ON user_registrations
  FOR UPDATE
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- RLS Policies for approval_logs
CREATE POLICY "Super admins can manage approval logs"
  ON approval_logs
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- Function to handle user registration
CREATE OR REPLACE FUNCTION handle_user_registration()
RETURNS trigger AS $$
BEGIN
  -- Update timestamp
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_registrations
DROP TRIGGER IF EXISTS update_user_registrations_updated_at ON user_registrations;
CREATE TRIGGER update_user_registrations_updated_at
  BEFORE UPDATE ON user_registrations
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_registration();

-- Function to approve user registration
CREATE OR REPLACE FUNCTION approve_user_registration(
  registration_id_param uuid,
  action_param text,
  company_id_param uuid DEFAULT NULL,
  notes_param text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  registration_record user_registrations%ROWTYPE;
  new_user_id uuid;
  approval_log_id uuid;
BEGIN
  -- Get the registration record
  SELECT * INTO registration_record
  FROM user_registrations
  WHERE id = registration_id_param AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Registration not found or already processed');
  END IF;
  
  -- Create the user in auth (this would be handled by the application)
  -- For now, we'll create a placeholder user_id
  new_user_id := gen_random_uuid();
  
  -- Create user record
  INSERT INTO users (
    id,
    email,
    role,
    company_id,
    approval_status,
    approved_by,
    approved_at,
    created_at
  ) VALUES (
    new_user_id,
    registration_record.email,
    'user',
    CASE WHEN action_param = 'approved_with_company' THEN company_id_param ELSE NULL END,
    'approved',
    current_user_id(),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
  
  -- Create user profile
  INSERT INTO user_profiles (
    user_id,
    first_name,
    last_name,
    full_name,
    phone,
    bio,
    department,
    position,
    employee_id,
    profile_picture_url
  ) VALUES (
    new_user_id,
    registration_record.first_name,
    registration_record.last_name,
    registration_record.full_name,
    registration_record.phone,
    registration_record.bio,
    registration_record.department,
    registration_record.position,
    registration_record.employee_id,
    registration_record.profile_picture_url
  );
  
  -- Update registration status
  UPDATE user_registrations
  SET status = 'approved', updated_at = CURRENT_TIMESTAMP
  WHERE id = registration_id_param;
  
  -- Log the approval
  INSERT INTO approval_logs (
    registration_id,
    user_id,
    approved_by,
    action,
    company_id,
    notes
  ) VALUES (
    registration_id_param,
    new_user_id,
    current_user_id(),
    action_param,
    company_id_param,
    notes_param
  ) RETURNING id INTO approval_log_id;
  
  RETURN json_build_object(
    'success', true,
    'user_id', new_user_id,
    'approval_log_id', approval_log_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject user registration
CREATE OR REPLACE FUNCTION reject_user_registration(
  registration_id_param uuid,
  notes_param text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  registration_record user_registrations%ROWTYPE;
  approval_log_id uuid;
BEGIN
  -- Get the registration record
  SELECT * INTO registration_record
  FROM user_registrations
  WHERE id = registration_id_param AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Registration not found or already processed');
  END IF;
  
  -- Update registration status
  UPDATE user_registrations
  SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
  WHERE id = registration_id_param;
  
  -- Log the rejection
  INSERT INTO approval_logs (
    registration_id,
    approved_by,
    action,
    notes
  ) VALUES (
    registration_id_param,
    current_user_id(),
    'rejected',
    notes_param
  ) RETURNING id INTO approval_log_id;
  
  RETURN json_build_object(
    'success', true,
    'approval_log_id', approval_log_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_registrations_status ON user_registrations(status);
CREATE INDEX IF NOT EXISTS idx_user_registrations_email ON user_registrations(email);
CREATE INDEX IF NOT EXISTS idx_approval_logs_registration_id ON approval_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_approval_logs_approved_by ON approval_logs(approved_by);
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);