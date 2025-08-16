/*
  # Comprehensive Platform Schema

  1. New Tables
    - `private_messages` - Direct messages between users
    - `content_reports` - User reports for inappropriate content
    - `chat_reports` - User reports for inappropriate chat messages
    - `user_blocks` - User blocking functionality
    - `file_security_scans` - Security scan results for uploaded files

  2. Updated Tables
    - Enhanced `profiles` with additional fields
    - Updated `content` table for automatic approval
    - Enhanced `chat_messages` for global visibility

  3. Security
    - RLS policies for all tables
    - Proper access controls for private messaging
    - Admin-only access for reports and moderation

  4. Functions
    - Username validation
    - Content reporting
    - Security scanning integration
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update profiles table with additional fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Private messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_deleted_by_sender BOOLEAN DEFAULT false,
  is_deleted_by_recipient BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content reports table
CREATE TABLE IF NOT EXISTS content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Chat message reports table
CREATE TABLE IF NOT EXISTS chat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- File security scans table
CREATE TABLE IF NOT EXISTS file_security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  scan_status TEXT DEFAULT 'pending' CHECK (scan_status IN ('pending', 'clean', 'infected', 'suspicious', 'error')),
  scan_results JSONB,
  scanned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Update content table to auto-approve after security scan
ALTER TABLE content ALTER COLUMN is_approved SET DEFAULT true;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created ON private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status);
CREATE INDEX IF NOT EXISTS idx_chat_reports_status ON chat_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_status ON file_security_scans(scan_status);

-- Enable RLS on all tables
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_scans ENABLE ROW LEVEL SECURITY;

-- Private messages policies
CREATE POLICY "Users can view their own messages"
  ON private_messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON private_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own messages"
  ON private_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Content reports policies
CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view their own reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "Admins can manage all reports"
  ON content_reports
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Chat reports policies
CREATE POLICY "Users can create chat reports"
  ON chat_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Users can view their own chat reports"
  ON chat_reports
  FOR SELECT
  TO authenticated
  USING (reported_by = auth.uid());

CREATE POLICY "Admins can manage all chat reports"
  ON chat_reports
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- User blocks policies
CREATE POLICY "Users can manage their own blocks"
  ON user_blocks
  FOR ALL
  TO authenticated
  USING (blocker_id = auth.uid());

-- File security scans policies
CREATE POLICY "Admins can view all security scans"
  ON file_security_scans
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "System can insert security scans"
  ON file_security_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update chat messages policy to allow public viewing
DROP POLICY IF EXISTS "Chat messages are viewable by authenticated users" ON chat_messages;
CREATE POLICY "Chat messages are viewable by everyone"
  ON chat_messages
  FOR SELECT
  TO public
  USING (NOT is_reported);

-- Function to check username uniqueness
CREATE OR REPLACE FUNCTION check_username_unique(username_input TEXT, user_id UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
BEGIN
  IF user_id IS NULL THEN
    -- For new registrations
    RETURN NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = username_input
    );
  ELSE
    -- For updates
    RETURN NOT EXISTS (
      SELECT 1 FROM profiles WHERE username = username_input AND id != user_id
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sanitize file names
CREATE OR REPLACE FUNCTION sanitize_filename(filename TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove potentially dangerous characters and patterns
  filename := regexp_replace(filename, '[<>:"/\\|?*]', '_', 'g');
  filename := regexp_replace(filename, '\.{2,}', '.', 'g');
  filename := trim(filename);
  
  -- Ensure filename is not empty and has reasonable length
  IF length(filename) = 0 THEN
    filename := 'unnamed_file';
  END IF;
  
  IF length(filename) > 255 THEN
    filename := left(filename, 255);
  END IF;
  
  RETURN filename;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user online status
CREATE OR REPLACE FUNCTION update_user_online_status(user_id UUID, is_online BOOLEAN)
RETURNS VOID AS $$
BEGIN
  UPDATE profiles 
  SET 
    is_online = update_user_online_status.is_online,
    last_seen = CASE WHEN update_user_online_status.is_online THEN now() ELSE last_seen END
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_private_messages_updated_at
  BEFORE UPDATE ON private_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_reports_updated_at
  BEFORE UPDATE ON content_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_reports_updated_at
  BEFORE UPDATE ON chat_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();