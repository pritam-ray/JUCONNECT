-- Fix Database Schema Issues Migration
-- This migration adds missing columns, tables, functions, and relationships

-- 1. Add missing columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- 2. Add missing columns to group_members table  
ALTER TABLE group_members
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Add missing columns to class_groups table
ALTER TABLE class_groups
ADD COLUMN IF NOT EXISTS section TEXT;

-- 4. Create group_message_reads table for tracking read status
CREATE TABLE IF NOT EXISTS group_message_reads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(message_id, user_id)
);

-- 5. Create group_admin_info view for admin functionality
CREATE OR REPLACE VIEW group_admin_info AS
SELECT 
    g.id as group_id,
    g.name as group_name,
    gm.user_id as admin_id,
    p.username as admin_username,
    p.full_name as admin_name,
    COUNT(members.user_id) as total_members
FROM class_groups g
JOIN group_members gm ON g.id = gm.group_id 
JOIN profiles p ON gm.user_id = p.id
LEFT JOIN group_members members ON g.id = members.group_id AND members.is_active = true
WHERE gm.role = 'admin'
GROUP BY g.id, g.name, gm.user_id, p.username, p.full_name;

-- 6. Add foreign key relationships for profiles
-- Update group_messages to have proper foreign key to profiles
ALTER TABLE group_messages 
ADD CONSTRAINT fk_group_messages_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Update group_members to have proper foreign key to profiles  
ALTER TABLE group_members
ADD CONSTRAINT fk_group_members_user_id
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update group_files to have proper foreign key to profiles
ALTER TABLE group_files
ADD CONSTRAINT fk_group_files_user_id  
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Update group_announcements to have proper foreign key to profiles
ALTER TABLE group_announcements
ADD CONSTRAINT fk_group_announcements_user_id
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 7. Create missing database functions

-- Function to verify group password
CREATE OR REPLACE FUNCTION verify_group_password(
    group_id_param UUID,
    password_param TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored_hash TEXT;
BEGIN
    SELECT password_hash INTO stored_hash
    FROM class_groups
    WHERE id = group_id_param;
    
    IF stored_hash IS NULL THEN
        RETURN true; -- No password set
    END IF;
    
    -- Simple password verification (in production, use proper bcrypt)
    RETURN stored_hash = crypt(password_param, stored_hash);
END;
$$;

-- Function to set group password
CREATE OR REPLACE FUNCTION set_group_password(
    group_id_param UUID,
    password_param TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  
AS $$
BEGIN
    UPDATE class_groups 
    SET password_hash = crypt(password_param, gen_salt('bf'))
    WHERE id = group_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(
    group_id_param UUID,
    user_id_param UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_admin BOOLEAN := false;
    is_creator BOOLEAN := false;
BEGIN
    -- Check if user is creator
    SELECT (creator_id = user_id_param) INTO is_creator
    FROM class_groups
    WHERE id = group_id_param;
    
    -- Check if user has admin role
    SELECT (role = 'admin') INTO is_admin
    FROM group_members
    WHERE group_id = group_id_param AND user_id = user_id_param AND is_active = true;
    
    RETURN COALESCE(is_admin, false) OR COALESCE(is_creator, false);
END;
$$;

-- Function to promote user to admin
CREATE OR REPLACE FUNCTION promote_to_admin(
    group_id_param UUID,
    user_id_param UUID,
    admin_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT is_group_admin(group_id_param, admin_user_id) THEN
        RAISE EXCEPTION 'User is not authorized to promote members';
    END IF;
    
    UPDATE group_members
    SET role = 'admin'
    WHERE group_id = group_id_param AND user_id = user_id_param AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Function to demote admin
CREATE OR REPLACE FUNCTION demote_admin(
    group_id_param UUID,
    user_id_param UUID,
    admin_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT is_group_admin(group_id_param, admin_user_id) THEN
        RAISE EXCEPTION 'User is not authorized to demote members';
    END IF;
    
    -- Don't allow demoting the creator
    IF EXISTS (SELECT 1 FROM class_groups WHERE id = group_id_param AND creator_id = user_id_param) THEN
        RAISE EXCEPTION 'Cannot demote group creator';
    END IF;
    
    UPDATE group_members
    SET role = 'member'
    WHERE group_id = group_id_param AND user_id = user_id_param AND is_active = true;
    
    RETURN FOUND;
END;
$$;

-- Function to remove group member
CREATE OR REPLACE FUNCTION remove_group_member(
    group_id_param UUID,
    user_id_param UUID,
    admin_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT is_group_admin(group_id_param, admin_user_id) THEN
        RAISE EXCEPTION 'User is not authorized to remove members';
    END IF;
    
    -- Don't allow removing the creator
    IF EXISTS (SELECT 1 FROM class_groups WHERE id = group_id_param AND creator_id = user_id_param) THEN
        RAISE EXCEPTION 'Cannot remove group creator';
    END IF;
    
    UPDATE group_members
    SET is_active = false
    WHERE group_id = group_id_param AND user_id = user_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to update group details
CREATE OR REPLACE FUNCTION update_group_details(
    group_id_param UUID,
    name_param TEXT,
    description_param TEXT,
    admin_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is an admin
    IF NOT is_group_admin(group_id_param, admin_user_id) THEN
        RAISE EXCEPTION 'User is not authorized to update group details';
    END IF;
    
    UPDATE class_groups
    SET 
        name = name_param,
        description = description_param,
        updated_at = TIMEZONE('utc'::text, NOW())
    WHERE id = group_id_param;
    
    RETURN FOUND;
END;
$$;

-- Function to delete group
CREATE OR REPLACE FUNCTION delete_group(
    group_id_param UUID,
    admin_user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the requesting user is the creator
    IF NOT EXISTS (SELECT 1 FROM class_groups WHERE id = group_id_param AND creator_id = admin_user_id) THEN
        RAISE EXCEPTION 'Only group creator can delete the group';
    END IF;
    
    -- Delete all related data (cascade should handle this, but being explicit)
    DELETE FROM group_message_reads WHERE message_id IN (SELECT id FROM group_messages WHERE group_id = group_id_param);
    DELETE FROM group_messages WHERE group_id = group_id_param;
    DELETE FROM group_files WHERE group_id = group_id_param;
    DELETE FROM group_announcements WHERE group_id = group_id_param;
    DELETE FROM group_members WHERE group_id = group_id_param;
    DELETE FROM class_groups WHERE id = group_id_param;
    
    RETURN FOUND;
END;
$$;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_group_message_reads_message_id ON group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_user_id ON group_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_is_active ON group_members(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_class_groups_creator_id ON class_groups(creator_id);

-- 9. Update RLS policies for new tables and functions

-- RLS for group_message_reads
ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own read status" ON group_message_reads
    FOR ALL USING (auth.uid() = user_id);

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- 11. Add triggers for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to class_groups if it doesn't exist
DROP TRIGGER IF EXISTS update_class_groups_updated_at ON class_groups;
CREATE TRIGGER update_class_groups_updated_at
    BEFORE UPDATE ON class_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to profiles if it doesn't exist  
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
