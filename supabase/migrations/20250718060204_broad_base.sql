/*
  # Create net schema and configure permissions

  1. Schema Creation
    - Create the `net` schema if it doesn't exist
    - This schema is required for certain Supabase operations

  2. Permissions
    - Grant usage permissions to anon, authenticated, and service_role
    - Grant table and sequence permissions for proper access

  3. Configuration
    - Ensure the schema is properly configured for API access
*/

-- Create the net schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS net;

-- Grant usage permissions on the schema
GRANT USAGE ON SCHEMA net TO anon, authenticated, service_role;

-- Grant permissions on all current and future tables in the schema
GRANT ALL ON ALL TABLES IN SCHEMA net TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA net TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA net TO anon, authenticated, service_role;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA net GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;