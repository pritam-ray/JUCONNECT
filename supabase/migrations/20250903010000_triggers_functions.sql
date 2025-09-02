-- Triggers and Functions for JU CONNECTS
-- This migration creates all necessary triggers and functions

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update group member count
CREATE OR REPLACE FUNCTION update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE class_groups 
        SET member_count = (
            SELECT COUNT(*) 
            FROM group_members 
            WHERE group_id = NEW.group_id
        )
        WHERE id = NEW.group_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE class_groups 
        SET member_count = (
            SELECT COUNT(*) 
            FROM group_members 
            WHERE group_id = OLD.group_id
        )
        WHERE id = OLD.group_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent self-blocking
CREATE OR REPLACE FUNCTION prevent_self_blocking()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.blocker_id = NEW.blocked_id THEN
        RAISE EXCEPTION 'Users cannot block themselves';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to prevent messaging blocked users
CREATE OR REPLACE FUNCTION check_user_blocked()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if recipient has blocked sender
    IF EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = NEW.recipient_id 
        AND blocked_id = NEW.sender_id
    ) THEN
        RAISE EXCEPTION 'Cannot send message to user who has blocked you';
    END IF;
    
    -- Check if sender has blocked recipient
    IF EXISTS (
        SELECT 1 FROM user_blocks 
        WHERE blocker_id = NEW.sender_id 
        AND blocked_id = NEW.recipient_id
    ) THEN
        RAISE EXCEPTION 'Cannot send message to blocked user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-approve admin content
CREATE OR REPLACE FUNCTION auto_approve_admin_content()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-approve content from admins
    IF EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = NEW.author_id 
        AND role IN ('admin', 'super_admin')
    ) THEN
        NEW.is_approved = true;
        NEW.approved_by = NEW.author_id;
        NEW.approved_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, username, full_name, mobile_number)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'mobile_number', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Updated at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at
    BEFORE UPDATE ON content
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_class_groups_updated_at
    BEFORE UPDATE ON class_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Group member count triggers
CREATE TRIGGER update_group_member_count_trigger
    AFTER INSERT OR DELETE ON group_members
    FOR EACH ROW
    EXECUTE FUNCTION update_group_member_count();

-- User blocking triggers
CREATE TRIGGER prevent_self_blocking_trigger
    BEFORE INSERT ON user_blocks
    FOR EACH ROW
    EXECUTE FUNCTION prevent_self_blocking();

-- Private message blocking check
CREATE TRIGGER check_user_blocked_trigger
    BEFORE INSERT ON private_messages
    FOR EACH ROW
    EXECUTE FUNCTION check_user_blocked();

-- Auto-approve admin content
CREATE TRIGGER auto_approve_admin_content_trigger
    BEFORE INSERT ON content
    FOR EACH ROW
    EXECUTE FUNCTION auto_approve_admin_content();

-- Handle new user signup
CREATE TRIGGER handle_new_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- ADMIN FUNCTIONS
-- ============================================================================

-- Function to make user admin (only for super_admins)
CREATE OR REPLACE FUNCTION make_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role
    FROM profiles
    WHERE id = auth.uid();
    
    -- Only super_admins can make other users admin
    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can promote users to admin';
    END IF;
    
    -- Update user role
    UPDATE profiles
    SET role = 'admin'
    WHERE id = user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve content
CREATE OR REPLACE FUNCTION approve_content(content_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role
    FROM profiles
    WHERE id = auth.uid();
    
    -- Only admins can approve content
    IF current_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only admins can approve content';
    END IF;
    
    -- Approve content
    UPDATE content
    SET is_approved = true,
        approved_by = auth.uid(),
        approved_at = NOW()
    WHERE id = content_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject content
CREATE OR REPLACE FUNCTION reject_content(content_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role user_role;
BEGIN
    -- Get current user's role
    SELECT role INTO current_user_role
    FROM profiles
    WHERE id = auth.uid();
    
    -- Only admins can reject content
    IF current_user_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Only admins can reject content';
    END IF;
    
    -- Delete content (rejection)
    DELETE FROM content
    WHERE id = content_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
