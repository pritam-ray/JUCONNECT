-- Row Level Security (RLS) policies for JU CONNECTS
-- This migration sets up comprehensive security policies

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE private_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_scans ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Anyone can view profiles (public data only)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ============================================================================
-- CATEGORIES POLICIES
-- ============================================================================

-- Everyone can view active categories
CREATE POLICY "Active categories are viewable by everyone"
ON categories FOR SELECT
USING (is_active = true);

-- Only admins can manage categories
CREATE POLICY "Only admins can manage categories"
ON categories FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- CONTENT POLICIES
-- ============================================================================

-- Everyone can view approved content
CREATE POLICY "Approved content is viewable by everyone"
ON content FOR SELECT
USING (is_approved = true);

-- Authors can view their own content (even if not approved)
CREATE POLICY "Authors can view own content"
ON content FOR SELECT
USING (auth.uid() = author_id);

-- Admins can view all content
CREATE POLICY "Admins can view all content"
ON content FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Authenticated users can create content
CREATE POLICY "Authenticated users can create content"
ON content FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- Authors can update their own content
CREATE POLICY "Authors can update own content"
ON content FOR UPDATE
USING (auth.uid() = author_id);

-- Admins can update any content
CREATE POLICY "Admins can update any content"
ON content FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Authors can delete their own content
CREATE POLICY "Authors can delete own content"
ON content FOR DELETE
USING (auth.uid() = author_id);

-- Admins can delete any content
CREATE POLICY "Admins can delete any content"
ON content FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- CHAT MESSAGES POLICIES
-- ============================================================================

-- Everyone can view chat messages
CREATE POLICY "Chat messages are viewable by everyone"
ON chat_messages FOR SELECT
USING (true);

-- Authenticated users can create chat messages
CREATE POLICY "Authenticated users can create chat messages"
ON chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update own chat messages"
ON chat_messages FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own chat messages"
ON chat_messages FOR DELETE
USING (auth.uid() = user_id);

-- Admins can delete any message
CREATE POLICY "Admins can delete any chat message"
ON chat_messages FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- PRIVATE MESSAGES POLICIES
-- ============================================================================

-- Users can view messages they sent or received
CREATE POLICY "Users can view their private messages"
ON private_messages FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Users can send private messages
CREATE POLICY "Users can send private messages"
ON private_messages FOR INSERT
WITH CHECK (
    auth.uid() = sender_id
    AND NOT EXISTS (
        SELECT 1 FROM user_blocks
        WHERE (blocker_id = sender_id AND blocked_id = recipient_id)
        OR (blocker_id = recipient_id AND blocked_id = sender_id)
    )
);

-- Users can update their sent messages (for read status)
CREATE POLICY "Users can update their private messages"
ON private_messages FOR UPDATE
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- ============================================================================
-- CLASS GROUPS POLICIES
-- ============================================================================

-- Everyone can view public groups
CREATE POLICY "Public groups are viewable by everyone"
ON class_groups FOR SELECT
USING (is_public = true);

-- Group members can view private groups
CREATE POLICY "Group members can view private groups"
ON class_groups FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = class_groups.id
        AND user_id = auth.uid()
    )
);

-- Authenticated users can create groups
CREATE POLICY "Authenticated users can create groups"
ON class_groups FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Group creators and admins can update groups
CREATE POLICY "Group creators can update groups"
ON class_groups FOR UPDATE
USING (
    auth.uid() = created_by
    OR EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = class_groups.id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
);

-- ============================================================================
-- GROUP MEMBERS POLICIES
-- ============================================================================

-- Group members can view group membership
CREATE POLICY "Group members can view membership"
ON group_members FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
    )
);

-- Users can join public groups
CREATE POLICY "Users can join groups"
ON group_members FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM class_groups
        WHERE id = group_id
        AND (is_public = true OR password_hash IS NULL)
    )
);

-- Users can leave groups
CREATE POLICY "Users can leave groups"
ON group_members FOR DELETE
USING (auth.uid() = user_id);

-- Group admins can remove members
CREATE POLICY "Group admins can remove members"
ON group_members FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM group_members gm
        WHERE gm.group_id = group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
);

-- ============================================================================
-- GROUP MESSAGES POLICIES
-- ============================================================================

-- Group members can view group messages
CREATE POLICY "Group members can view group messages"
ON group_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
    )
);

-- Group members can send messages
CREATE POLICY "Group members can send messages"
ON group_messages FOR INSERT
WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = group_messages.group_id
        AND user_id = auth.uid()
    )
);

-- Users can update their own messages
CREATE POLICY "Users can update own group messages"
ON group_messages FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================================================
-- USER BLOCKS POLICIES
-- ============================================================================

-- Users can view their blocks
CREATE POLICY "Users can view their blocks"
ON user_blocks FOR SELECT
USING (auth.uid() = blocker_id);

-- Users can create blocks
CREATE POLICY "Users can create blocks"
ON user_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

-- Users can remove their blocks
CREATE POLICY "Users can remove their blocks"
ON user_blocks FOR DELETE
USING (auth.uid() = blocker_id);

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

-- Users can view their own reports
CREATE POLICY "Users can view own content reports"
ON content_reports FOR SELECT
USING (auth.uid() = reporter_id);

-- Admins can view all reports
CREATE POLICY "Admins can view all content reports"
ON content_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Users can create reports
CREATE POLICY "Users can create content reports"
ON content_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Similar policies for chat reports
CREATE POLICY "Users can view own chat reports"
ON chat_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Admins can view all chat reports"
ON chat_reports FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Users can create chat reports"
ON chat_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- ============================================================================
-- FILE UPLOADS POLICIES
-- ============================================================================

-- Users can view their own uploads
CREATE POLICY "Users can view own uploads"
ON file_uploads FOR SELECT
USING (auth.uid() = user_id);

-- Users can create uploads
CREATE POLICY "Users can create uploads"
ON file_uploads FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- UPDATE REQUESTS POLICIES
-- ============================================================================

-- Users can view their own requests
CREATE POLICY "Users can view own update requests"
ON update_requests FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all update requests"
ON update_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Users can create requests
CREATE POLICY "Users can create update requests"
ON update_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- EDUCATIONAL LINKS POLICIES
-- ============================================================================

-- Everyone can view verified links
CREATE POLICY "Verified links are viewable by everyone"
ON educational_links FOR SELECT
USING (is_verified = true);

-- Users can view their own unverified links
CREATE POLICY "Users can view own links"
ON educational_links FOR SELECT
USING (auth.uid() = added_by);

-- Admins can view all links
CREATE POLICY "Admins can view all links"
ON educational_links FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
    )
);

-- Users can add links
CREATE POLICY "Users can add links"
ON educational_links FOR INSERT
WITH CHECK (auth.uid() = added_by);
