-- Enable Realtime for Group Messages Only
-- This migration only enables real-time functionality for group messaging

-- Add group_messages table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;

-- Add group_files table to realtime publication for file sharing
ALTER PUBLICATION supabase_realtime ADD TABLE group_files;

-- Add group_members table to realtime publication for member updates
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;

-- Grant necessary permissions for realtime
GRANT SELECT ON group_messages TO anon, authenticated;
GRANT SELECT ON group_files TO anon, authenticated;
GRANT SELECT ON group_members TO anon, authenticated;
