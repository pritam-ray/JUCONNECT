-- STEP BY STEP CLEANUP SETUP
-- Copy each section one by one into Supabase SQL Editor

-- ===============================================
-- STEP 1: Copy and run this first
-- ===============================================

CREATE OR REPLACE FUNCTION cleanup_old_group_data()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM group_messages
  WHERE created_at < (NOW() - INTERVAL '14 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN 'Deleted ' || deleted_count || ' messages';
END;
$$;

-- ===============================================
-- STEP 2: Copy and run this to test (safe - just counts)
-- ===============================================

SELECT 
  COUNT(*) as old_messages_count
FROM group_messages 
WHERE created_at < (NOW() - INTERVAL '14 days');

-- ===============================================
-- STEP 3: Copy and run this to actually clean up
-- ===============================================

SELECT cleanup_old_group_data();

-- Done! No complex functions, no indexes, just simple cleanup.
