-- Enable Realtime for Group Messages
-- This migration enables real-time functionality for group messaging

-- Add group_messages table to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'group_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
    END IF;
END $$;

-- Add group_files table to realtime publication if not already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'group_files'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE group_files;
    END IF;
END $$;

-- Add group_members table to realtime publication for member updates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'group_members'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
    END IF;
END $$;

-- Grant necessary permissions for realtime
GRANT SELECT ON group_messages TO anon, authenticated;
GRANT SELECT ON group_files TO anon, authenticated;
GRANT SELECT ON group_members TO anon, authenticated;

-- Ensure proper RLS for realtime
-- Group messages realtime policy
DROP POLICY IF EXISTS "Realtime group messages" ON group_messages;
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
DROP POLICY IF EXISTS "Realtime group files" ON group_files;
CREATE POLICY "Realtime group files" ON group_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_files.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );
