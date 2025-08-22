-- ULTRA SIMPLE CLEANUP - COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- This version has NO indexes or complex functions to avoid any IMMUTABLE errors

-- Step 1: Create the most basic cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_group_data()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  -- Delete messages older than 2 weeks
  DELETE FROM group_messages
  WHERE created_at < (NOW() - INTERVAL '14 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN 'Deleted ' || deleted_count || ' messages older than 2 weeks';
END;
$$;

-- Step 2: Check what would be deleted (SAFE - this just counts, doesn't delete anything)
SELECT 
  COUNT(*) as total_old_messages,
  COUNT(CASE WHEN message_type = 'file' THEN 1 END) as old_file_messages,
  MIN(created_at) as oldest_message,
  MAX(created_at) as newest_old_message
FROM group_messages 
WHERE created_at < (NOW() - INTERVAL '14 days');

-- Step 3: To actually run the cleanup, uncomment and run this line:
-- SELECT cleanup_old_group_data();

-- That's it! No indexes, no complex functions, just basic cleanup.
