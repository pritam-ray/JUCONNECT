/*
  # Create class groups system for student collaboration

  1. New Tables
    - `class_groups` - Group information and settings
    - `group_members` - Group membership with roles
    - `group_messages` - Real-time chat messages
    - `group_files` - File sharing within groups
    - `group_message_reads` - Read receipt tracking
    - `group_announcements` - Admin announcements

  2. Security
    - Enable RLS on all group tables
    - Add policies for group access control
    - Add admin management policies

  3. Functions
    - Group creation with auto-admin assignment
    - Member management functions
    - Message and file handling
*/

-- Create class_groups table
CREATE TABLE IF NOT EXISTS class_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  year integer NOT NULL CHECK (year >= 1 AND year <= 5),
  section text NOT NULL,
  subject text,
  semester text DEFAULT 'All',
  is_private boolean DEFAULT false,
  password_hash text,
  is_password_protected boolean GENERATED ALWAYS AS (password_hash IS NOT NULL) STORED,
  max_members integer DEFAULT 100,
  member_count integer DEFAULT 0,
  creator_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Unique constraint for year-section-subject combination
  UNIQUE(year, section, subject)
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicate memberships
  UNIQUE(group_id, user_id)
);

-- Create group_messages table
CREATE TABLE IF NOT EXISTS group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'link', 'announcement')),
  file_url text,
  file_name text,
  file_size bigint,
  file_type text,
  reply_to uuid REFERENCES group_messages(id) ON DELETE SET NULL,
  is_announcement boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create group_message_reads table for read receipts
CREATE TABLE IF NOT EXISTS group_message_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at timestamptz DEFAULT now(),
  
  -- Unique constraint to prevent duplicate reads
  UNIQUE(message_id, user_id)
);

-- Create group_files table
CREATE TABLE IF NOT EXISTS group_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size bigint CHECK (file_size <= 5242880), -- 5MB limit
  file_type text,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('assignment', 'notes', 'syllabus', 'general')),
  download_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create group_announcements table
CREATE TABLE IF NOT EXISTS group_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES class_groups(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  is_important boolean DEFAULT false,
  is_pinned boolean DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_announcements ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_groups_year_section ON class_groups(year, section);
CREATE INDEX IF NOT EXISTS idx_class_groups_creator ON class_groups(creator_id);
CREATE INDEX IF NOT EXISTS idx_class_groups_active ON class_groups(is_active);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_active ON group_members(is_active);

CREATE INDEX IF NOT EXISTS idx_group_messages_group ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_user ON group_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created ON group_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_group_files_group ON group_files(group_id);
CREATE INDEX IF NOT EXISTS idx_group_files_uploader ON group_files(uploaded_by);

-- RLS Policies for class_groups
CREATE POLICY "Anyone can view active public groups"
  ON class_groups
  FOR SELECT
  USING (is_active = true AND is_private = false);

CREATE POLICY "Group members can view private groups"
  ON class_groups
  FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      is_private = false OR
      EXISTS (
        SELECT 1 FROM group_members gm 
        WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.is_active = true
      )
    )
  );

CREATE POLICY "Authenticated users can create groups"
  ON class_groups
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Group creators and admins can update groups"
  ON class_groups
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = id AND gm.user_id = auth.uid() AND gm.role = 'admin' AND gm.is_active = true
    )
  );

-- RLS Policies for group_members
CREATE POLICY "Group members can view membership"
  ON group_members
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

CREATE POLICY "Users can join groups"
  ON group_members
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave groups"
  ON group_members
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for group_messages
CREATE POLICY "Group members can view messages"
  ON group_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can send messages"
  ON group_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

-- RLS Policies for group_files
CREATE POLICY "Group members can view files"
  ON group_files
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can upload files"
  ON group_files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM group_members gm 
      WHERE gm.group_id = group_id AND gm.user_id = auth.uid() AND gm.is_active = true
    )
  );

-- Function to automatically add creator as admin when group is created
CREATE OR REPLACE FUNCTION handle_new_group()
RETURNS trigger AS $$
BEGIN
  -- Add creator as admin member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  
  -- Update member count
  UPDATE class_groups 
  SET member_count = 1 
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for automatic admin assignment
CREATE TRIGGER on_group_created
  AFTER INSERT ON class_groups
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_group();

-- Function to update member count when members join/leave
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE class_groups 
    SET member_count = member_count + 1 
    WHERE id = NEW.group_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle activation/deactivation
    IF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE class_groups 
      SET member_count = member_count - 1 
      WHERE id = NEW.group_id;
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE class_groups 
      SET member_count = member_count + 1 
      WHERE id = NEW.group_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE class_groups 
    SET member_count = member_count - 1 
    WHERE id = OLD.group_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers for member count updates
CREATE TRIGGER update_member_count_on_insert
  AFTER INSERT ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

CREATE TRIGGER update_member_count_on_update
  AFTER UPDATE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

CREATE TRIGGER update_member_count_on_delete
  AFTER DELETE ON group_members
  FOR EACH ROW
  EXECUTE FUNCTION update_group_member_count();

-- Function to verify group password
CREATE OR REPLACE FUNCTION verify_group_password(group_id_param uuid, password_param text)
RETURNS boolean AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT password_hash INTO stored_hash
  FROM class_groups
  WHERE id = group_id_param;
  
  IF stored_hash IS NULL THEN
    RETURN true; -- No password required
  END IF;
  
  -- Simple password comparison (in production, use proper hashing)
  RETURN stored_hash = crypt(password_param, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set group password
CREATE OR REPLACE FUNCTION set_group_password(
  group_id_param uuid, 
  password_param text, 
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  is_authorized boolean := false;
BEGIN
  -- Check if user is creator or admin
  SELECT EXISTS (
    SELECT 1 FROM class_groups cg
    LEFT JOIN group_members gm ON gm.group_id = cg.id
    WHERE cg.id = group_id_param AND (
      cg.creator_id = user_id_param OR
      (gm.user_id = user_id_param AND gm.role = 'admin' AND gm.is_active = true)
    )
  ) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN false;
  END IF;
  
  -- Update password
  UPDATE class_groups
  SET password_hash = CASE 
    WHEN password_param IS NULL THEN NULL
    ELSE crypt(password_param, gen_salt('bf'))
  END
  WHERE id = group_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;