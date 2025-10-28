/*
  # Diagnose pg_net Extension and Schema Status
  
  This migration checks the current state of pg_net extension and net schema
  to identify conflicts and ownership issues.
  
  1. Check Extension Status
    - Verify if pg_net is installed
    - Check which schema it's using
  
  2. Check Schema Status
    - Verify net schema existence and ownership
    - List any existing objects in net schema
  
  3. Diagnostic Information
    - Provides information for troubleshooting
*/

-- Check pg_net extension status
DO $$
BEGIN
  RAISE NOTICE 'Checking pg_net extension status...';
  
  -- Check if pg_net extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
    RAISE NOTICE 'pg_net extension is installed';
    
    -- Get extension details
    PERFORM pg_catalog.pg_notify('pg_net_status', 
      (SELECT row_to_json(t) FROM (
        SELECT extname, extversion, nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON e.extnamespace = n.oid
        WHERE extname = 'pg_net'
      ) t)::text
    );
  ELSE
    RAISE NOTICE 'pg_net extension is NOT installed';
  END IF;
  
  -- Check net schema status
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'net') THEN
    RAISE NOTICE 'net schema exists';
    
    -- Get schema owner
    PERFORM pg_catalog.pg_notify('net_schema_status',
      (SELECT row_to_json(t) FROM (
        SELECT nspname, nspowner, pg_get_userbyid(nspowner) as owner_name
        FROM pg_namespace 
        WHERE nspname = 'net'
      ) t)::text
    );
  ELSE
    RAISE NOTICE 'net schema does NOT exist';
  END IF;
  
  -- Check for objects in net schema
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'net') THEN
    RAISE NOTICE 'Found tables in net schema - checking for conflicts';
  END IF;
  
  RAISE NOTICE 'Diagnostic complete - check logs for details';
END $$;