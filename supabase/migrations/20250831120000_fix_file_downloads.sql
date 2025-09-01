-- Fix file download issues - Migration
-- Date: 2025-08-31
-- Description: Create proper file handling and group access for downloads

BEGIN;

-- Ensure group_files table exists with proper structure
CREATE TABLE IF NOT EXISTS group_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES class_groups(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

-- Add user_id column if it doesn't exist (for compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'group_files' AND column_name = 'user_id') THEN
        ALTER TABLE group_files ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        -- Update user_id to match uploaded_by for existing records
        UPDATE group_files SET user_id = uploaded_by WHERE user_id IS NULL;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_files_group_id ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_uploaded_by ON group_files(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_group_files_user_id ON group_files(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_group_active ON group_members(user_id, group_id, is_active);

-- Enable RLS on group_files
ALTER TABLE group_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for group_files
DROP POLICY IF EXISTS "group_files_select_policy" ON group_files;
CREATE POLICY "group_files_select_policy" ON group_files
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_files.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.is_active = true
  )
);

DROP POLICY IF EXISTS "group_files_insert_policy" ON group_files;
CREATE POLICY "group_files_insert_policy" ON group_files
FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM group_members gm 
    WHERE gm.group_id = group_files.group_id 
    AND gm.user_id = auth.uid() 
    AND gm.is_active = true
  )
);

DROP POLICY IF EXISTS "group_files_delete_policy" ON group_files;
CREATE POLICY "group_files_delete_policy" ON group_files
FOR DELETE USING (user_id = auth.uid());

-- Ensure group_messages table has proper file handling
-- Update any malformed file URLs (if they exist)
UPDATE group_messages 
SET file_url = CASE 
  WHEN file_url IS NOT NULL 
   AND file_url != '' 
   AND NOT file_url LIKE 'http%' 
   AND message_type = 'file'
  THEN CONCAT('https://mnycotjmvsairaqgjaux.supabase.co/storage/v1/object/public/group-files/', file_url)
  ELSE file_url
END
WHERE message_type = 'file' AND file_url IS NOT NULL;

COMMIT;
