-- ===================================================================
-- JU_CONNECT REALTIME MESSAGING SETUP
-- ===================================================================
-- Run this script in your Supabase SQL Editor to enable real-time messaging
-- Dashboard: https://supabase.com/dashboard/project/mnycotjmvsairaqgjaux/sql

-- ===================================================================
-- 1. ENABLE REALTIME PUBLICATION FOR TABLES
-- ===================================================================
-- Add tables to the realtime publication so they can send real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_files; 
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- ===================================================================
-- 2. GRANT NECESSARY PERMISSIONS FOR REALTIME
-- ===================================================================
-- Grant SELECT permissions needed for real-time subscriptions
GRANT SELECT ON group_messages TO anon, authenticated;
GRANT SELECT ON group_files TO anon, authenticated; 
GRANT SELECT ON group_members TO anon, authenticated;

-- ===================================================================
-- 3. VERIFY REALTIME SETUP
-- ===================================================================
-- Check which tables are included in the realtime publication
SELECT 
    schemaname, 
    tablename,
    'Added to realtime publication' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('group_messages', 'group_files', 'group_members');

-- ===================================================================
-- 4. CHECK RLS POLICIES (for debugging)
-- ===================================================================
-- Show current RLS policies to ensure they don't block realtime
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    cmd as operation,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Affects realtime subscriptions'
        ELSE 'Does not affect realtime'
    END as realtime_impact
FROM pg_policies 
WHERE tablename IN ('group_messages', 'group_files', 'group_members')
ORDER BY tablename, policyname;

-- ===================================================================
-- 5. TEST REALTIME CONNECTION (optional)
-- ===================================================================
-- You can run this to insert a test message and verify realtime works
-- UNCOMMENT the following lines to test:

/*
INSERT INTO group_messages (
    group_id, 
    user_id, 
    message, 
    message_type
) VALUES (
    (SELECT id FROM class_groups LIMIT 1),  -- Uses first available group
    (SELECT id FROM profiles LIMIT 1),      -- Uses first available user
    'Real-time test message - ' || NOW(),
    'text'
);
*/

-- ===================================================================
-- INSTRUCTIONS:
-- ===================================================================
-- 1. Copy this entire script
-- 2. Go to: https://supabase.com/dashboard/project/mnycotjmvsairaqgjaux/sql
-- 3. Paste the script in the SQL Editor
-- 4. Click "Run" to execute
-- 5. Check the results to verify realtime is enabled
-- ===================================================================
