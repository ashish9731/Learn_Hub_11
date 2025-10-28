/*
  # Add BYPASSRLS for super_admin role

  1. Changes
     - Adds BYPASSRLS permission to the super_admin role
     - This allows super_admin users to bypass Row Level Security policies
     - Enables super_admin to perform all operations on storage buckets and objects
*/

-- Add BYPASSRLS permission to super_admin role
DO $$
BEGIN
  -- Check if the role exists
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'super_admin') THEN
    -- Grant BYPASSRLS to the role
    EXECUTE 'ALTER ROLE super_admin WITH BYPASSRLS';
  ELSE
    RAISE NOTICE 'Role super_admin does not exist, skipping BYPASSRLS grant';
  END IF;
END
$$;

-- Create storage buckets if they don't exist
DO $$
BEGIN
  -- Create documents bucket if it doesn't exist
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('documents', 'documents', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating documents bucket: %', SQLERRM;
  END;
  
  -- Create podcasts bucket if it doesn't exist
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('podcasts', 'podcasts', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating podcasts bucket: %', SQLERRM;
  END;
  
  -- Create profile-pictures bucket if it doesn't exist
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('profile-pictures', 'profile-pictures', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile-pictures bucket: %', SQLERRM;
  END;
  
  -- Create logo-pictures bucket if it doesn't exist
  BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('logo-pictures', 'logo-pictures', true)
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating logo-pictures bucket: %', SQLERRM;
  END;
END
$$;

-- Add storage policies for all users
DO $$
BEGIN
  -- Allow authenticated users to view objects in all buckets
  BEGIN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES ('Authenticated users can view objects', 'documents', 'SELECT', '(auth.role() = ''authenticated'')')
    ON CONFLICT (name, bucket_id, operation) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating documents SELECT policy: %', SQLERRM;
  END;
  
  BEGIN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES ('Authenticated users can view objects', 'podcasts', 'SELECT', '(auth.role() = ''authenticated'')')
    ON CONFLICT (name, bucket_id, operation) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating podcasts SELECT policy: %', SQLERRM;
  END;
  
  BEGIN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES ('Authenticated users can view objects', 'profile-pictures', 'SELECT', '(auth.role() = ''authenticated'')')
    ON CONFLICT (name, bucket_id, operation) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating profile-pictures SELECT policy: %', SQLERRM;
  END;
  
  BEGIN
    INSERT INTO storage.policies (name, bucket_id, operation, definition)
    VALUES ('Authenticated users can view objects', 'logo-pictures', 'SELECT', '(auth.role() = ''authenticated'')')
    ON CONFLICT (name, bucket_id, operation) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating logo-pictures SELECT policy: %', SQLERRM;
  END;
END
$$;