-- Fix file download issues in group chat
-- Date: 2025-08-31
-- Description: Ensure file URLs and group member access are working correctly

BEGIN;

-- Ensure file URLs in group_messages are properly formatted
UPDATE group_messages 
SET file_url = CASE 
  WHEN file_url IS NOT NULL AND file_url != '' AND NOT file_url LIKE 'http%' 
  THEN 'https://your-project.supabase.co/storage/v1/object/public/group-files/' || file_url
  ELSE file_url
END
WHERE message_type = 'file' AND file_url IS NOT NULL;

-- Ensure group_members table has proper indexes for faster lookup
CREATE INDEX IF NOT EXISTS idx_group_members_user_group_active 
ON group_members(user_id, group_id, is_active);

-- Ensure group_files table exists and is properly structured
CREATE TABLE IF NOT EXISTS group_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Add RLS policies for group_files if not exists
ALTER TABLE group_files ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view files in groups they're members of
CREATE POLICY IF NOT EXISTS "group_files_select_policy" ON group_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_files.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.is_active = true
  )
);

-- Policy: Users can insert files in groups they're members of
CREATE POLICY IF NOT EXISTS "group_files_insert_policy" ON group_files
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_files.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.is_active = true
  )
);

-- Policy: Users can delete their own files
CREATE POLICY IF NOT EXISTS "group_files_delete_policy" ON group_files
FOR DELETE USING (user_id = auth.uid());

-- Ensure storage bucket policies are correct for group-files bucket
-- Note: This needs to be run in Supabase dashboard as well

COMMIT;
