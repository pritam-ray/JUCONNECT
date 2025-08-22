-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- This will set up the cleanup system without complex indexes

-- Step 1: Create cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_group_data()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  cutoff_date timestamptz;
  deleted_count integer := 0;
BEGIN
  cutoff_date := NOW() - INTERVAL '14 days';
  
  DELETE FROM group_messages
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'deleted_messages', deleted_count,
    'cutoff_date', cutoff_date,
    'cleanup_date', NOW()
  );
END;
$$;

-- Step 2: Test what would be cleaned up (safe query)
SELECT 
  COUNT(*) as messages_older_than_2_weeks,
  COUNT(*) FILTER (WHERE message_type = 'file') as old_files
FROM group_messages 
WHERE created_at < (NOW() - INTERVAL '14 days');

-- Step 3: Run cleanup (uncomment to actually delete old data)
-- SELECT cleanup_old_group_data();
