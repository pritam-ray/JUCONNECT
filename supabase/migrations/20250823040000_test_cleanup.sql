-- Test cleanup functionality
-- This migration can be used to test the cleanup system manually

-- Test the cleanup function
DO $$
DECLARE
  result jsonb;
BEGIN
  -- Call the cleanup function
  SELECT cleanup_old_group_data() INTO result;
  
  -- Log the result
  RAISE NOTICE 'Cleanup test result: %', result;
END $$;

-- Check cleanup logs
SELECT 
  operation_type,
  deleted_count,
  details,
  created_at
FROM cleanup_logs
ORDER BY created_at DESC
LIMIT 5;

-- Show some statistics about group messages
SELECT 
  message_type,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '14 days') as old_messages,
  COUNT(*) FILTER (WHERE message_type = 'file' AND file_url IS NOT NULL) as files_total,
  COUNT(*) FILTER (WHERE message_type = 'file' AND file_url IS NOT NULL AND created_at < NOW() - INTERVAL '14 days') as files_old
FROM group_messages
GROUP BY message_type;

-- Comment for manual testing:
-- To manually trigger cleanup, run: SELECT cleanup_old_group_data();
-- To check what would be deleted without actually deleting, run:
-- SELECT id, message_type, file_url, created_at 
-- FROM group_messages 
-- WHERE created_at < NOW() - INTERVAL '14 days';
