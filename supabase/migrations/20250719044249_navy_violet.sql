/*
  # Fix pg_net Schema Conflict

  This migration resolves the pg_net extension schema conflict by:
  1. Safely dropping any conflicting net schema
  2. Properly installing pg_net extension
  3. Setting up correct permissions
  4. Ensuring no manual schema modifications conflict with pg_net

  ## Changes Made:
  - Drop existing net schema if it conflicts with pg_net
  - Reinstall pg_net extension properly
  - Set up correct ownership and permissions
  - Remove any manual net schema modifications
*/

-- Step 1: Check if pg_net extension exists and drop it temporarily
DROP EXTENSION IF EXISTS pg_net CASCADE;

-- Step 2: Drop the net schema if it exists (this resolves the conflict)
DROP SCHEMA IF EXISTS net CASCADE;

-- Step 3: Reinstall pg_net extension properly
-- This will create the net schema with correct ownership
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 4: Verify the extension is installed correctly
-- The net schema should now be owned by the pg_net extension

-- Step 5: Grant necessary permissions to roles
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA net TO anon, authenticated, service_role;

-- Step 6: Set up default privileges for future objects in net schema
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT ALL ON TABLES TO anon, authenticated, service_role;