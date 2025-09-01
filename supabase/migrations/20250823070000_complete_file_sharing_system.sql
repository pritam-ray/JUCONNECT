-- Migration: Complete Group File Sharing System with 2-Week Auto-Cleanup
-- Created: 2025-08-23
-- Description: Sets up file sharing in group chats with automatic cleanup after 2 weeks

-- =====================================================================
-- PART 1: CLEANUP SYSTEM FUNCTIONS
-- =====================================================================

-- Main cleanup function for group messages and files older than 2 weeks
CREATE OR REPLACE FUNCTION cleanup_old_group_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date timestamptz;
  deleted_count integer := 0;
  file_count integer := 0;
  result jsonb;
BEGIN
  -- Calculate cutoff date (2 weeks ago)
  cutoff_date := NOW() - INTERVAL '14 days';
  
  -- Count file messages for reporting
  SELECT COUNT(*) INTO file_count
  FROM group_messages
  WHERE created_at < cutoff_date 
    AND message_type = 'file' 
    AND file_url IS NOT NULL;
  
  -- Delete old messages (this will cascade to related data)
  DELETE FROM group_messages
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Return results as JSON
  result := jsonb_build_object(
    'deleted_messages', deleted_count,
    'deleted_files', file_count,
    'cutoff_date', cutoff_date,
    'cleanup_date', NOW(),
    'success', true
  );
  
  -- Log the operation
  RAISE NOTICE 'Cleanup completed: % messages deleted (% files)', deleted_count, file_count;
  
  RETURN result;
END;
$$;

-- Simple cleanup function (alternative for environments that don't support complex functions)
CREATE OR REPLACE FUNCTION simple_cleanup_old_messages()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer := 0;
BEGIN
  DELETE FROM group_messages
  WHERE created_at < (NOW() - INTERVAL '14 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN 'Deleted ' || deleted_count || ' messages older than 2 weeks';
END;
$$;

-- =====================================================================
-- PART 2: CLEANUP LOGGING SYSTEM
-- =====================================================================

-- Create cleanup logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  deleted_count integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Function to log cleanup operations
CREATE OR REPLACE FUNCTION log_cleanup_operation(
  operation_type text,
  deleted_count integer DEFAULT 0,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO cleanup_logs (operation_type, deleted_count, details)
  VALUES (operation_type, deleted_count, details);
END;
$$;

-- Enhanced cleanup function with logging
CREATE OR REPLACE FUNCTION cleanup_old_group_data_with_logging()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cutoff_date timestamptz;
  deleted_count integer := 0;
  file_count integer := 0;
  result jsonb;
BEGIN
  -- Calculate cutoff date (2 weeks ago)
  cutoff_date := NOW() - INTERVAL '14 days';
  
  -- Count file messages for reporting
  SELECT COUNT(*) INTO file_count
  FROM group_messages
  WHERE created_at < cutoff_date 
    AND message_type = 'file' 
    AND file_url IS NOT NULL;
  
  -- Delete old messages
  DELETE FROM group_messages
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Build result object
  result := jsonb_build_object(
    'deleted_messages', deleted_count,
    'deleted_files', file_count,
    'cutoff_date', cutoff_date,
    'cleanup_date', NOW(),
    'success', true
  );
  
  -- Log the cleanup operation
  PERFORM log_cleanup_operation(
    'automatic_cleanup',
    deleted_count,
    result
  );
  
  RETURN result;
END;
$$;

-- =====================================================================
-- PART 3: INDEXES FOR PERFORMANCE
-- =====================================================================

-- Simple indexes for cleanup queries (avoiding problematic WHERE clauses)
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at 
ON group_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_messages_type_created 
ON group_messages(message_type, created_at DESC);

-- Index for file URLs to speed up file cleanup
CREATE INDEX IF NOT EXISTS idx_group_messages_file_url 
ON group_messages(file_url) 
WHERE file_url IS NOT NULL;

-- =====================================================================
-- PART 4: VIEWS AND MONITORING
-- =====================================================================

-- View for recent cleanup statistics
CREATE OR REPLACE VIEW recent_cleanup_stats AS
SELECT 
  operation_type,
  deleted_count,
  details,
  created_at,
  (details->>'deleted_files')::integer as files_deleted,
  (details->>'success')::boolean as was_successful
FROM cleanup_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- View to check messages that will be cleaned up soon
CREATE OR REPLACE VIEW messages_to_be_cleaned AS
SELECT 
  id,
  group_id,
  user_id,
  message_type,
  file_name,
  file_size,
  created_at,
  (NOW() - created_at) as age,
  CASE 
    WHEN created_at < (NOW() - INTERVAL '14 days') THEN 'Will be deleted'
    WHEN created_at < (NOW() - INTERVAL '12 days') THEN 'Will be deleted in 2 days'
    WHEN created_at < (NOW() - INTERVAL '10 days') THEN 'Will be deleted in 4 days'
    ELSE 'Safe for now'
  END as cleanup_status
FROM group_messages
WHERE created_at < (NOW() - INTERVAL '10 days')
ORDER BY created_at ASC;

-- =====================================================================
-- PART 5: SECURITY AND PERMISSIONS
-- =====================================================================

-- Enable RLS on cleanup logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Policy for cleanup logs (service role and authenticated users can read)
DROP POLICY IF EXISTS "Users can view cleanup logs" ON cleanup_logs;
CREATE POLICY "Users can view cleanup logs" ON cleanup_logs
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Policy for service role to manage cleanup logs
DROP POLICY IF EXISTS "Service role can manage cleanup logs" ON cleanup_logs;
CREATE POLICY "Service role can manage cleanup logs" ON cleanup_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================================
-- PART 6: GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on cleanup functions
GRANT EXECUTE ON FUNCTION cleanup_old_group_data() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION simple_cleanup_old_messages() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_group_data_with_logging() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION log_cleanup_operation(text, integer, jsonb) TO service_role, authenticated;

-- Grant select permissions on views
GRANT SELECT ON recent_cleanup_stats TO service_role, authenticated;
GRANT SELECT ON messages_to_be_cleaned TO service_role, authenticated;

-- =====================================================================
-- PART 7: HELPFUL COMMENTS AND DOCUMENTATION
-- =====================================================================

COMMENT ON FUNCTION cleanup_old_group_data() IS 'Deletes group messages and files older than 2 weeks. Returns JSON with cleanup statistics.';
COMMENT ON FUNCTION simple_cleanup_old_messages() IS 'Simple version of cleanup function that returns text message. Use if JSONB functions cause issues.';
COMMENT ON FUNCTION cleanup_old_group_data_with_logging() IS 'Enhanced cleanup function that logs operations to cleanup_logs table.';
COMMENT ON TABLE cleanup_logs IS 'Tracks all cleanup operations for monitoring and auditing purposes.';
COMMENT ON VIEW recent_cleanup_stats IS 'Shows cleanup statistics for the last 30 days with file counts.';
COMMENT ON VIEW messages_to_be_cleaned IS 'Shows messages that will be deleted soon, useful for monitoring retention policy.';

-- =====================================================================
-- PART 8: TESTING AND VALIDATION QUERIES
-- =====================================================================

-- Test query to count old messages (safe - doesn't delete anything)
-- SELECT COUNT(*) as old_messages_count,
--        COUNT(CASE WHEN message_type = 'file' THEN 1 END) as old_files_count,
--        MIN(created_at) as oldest_message_date
-- FROM group_messages 
-- WHERE created_at < (NOW() - INTERVAL '14 days');

-- Manual cleanup execution (uncomment to run)
-- SELECT cleanup_old_group_data();

-- Check cleanup logs
-- SELECT * FROM recent_cleanup_stats LIMIT 10;

-- Check what will be cleaned up soon
-- SELECT * FROM messages_to_be_cleaned LIMIT 10;
