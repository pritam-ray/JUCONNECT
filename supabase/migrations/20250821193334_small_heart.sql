/*
  # Class Group System Implementation

  1. New Tables
    - `class_groups` - Store class group information
    - `group_members` - Track group membership and roles
    - `group_messages` - Group-specific chat messages
    - `group_files` - File sharing within groups
    - `group_announcements` - Group announcements system

  2. Security
    - RLS policies for group-based access control
    - Role-based permissions (admin, member)
    - File access restrictions

  3. Performance
    - Optimized indexes for group queries
    - Efficient message retrieval
*/

-- Class groups table
CREATE TABLE IF NOT EXISTS class_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  year integer NOT NULL CHECK (year >= 1 AND year <= 6),
  section text NOT NULL,
  subject text,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  member_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(year, section, subject)
);

-- Group members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(group_id, user_id)
);

-- Group messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'link', 'announcement')),
  file_url text,
  file_name text,
  file_size bigint,
  is_pinned boolean DEFAULT false,
  reply_to uuid REFERENCES group_messages(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Group files table
CREATE TABLE IF NOT EXISTS group_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  category text DEFAULT 'general' CHECK (category IN ('assignment', 'notes', 'syllabus', 'general')),
  description text,
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Group announcements table
CREATE TABLE IF NOT EXISTS group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_important boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Message read status table
CREATE TABLE IF NOT EXISTS group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_groups_year_section ON class_groups(year, section);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_files_group_id ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_announcements_group_id ON group_announcements(group_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_message ON group_message_reads(message_id);

-- Enable RLS
ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

-- Class groups policies
CREATE POLICY "Anyone can view active groups" ON class_groups
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can create groups" ON class_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND created_by = auth.uid());

CREATE POLICY "Group creators can update their groups" ON class_groups
  FOR UPDATE USING (created_by = auth.uid());

-- Group members policies
CREATE POLICY "Group members can view membership" ON group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Group admins can manage members" ON group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_members.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
      AND gm.is_active = true
    )
  );

-- Group messages policies
CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_messages.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Users can update their own messages" ON group_messages
  FOR UPDATE USING (user_id = auth.uid());

-- Group files policies
CREATE POLICY "Group members can view files" ON group_files
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_files.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can upload files" ON group_files
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_files.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

-- Group announcements policies
CREATE POLICY "Group members can view announcements" ON group_announcements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_announcements.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.is_active = true
    )
  );

CREATE POLICY "Group admins can manage announcements" ON group_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_announcements.group_id 
      AND gm.user_id = auth.uid() 
      AND gm.role = 'admin'
      AND gm.is_active = true
    )
  );

-- Message reads policies
CREATE POLICY "Users can manage their own read status" ON group_message_reads
  FOR ALL USING (user_id = auth.uid());

-- Functions for group management
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE class_groups 
    SET member_count = member_count + 1 
    WHERE id = NEW.group_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE class_groups 
      SET member_count = member_count - 1 
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE class_groups 
      SET member_count = member_count + 1 
      WHERE id = NEW.group_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE class_groups 
    SET member_count = member_count - 1 
    WHERE id = OLD.group_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger for member count updates
CREATE TRIGGER update_group_member_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_group_member_count();

-- Function to get user's groups
CREATE OR REPLACE FUNCTION get_user_groups(user_id uuid)
RETURNS TABLE (
  group_id uuid,
  group_name text,
  group_description text,
  year integer,
  section text,
  subject text,
  member_count integer,
  user_role text,
  unread_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cg.id,
    cg.name,
    cg.description,
    cg.year,
    cg.section,
    cg.subject,
    cg.member_count,
    gm.role,
    COALESCE(unread.count, 0) as unread_count
  FROM class_groups cg
  JOIN group_members gm ON cg.id = gm.group_id
  LEFT JOIN (
    SELECT 
      gm2.group_id,
      COUNT(gm2.id) as count
    FROM group_messages gm2
    LEFT JOIN group_message_reads gmr ON gm2.id = gmr.message_id AND gmr.user_id = get_user_groups.user_id
    WHERE gmr.id IS NULL
    AND gm2.user_id != get_user_groups.user_id
    GROUP BY gm2.group_id
  ) unread ON cg.id = unread.group_id
  WHERE gm.user_id = get_user_groups.user_id 
  AND gm.is_active = true
  AND cg.is_active = true
  ORDER BY cg.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_class_groups_updated_at
  BEFORE UPDATE ON class_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_messages_updated_at
  BEFORE UPDATE ON group_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_announcements_updated_at
  BEFORE UPDATE ON group_announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();