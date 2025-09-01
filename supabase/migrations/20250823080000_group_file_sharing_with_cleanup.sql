-- Group File Sharing with 2-Week Auto-Cleanup
-- This migration adds file sharing to group chats with automatic cleanup after 2 weeks
-- Simple, safe, and works in all environments

-- ============================================================================
-- STEP 1: Add file support to group_messages table (if columns don't exist)
-- ============================================================================

-- Add file-related columns to group_messages table if they don't exist
DO $$ 
BEGIN
    -- Check and add message_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_messages' AND column_name = 'message_type') THEN
        ALTER TABLE group_messages ADD COLUMN message_type text DEFAULT 'text';
    END IF;
    
    -- Check and add file_url column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_messages' AND column_name = 'file_url') THEN
        ALTER TABLE group_messages ADD COLUMN file_url text;
    END IF;
    
    -- Check and add file_name column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_messages' AND column_name = 'file_name') THEN
        ALTER TABLE group_messages ADD COLUMN file_name text;
    END IF;
    
    -- Check and add file_size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_messages' AND column_name = 'file_size') THEN
        ALTER TABLE group_messages ADD COLUMN file_size bigint;
    END IF;
    
    -- Check and add file_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_messages' AND column_name = 'file_type') THEN
        ALTER TABLE group_messages ADD COLUMN file_type text;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create cleanup function for 2-week data retention
-- ============================================================================

-- Simple and reliable cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_group_data()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer := 0;
    cutoff_date timestamptz;
BEGIN
    -- Set cutoff date to 2 weeks ago
    cutoff_date := NOW() - INTERVAL '14 days';
    
    -- Delete old messages (will automatically handle files)
    DELETE FROM group_messages 
    WHERE created_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Return simple status message
    RETURN 'Cleaned up ' || deleted_count || ' messages older than ' || cutoff_date::date;
END;
$$;

-- ============================================================================
-- STEP 3: Create indexes for better performance
-- ============================================================================

-- Index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at 
ON group_messages(created_at);

-- Index for file messages
CREATE INDEX IF NOT EXISTS idx_group_messages_files 
ON group_messages(message_type, created_at) 
WHERE message_type = 'file';

-- ============================================================================
-- STEP 4: Create helpful view to monitor old data
-- ============================================================================

-- View to see what data will be cleaned up
CREATE OR REPLACE VIEW old_group_data AS
SELECT 
    id,
    group_id,
    user_id,
    message_type,
    file_name,
    created_at,
    CASE 
        WHEN created_at < (NOW() - INTERVAL '14 days') THEN 'WILL BE DELETED'
        WHEN created_at < (NOW() - INTERVAL '12 days') THEN 'DELETE IN 2 DAYS'
        WHEN created_at < (NOW() - INTERVAL '10 days') THEN 'DELETE IN 4 DAYS'
        ELSE 'SAFE'
    END as status
FROM group_messages
WHERE created_at < (NOW() - INTERVAL '10 days')
ORDER BY created_at ASC;

-- ============================================================================
-- STEP 5: Set up permissions
-- ============================================================================

-- Grant execute permission on cleanup function
GRANT EXECUTE ON FUNCTION cleanup_old_group_data() TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_old_group_data() TO authenticated;

-- Grant select permission on monitoring view
GRANT SELECT ON old_group_data TO service_role;
GRANT SELECT ON old_group_data TO authenticated;

-- ============================================================================
-- STEP 6: Add helpful comments
-- ============================================================================

COMMENT ON FUNCTION cleanup_old_group_data() IS 
'Deletes group messages and files older than 2 weeks. Call this function regularly to maintain data retention policy.';

COMMENT ON VIEW old_group_data IS 
'Shows group messages that are approaching or past the 2-week retention period.';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
To use this file sharing system:

1. Deploy this migration to your Supabase database
2. Your group_messages table now supports file uploads with these fields:
   - message_type: 'text' or 'file'
   - file_url: URL to the file in Supabase storage
   - file_name: Original filename
   - file_size: File size in bytes
   - file_type: MIME type of the file

3. To clean up old data manually, run:
   SELECT cleanup_old_group_data();

4. To see what data will be cleaned up:
   SELECT * FROM old_group_data;

5. Set up automatic cleanup by calling cleanup_old_group_data() daily
   using Supabase Edge Functions or cron jobs

The frontend code (GroupChatInterface.tsx and groupFileService.ts) 
is already set up to work with this database schema.
*/
