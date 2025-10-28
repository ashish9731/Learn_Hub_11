/*
  # Fix users table RLS policies for authentication

  1. Security Updates
    - Add policy for authenticated users to insert their own records
    - This allows new user signup to work properly
    - Maintains security by only allowing users to insert records with their own auth.uid()

  2. Changes
    - Add INSERT policy for authenticated users
    - Users can only insert records where the id matches their auth.uid()
*/

-- Add policy to allow authenticated users to insert their own user record
CREATE POLICY "users_insert_own"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);