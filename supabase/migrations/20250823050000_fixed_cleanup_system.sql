-- Migration: Setup automatic cleanup for group messages and files older than 2 weeks
-- Created: 2025-08-22 (Fixed version)

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

-- Create a simple index for cleanup queries (without WHERE clause to avoid immutable function issue)
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at 
ON group_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_messages_type_created 
ON group_messages(message_type, created_at DESC);

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
