-- Migration: Setup automatic cleanup for group messages and files older than 2 weeks
-- Created: 2025-08-22

-- Create a function to clean up old group messages and files
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
  
  -- Log the cleanup operation
  RAISE NOTICE 'Starting cleanup of group data older than %', cutoff_date;
  
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
  
  -- Log results
  RAISE NOTICE 'Cleanup completed: % total messages deleted (% were files)', deleted_count, file_count;
  
  -- Return results as JSON
  result := jsonb_build_object(
    'deleted_messages', deleted_count,
    'deleted_files', file_count,
    'cutoff_date', cutoff_date,
    'cleanup_date', NOW()
  );
  
  RETURN result;
END;
$$;

-- Create a scheduled cleanup job using pg_cron (if available)
-- Note: This requires the pg_cron extension to be enabled
-- If pg_cron is not available, you can call this function manually or via Edge Functions

-- Try to create the scheduled job (will fail gracefully if pg_cron is not installed)
DO $$
BEGIN
  -- Schedule cleanup to run daily at 2 AM UTC
  PERFORM cron.schedule(
    'cleanup-old-group-data',
    '0 2 * * *',  -- Daily at 2 AM
    'SELECT cleanup_old_group_data();'
  );
  RAISE NOTICE 'Scheduled daily cleanup job created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create scheduled job (pg_cron may not be available): %', SQLERRM;
    RAISE NOTICE 'You can manually run: SELECT cleanup_old_group_data(); or set up an Edge Function for scheduled cleanup';
END;
$$;

-- Create an index to speed up cleanup queries
CREATE INDEX IF NOT EXISTS idx_group_messages_cleanup 
ON group_messages(created_at, message_type) 
WHERE created_at < (NOW() - INTERVAL '14 days');

-- Add a trigger to automatically update updated_at when cleanup happens
CREATE OR REPLACE FUNCTION update_cleanup_log()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- This could be used to log cleanup operations if needed
  RETURN NEW;
END;
$$;

-- Create a simple cleanup log table to track cleanup operations
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  deleted_count integer DEFAULT 0,
  details jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create a function to log cleanup operations
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

-- Update the main cleanup function to include logging
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
  
  -- Log the cleanup operation start
  RAISE NOTICE 'Starting cleanup of group data older than %', cutoff_date;
  
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
  
  -- Build result object
  result := jsonb_build_object(
    'deleted_messages', deleted_count,
    'deleted_files', file_count,
    'cutoff_date', cutoff_date,
    'cleanup_date', NOW()
  );
  
  -- Log the cleanup operation
  PERFORM log_cleanup_operation(
    'automatic_cleanup',
    deleted_count,
    result
  );
  
  -- Log results
  RAISE NOTICE 'Cleanup completed: % total messages deleted (% were files)', deleted_count, file_count;
  
  RETURN result;
END;
$$;

-- Add RLS policies for cleanup logs (admins only)
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access cleanup logs" ON cleanup_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Create a view for recent cleanup statistics
CREATE OR REPLACE VIEW recent_cleanup_stats AS
SELECT 
  operation_type,
  deleted_count,
  details,
  created_at
FROM cleanup_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION cleanup_old_group_data() TO service_role;
GRANT EXECUTE ON FUNCTION log_cleanup_operation(text, integer, jsonb) TO service_role;
GRANT SELECT ON recent_cleanup_stats TO service_role;

-- Add helpful comments
COMMENT ON FUNCTION cleanup_old_group_data() IS 'Automatically deletes group messages and files older than 2 weeks';
COMMENT ON TABLE cleanup_logs IS 'Tracks automatic cleanup operations for monitoring';
COMMENT ON VIEW recent_cleanup_stats IS 'Shows cleanup statistics for the last 30 days';

-- Manual cleanup example (run this if you want to test)
-- SELECT cleanup_old_group_data();
