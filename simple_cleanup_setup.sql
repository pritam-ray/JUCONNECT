-- Simple cleanup system for group messages and files
-- Run this directly in Supabase SQL Editor

-- 1. First, create the cleanup function
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
  
  -- Delete old messages
  DELETE FROM group_messages
  WHERE created_at < cutoff_date;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
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

-- 2. Create cleanup logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  deleted_count integer DEFAULT 0,
  details jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- 3. Create simple indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at 
ON group_messages(created_at DESC);

-- 4. Enable RLS on cleanup logs
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- 5. Add policy for cleanup logs
CREATE POLICY "Service role can access cleanup logs" ON cleanup_logs
  FOR ALL USING (auth.role() = 'service_role');

-- 6. Test the cleanup function (optional - this will delete old data!)
-- SELECT cleanup_old_group_data();

-- 7. Check what would be deleted (safe test query)
SELECT 
  COUNT(*) as total_old_messages,
  COUNT(*) FILTER (WHERE message_type = 'file') as old_file_messages
FROM group_messages 
WHERE created_at < (NOW() - INTERVAL '14 days');
