/*
  # Fix User Profiles Foreign Key Constraint

  1. Problem
    - Foreign key constraint violation when creating user profiles
    - Users need to exist in the users table before profiles can be created
    - Current trigger doesn't ensure users exist in the custom users table

  2. Solution
    - Create a more robust trigger function that ensures users exist
    - Add proper error handling in the trigger function
    - Fix the user profile creation process
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_exists boolean;
BEGIN
    -- First check if user already exists in users table
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = NEW.id
    ) INTO user_exists;

    -- If user doesn't exist in users table, create them
    IF NOT user_exists THEN
        INSERT INTO public.users (id, email, role)
        VALUES (
            NEW.id,
            NEW.email,
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- Now create the user profile
    INSERT INTO public.user_profiles (
        user_id,
        first_name,
        last_name,
        full_name
    ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    )
    ON CONFLICT (user_id) DO UPDATE SET
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', user_profiles.first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', user_profiles.last_name),
        full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', user_profiles.full_name);

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the transaction
        RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
        RETURN NEW;
END;
$$ language 'plpgsql' security definer;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Create a function to sync existing auth users
CREATE OR REPLACE FUNCTION sync_existing_auth_users()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN (SELECT * FROM auth.users) LOOP
        -- Ensure user exists in users table
        INSERT INTO public.users (id, email, role)
        VALUES (
            auth_user.id,
            auth_user.email,
            'user'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Create or update profile
        INSERT INTO public.user_profiles (
            user_id,
            first_name,
            last_name,
            full_name
        ) VALUES (
            auth_user.id,
            COALESCE(auth_user.raw_user_meta_data->>'first_name', ''),
            COALESCE(auth_user.raw_user_meta_data->>'last_name', ''),
            COALESCE(auth_user.raw_user_meta_data->>'full_name', '')
        )
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = COALESCE(auth_user.raw_user_meta_data->>'first_name', user_profiles.first_name),
            last_name = COALESCE(auth_user.raw_user_meta_data->>'last_name', user_profiles.last_name),
            full_name = COALESCE(auth_user.raw_user_meta_data->>'full_name', user_profiles.full_name);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Run the sync function to fix existing users
SELECT sync_existing_auth_users();

-- Drop the sync function after use
DROP FUNCTION sync_existing_auth_users();