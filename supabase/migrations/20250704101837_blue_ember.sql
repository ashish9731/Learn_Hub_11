/*
  # Fix Admin Creation RLS Policies

  1. Problem
    - Current RLS policies prevent super admins from creating new admin users
    - Error: "new row violates row-level security policy for table users"
    - Need to allow super admins to create users with any role

  2. Solution
    - Drop existing problematic policies
    - Create new policies that properly allow super admins to create users
    - Fix admin creation permissions
*/

-- Drop existing problematic policies
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_super_admin_role') THEN
    DROP POLICY "users_super_admin_role" ON users;
  END IF;
  
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'users' AND policyname = 'users_insert_own') THEN
    DROP POLICY "users_insert_own" ON users;
  END IF;
END $$;

-- Create improved super admin policy that allows creating any user
CREATE POLICY "users_super_admin_role" ON users
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );

-- Allow users to insert their own record (for signup)
CREATE POLICY "users_insert_own" ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = id 
      OR 
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );

-- Fix user_profiles policies to allow super admin to create profiles
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'user_profiles_all_own') THEN
    DROP POLICY "user_profiles_all_own" ON user_profiles;
  END IF;
END $$;

CREATE POLICY "user_profiles_all_own" ON user_profiles
    FOR ALL
    TO authenticated
    USING (
      user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    )
    WITH CHECK (
      user_id = auth.uid()
      OR
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'super_admin'
      )
    );

-- Ensure super admin exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE role = 'super_admin') THEN
    INSERT INTO users (email, role)
    VALUES ('admin@example.com', 'super_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
  END IF;
END $$;

-- Update statistics
ANALYZE users;
ANALYZE user_profiles;