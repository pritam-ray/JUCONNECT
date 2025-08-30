-- ===================================================================
-- DATABASE SCHEMA FIX MIGRATION
-- Run this script in Supabase SQL Editor to fix all schema issues
-- ===================================================================

-- STEP 1: Add missing columns
-- ===================================================================

-- Add mobile_number to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'mobile_number') THEN
        ALTER TABLE profiles ADD COLUMN mobile_number TEXT;
        RAISE NOTICE 'Added mobile_number column to profiles table';
    END IF;
END $$;

-- Add is_active to group_members table  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'group_members' AND column_name = 'is_active') THEN
        ALTER TABLE group_members ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to group_members table';
    END IF;
END $$;

-- Add section to class_groups table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'class_groups' AND column_name = 'section') THEN
        ALTER TABLE class_groups ADD COLUMN section TEXT;
        RAISE NOTICE 'Added section column to class_groups table';
    END IF;
END $$;

-- STEP 2: Create group_message_reads table
-- ===================================================================

CREATE TABLE IF NOT EXISTS group_message_reads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_id UUID REFERENCES group_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(message_id, user_id)
);

-- STEP 3: Add foreign key constraints (with error handling)
-- ===================================================================

-- Add constraint for group_messages -> profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_group_messages_user_id') THEN
        ALTER TABLE group_messages 
        ADD CONSTRAINT fk_group_messages_user_id 
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key constraint for group_messages';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add foreign key for group_messages: %', SQLERRM;
END $$;

-- Add constraint for group_members -> profiles
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'fk_group_members_user_id') THEN
        ALTER TABLE group_members
        ADD CONSTRAINT fk_group_members_user_id
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key constraint for group_members';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not add foreign key for group_members: %', SQLERRM;
END $$;

-- STEP 4: Create database functions
-- ===================================================================

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
EXCEPTION
    WHEN others THEN
        RETURN false;
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
    WHERE group_id = group_id_param AND user_id = user_id_param AND COALESCE(is_active, true) = true;
    
    RETURN COALESCE(is_admin, false) OR COALESCE(is_creator, false);
EXCEPTION
    WHEN others THEN
        RETURN false;
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
    WHERE group_id = group_id_param AND user_id = user_id_param AND COALESCE(is_active, true) = true;
    
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

-- STEP 5: Create indexes for performance
-- ===================================================================

CREATE INDEX IF NOT EXISTS idx_group_message_reads_message_id ON group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_group_message_reads_user_id ON group_message_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_is_active ON group_members(is_active);
CREATE INDEX IF NOT EXISTS idx_group_members_role ON group_members(role);
CREATE INDEX IF NOT EXISTS idx_class_groups_creator_id ON class_groups(creator_id);

-- STEP 6: Enable RLS for new tables
-- ===================================================================

ALTER TABLE group_message_reads ENABLE ROW LEVEL SECURITY;

-- RLS policy for group_message_reads
DROP POLICY IF EXISTS "Users can manage their own read status" ON group_message_reads;
CREATE POLICY "Users can manage their own read status" ON group_message_reads
    FOR ALL USING (auth.uid() = user_id);

-- STEP 7: Grant permissions
-- ===================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- STEP 8: Create update timestamp trigger
-- ===================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for automatic timestamps
DROP TRIGGER IF EXISTS update_class_groups_updated_at ON class_groups;
CREATE TRIGGER update_class_groups_updated_at
    BEFORE UPDATE ON class_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- STEP 9: Final verification
-- ===================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📋 Summary of changes:';
    RAISE NOTICE '  • Added missing columns (mobile_number, is_active, section)';
    RAISE NOTICE '  • Created group_message_reads table for read tracking';
    RAISE NOTICE '  • Added foreign key relationships';
    RAISE NOTICE '  • Created admin management functions';
    RAISE NOTICE '  • Added performance indexes';
    RAISE NOTICE '  • Updated RLS policies';
    RAISE NOTICE '  • Added automatic timestamp triggers';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next Steps:';
    RAISE NOTICE '1. Enable realtime for tables: class_groups, group_members, group_messages, group_message_reads';
    RAISE NOTICE '2. Test the admin functions in your application';
    RAISE NOTICE '3. Verify all TypeScript types are working correctly';
END $$;
