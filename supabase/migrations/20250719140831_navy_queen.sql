/*
  # Fix RLS Policy for Users Table

  1. Security Changes
    - Add policy to allow authenticated users to insert their own record
    - Ensure users can create their entry when signing up
    - Maintain existing security for other operations

  This fixes the "new row violates row-level security policy" error
  that occurs when authenticated users try to create their database entry.
*/

-- Add policy to allow authenticated users to insert their own record
CREATE POLICY "users_insert_own" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = id);

-- Ensure the policy allows users to read their own data during creation
-- (This might already exist but ensuring it's present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' 
    AND policyname = 'users_read_own'
  ) THEN
    CREATE POLICY "users_read_own"
      ON users
      FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;
END $$;