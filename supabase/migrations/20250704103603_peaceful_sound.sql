/*
  # Fix RLS policies for user access

  This migration fixes the Row Level Security policies for the users and user_profiles tables
  to allow authenticated users to properly access and manage their own data.

  ## Changes Made

  1. **Users Table Policies**
     - Updated policies to allow authenticated users to read their own data
     - Allow users to insert their own records during signup
     - Allow users to update their own records
     - Keep super_admin policies for administrative access

  2. **User Profiles Table Policies**
     - Allow authenticated users to read their own profiles
     - Allow users to insert their own profiles
     - Allow users to update their own profiles
     - Keep super_admin policies for administrative access

  ## Security Notes
  - All policies ensure users can only access their own data
  - Super admin retains full access for administrative purposes
  - Policies use auth.uid() to match against user IDs
*/

-- Drop existing problematic policies for users table
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;

-- Create new policies for users table that work properly
CREATE POLICY "users_select_own" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to select from users table for lookups
CREATE POLICY "users_select_for_lookup" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Drop existing policies for user_profiles table
DROP POLICY IF EXISTS "user_profiles_own_access" ON user_profiles;

-- Create new policies for user_profiles table
CREATE POLICY "user_profiles_select_own" 
  ON user_profiles 
  FOR SELECT 
  TO authenticated 
  USING (auth.uid() = user_id);

CREATE POLICY "user_profiles_insert_own" 
  ON user_profiles 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_update_own" 
  ON user_profiles 
  FOR UPDATE 
  TO authenticated 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_profiles_delete_own" 
  ON user_profiles 
  FOR DELETE 
  TO authenticated 
  USING (auth.uid() = user_id);