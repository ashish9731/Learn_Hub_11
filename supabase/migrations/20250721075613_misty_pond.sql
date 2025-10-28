/*
  # Create temporary passwords table

  1. New Tables
    - `temp_passwords`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `email` (text)
      - `full_name` (text)
      - `role` (user_role enum)
      - `temp_password` (text)
      - `is_used` (boolean, default false)
      - `created_at` (timestamp)
      - `created_by` (uuid, foreign key to users)

  2. Security
    - Enable RLS on `temp_passwords` table
    - Add policy for super admins to manage all temp passwords
    - Add policy for users to view their own temp password

  3. Indexes
    - Add index on user_id for faster lookups
    - Add index on email for searching
    - Add index on is_used for filtering
*/

CREATE TABLE IF NOT EXISTS temp_passwords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role user_role NOT NULL,
  temp_password text NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE temp_passwords ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "temp_passwords_super_admin_all"
  ON temp_passwords
  FOR ALL
  TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "temp_passwords_user_read_own"
  ON temp_passwords
  FOR SELECT
  TO authenticated
  USING (user_id = current_user_id());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_temp_passwords_user_id ON temp_passwords(user_id);
CREATE INDEX IF NOT EXISTS idx_temp_passwords_email ON temp_passwords(email);
CREATE INDEX IF NOT EXISTS idx_temp_passwords_is_used ON temp_passwords(is_used);
CREATE INDEX IF NOT EXISTS idx_temp_passwords_created_at ON temp_passwords(created_at DESC);