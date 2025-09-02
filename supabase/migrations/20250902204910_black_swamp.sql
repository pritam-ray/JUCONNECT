/*
  # Create comprehensive messaging system

  1. New Tables
    - `chat_messages` - Global chat messages
    - `private_messages` - Direct messages between users
    - `user_blocks` - User blocking functionality
    - `message_reports` - Content moderation

  2. Security
    - Enable RLS on all messaging tables
    - Add policies for message access control
    - Add blocking and reporting policies

  3. Functions
    - Message cleanup functions
    - Blocking/unblocking functions
    - Report handling functions
*/

-- Create chat_messages table for global chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  message text NOT NULL,
  file_url text,
  file_name text,
  reply_to uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited boolean DEFAULT false,
  is_reported boolean DEFAULT false,
  is_flagged boolean DEFAULT false,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create private_messages table
CREATE TABLE IF NOT EXISTS private_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  file_url text,
  file_name text,
  is_read boolean DEFAULT false,
  is_deleted_by_sender boolean DEFAULT false,
  is_deleted_by_recipient boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  -- Prevent self-messaging
  CHECK (sender_id != recipient_id)
);

-- Create user_blocks table
CREATE TABLE IF NOT EXISTS user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text,
  created_at timestamptz DEFAULT now(),
  
  -- Unique constraint and prevent self-blocking
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);

-- Create content_reports table
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create chat_reports table
CREATE TABLE IF NOT EXISTS chat_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reported ON chat_messages(is_reported);

CREATE INDEX IF NOT EXISTS idx_private_messages_sender ON private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_recipient ON private_messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_created ON private_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_messages_conversation ON private_messages(sender_id, recipient_id);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON user_blocks(blocked_id);

-- RLS Policies for chat_messages
CREATE POLICY "Anyone can view non-reported chat messages"
  ON chat_messages
  FOR SELECT
  USING (is_reported = false AND is_flagged = false);

CREATE POLICY "Authenticated users can send chat messages"
  ON chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can edit their own messages"
  ON chat_messages
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for private_messages
CREATE POLICY "Users can view their own private messages"
  ON private_messages
  FOR SELECT
  TO authenticated
  USING (
    (sender_id = auth.uid() AND is_deleted_by_sender = false) OR
    (recipient_id = auth.uid() AND is_deleted_by_recipient = false)
  );

CREATE POLICY "Users can send private messages"
  ON private_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid() AND
    -- Ensure recipient is not blocking sender
    NOT EXISTS (
      SELECT 1 FROM user_blocks ub 
      WHERE ub.blocker_id = recipient_id AND ub.blocked_id = sender_id
    )
  );

CREATE POLICY "Users can update their own message status"
  ON private_messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid())
  WITH CHECK (sender_id = auth.uid() OR recipient_id = auth.uid());

-- RLS Policies for user_blocks
CREATE POLICY "Users can view their own blocks"
  ON user_blocks
  FOR SELECT
  TO authenticated
  USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks"
  ON user_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can remove their own blocks"
  ON user_blocks
  FOR DELETE
  TO authenticated
  USING (blocker_id = auth.uid());

-- RLS Policies for reports
CREATE POLICY "Users can create reports"
  ON content_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own reports"
  ON content_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all reports"
  ON content_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Similar policies for chat_reports
CREATE POLICY "Users can create chat reports"
  ON chat_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own chat reports"
  ON chat_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all chat reports"
  ON chat_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Function to clean up old messages (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
  -- Delete chat messages older than 6 months
  DELETE FROM chat_messages 
  WHERE created_at < now() - interval '6 months';
  
  -- Delete private messages older than 1 year if deleted by both parties
  DELETE FROM private_messages 
  WHERE created_at < now() - interval '1 year'
    AND is_deleted_by_sender = true 
    AND is_deleted_by_recipient = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;