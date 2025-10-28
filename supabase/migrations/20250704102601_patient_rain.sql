/*
  # Fix RLS Policy Violation for Users Table
  
  1. Problem
    - "new row violates row-level security policy for table users" error
    - Super admin cannot create new users due to RLS restrictions
    - Existing policies are too restrictive
  
  2. Solution
    - Create a special policy that allows super admins to create any user
    - Fix the user creation flow to properly handle RLS
    - Ensure proper access control while allowing necessary operations
*/

-- First, check if we have any super admin users
DO $$
DECLARE
    super_admin_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO super_admin_count FROM users WHERE role = 'super_admin';
    
    IF super_admin_count = 0 THEN
        -- Create a super admin user if none exists
        INSERT INTO users (email, role)
        VALUES ('admin@example.com', 'super_admin')
        ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
        
        RAISE NOTICE 'Created super admin user with email admin@example.com';
    END IF;
END $$;

-- Drop existing problematic policies
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check and drop users_insert_own
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'users_insert_own'
    ) INTO policy_exists;
    
    IF policy_exists THEN
        DROP POLICY "users_insert_own" ON users;
    END IF;
END $$;

-- Create a new policy that allows super admins to create any user
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if super_admin_create_users exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'super_admin_create_users'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "super_admin_create_users"
          ON users
          FOR INSERT
          TO authenticated
          WITH CHECK (
            -- Allow super admins to create any user
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'super_admin'
            )
            -- Also allow users to create their own record (for signup)
            OR auth.uid() = id
          );
    END IF;
END $$;

-- Create a policy that allows super admins to update any user
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if super_admin_update_users exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'super_admin_update_users'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "super_admin_update_users"
          ON users
          FOR UPDATE
          TO authenticated
          USING (
            -- Allow super admins to update any user
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'super_admin'
            )
            -- Also allow users to update their own record
            OR auth.uid() = id
          )
          WITH CHECK (
            -- Allow super admins to update any user
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'super_admin'
            )
            -- Also allow users to update their own record
            OR auth.uid() = id
          );
    END IF;
END $$;

-- Create a policy that allows super admins to delete any user
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if super_admin_delete_users exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'super_admin_delete_users'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "super_admin_delete_users"
          ON users
          FOR DELETE
          TO authenticated
          USING (
            -- Allow super admins to delete any user
            EXISTS (
                SELECT 1 FROM users
                WHERE users.id = auth.uid()
                AND users.role = 'super_admin'
            )
          );
    END IF;
END $$;

-- Fix user_profiles policies to allow super admin to create/update profiles
DO $$ 
DECLARE
    policy_exists BOOLEAN;
BEGIN
    -- Check if super_admin_manage_profiles exists
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'super_admin_manage_profiles'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        CREATE POLICY "super_admin_manage_profiles"
          ON user_profiles
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
    END IF;
END $$;

-- Update statistics for better query planning
ANALYZE users;
ANALYZE user_profiles;