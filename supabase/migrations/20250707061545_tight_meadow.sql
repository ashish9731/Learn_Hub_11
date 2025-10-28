/*
  # Fix Authentication Database Error

  1. Problem
    - "Database error updating user" during signup/login
    - Error occurs in the createUser function when trying to update user records
    - Constraint violations when handling existing users

  2. Solution
    - Improve user creation and update logic
    - Fix the createUser function to properly handle existing users
    - Ensure proper error handling for constraint violations
    - Add explicit schema references to avoid search_path issues
*/

-- Set search_path explicitly for the migration
SET search_path = public;

-- Create a more robust function to handle user creation with proper conflict handling
CREATE OR REPLACE FUNCTION public.create_user_safely(
    p_id UUID,
    p_email TEXT,
    p_role public.user_role DEFAULT 'user',
    p_company_id UUID DEFAULT NULL
)
RETURNS public.users AS $$
DECLARE
    result_user public.users;
BEGIN
    -- First try to insert the new user
    BEGIN
        INSERT INTO public.users (id, email, role, company_id)
        VALUES (p_id, p_email, p_role, p_company_id)
        RETURNING * INTO result_user;
        
        RETURN result_user;
    EXCEPTION 
        WHEN unique_violation THEN
            -- Check which constraint was violated
            IF SQLERRM LIKE '%users_email_key%' THEN
                -- Email already exists, fetch and return the existing user
                SELECT * INTO result_user
                FROM public.users
                WHERE email = p_email;
                
                RETURN result_user;
            ELSIF SQLERRM LIKE '%users_pkey%' THEN
                -- ID already exists, fetch and return the existing user
                SELECT * INTO result_user
                FROM public.users
                WHERE id = p_id;
                
                RETURN result_user;
            ELSE
                -- Some other unique constraint violation
                RAISE EXCEPTION 'Unexpected unique constraint violation: %', SQLERRM;
            END IF;
    END;
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error in create_user_safely: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix handle_new_user function to use our improved create_user_safely function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_user public.users;
BEGIN
    -- Create user with improved conflict handling
    SELECT * INTO new_user FROM public.create_user_safely(
        NEW.id, 
        NEW.email, 
        'user'
    );
    
    -- Create profile
    BEGIN
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
            first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', public.user_profiles.first_name),
            last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', public.user_profiles.last_name),
            full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', public.user_profiles.full_name);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating profile in handle_new_user: %', SQLERRM;
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE NOTICE 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix ensure_user_exists function to use our improved create_user_safely function
CREATE OR REPLACE FUNCTION public.ensure_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    user_exists boolean;
    user_email text;
    new_user public.users;
BEGIN
    -- Check if user exists in users table
    SELECT EXISTS (
        SELECT 1 FROM public.users WHERE id = NEW.user_id
    ) INTO user_exists;
    
    -- If user doesn't exist, try to create them
    IF NOT user_exists THEN
        -- Get email from auth.users
        SELECT email INTO user_email
        FROM auth.users
        WHERE id = NEW.user_id;
        
        IF user_email IS NOT NULL THEN
            -- Create the user with our improved function
            SELECT * INTO new_user FROM public.create_user_safely(
                NEW.user_id, 
                user_email, 
                'user'
            );
            
            RAISE NOTICE 'Created missing user % with email %', NEW.user_id, user_email;
        ELSE
            RAISE EXCEPTION 'Cannot create user profile: User ID % not found in auth.users', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error in ensure_user_exists: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate the triggers to use our improved functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS ensure_user_before_profile ON public.user_profiles;
CREATE TRIGGER ensure_user_before_profile
    BEFORE INSERT ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_user_exists();

-- Update statistics for better query planning
ANALYZE public.users;
ANALYZE public.user_profiles;