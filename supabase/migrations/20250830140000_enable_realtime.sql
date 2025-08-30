-- Enable Realtime for Group Messages
-- This migration enables real-time functionality for group messaging

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

-- Ensure proper RLS for realtime
-- Group messages realtime policy
CREATE POLICY "Realtime group messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

-- Group files realtime policy  
CREATE POLICY "Realtime group files" ON group_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_files.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );
