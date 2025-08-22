-- Add Password Protection to Class Groups
-- This migration adds password protection functionality to class groups
-- Groups can be either public (no password) or protected (password required)

-- ============================================================================
-- STEP 1: Add password protection columns to class_groups table
-- ============================================================================

DO $$ 
BEGIN
    -- Check and add is_password_protected column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'class_groups' AND column_name = 'is_password_protected') THEN
        ALTER TABLE class_groups ADD COLUMN is_password_protected boolean DEFAULT false;
    END IF;
    
    -- Check and add password_hash column (store hashed password for security)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'class_groups' AND column_name = 'password_hash') THEN
        ALTER TABLE class_groups ADD COLUMN password_hash text;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Create password verification function
-- ============================================================================

-- Function to verify group password
CREATE OR REPLACE FUNCTION verify_group_password(
    group_id_param uuid,
    password_param text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    stored_hash text;
    is_protected boolean;
BEGIN
    -- Get group password details
    SELECT password_hash, is_password_protected
    INTO stored_hash, is_protected
    FROM class_groups
    WHERE id = group_id_param;
    
    -- If group doesn't exist, return false
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- If group is not password protected, return true
    IF NOT is_protected THEN
        RETURN true;
    END IF;
    
    -- If group is protected but no password provided, return false
    IF password_param IS NULL OR password_param = '' THEN
        RETURN false;
    END IF;
    
    -- Compare provided password with stored hash using bcrypt
    -- For now, we'll use simple text comparison (in production, use proper bcrypt)
    RETURN stored_hash = crypt(password_param, stored_hash);
END;
$$;

-- ============================================================================
-- STEP 3: Create function to set group password
-- ============================================================================

-- Function to set password for a group (only group creator/admin can do this)
CREATE OR REPLACE FUNCTION set_group_password(
    group_id_param uuid,
    password_param text,
    user_id_param uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_creator boolean := false;
    is_admin boolean := false;
BEGIN
    -- Check if user is the creator of the group
    SELECT (created_by = user_id_param) INTO is_creator
    FROM class_groups
    WHERE id = group_id_param;
    
    -- Check if user is admin of the group
    SELECT EXISTS(
        SELECT 1 FROM group_members
        WHERE group_id = group_id_param 
        AND user_id = user_id_param 
        AND role = 'admin'
        AND is_active = true
    ) INTO is_admin;
    
    -- Only creator or admin can set password
    IF NOT (is_creator OR is_admin) THEN
        RETURN false;
    END IF;
    
    -- Set password (hash it for security)
    IF password_param IS NULL OR password_param = '' THEN
        -- Remove password protection
        UPDATE class_groups
        SET is_password_protected = false,
            password_hash = NULL
        WHERE id = group_id_param;
    ELSE
        -- Set password protection
        UPDATE class_groups
        SET is_password_protected = true,
            password_hash = crypt(password_param, gen_salt('bf'))
        WHERE id = group_id_param;
    END IF;
    
    RETURN true;
END;
$$;

-- ============================================================================
-- STEP 4: Update RLS policies to handle password protection
-- ============================================================================

-- Anyone can view public groups, but protected groups only show basic info
DROP POLICY IF EXISTS "Anyone can view active groups" ON class_groups;
CREATE POLICY "Anyone can view groups" ON class_groups
  FOR SELECT USING (
    is_active = true AND (
      NOT is_password_protected OR
      EXISTS (
        SELECT 1 FROM group_members
        WHERE group_id = class_groups.id
        AND user_id = auth.uid()
        AND is_active = true
      )
    )
  );

-- ============================================================================
-- STEP 5: Create view for public group information
-- ============================================================================

-- View that shows group info without sensitive data
CREATE OR REPLACE VIEW public_groups AS
SELECT 
    id,
    name,
    description,
    year,
    section,
    subject,
    created_by,
    is_active,
    member_count,
    created_at,
    updated_at,
    is_password_protected,
    -- Don't expose password_hash
    CASE 
        WHEN is_password_protected THEN '🔒 Password Protected'
        ELSE 'Open to Join'
    END as join_status
FROM class_groups
WHERE is_active = true;

-- ============================================================================
-- STEP 6: Grant permissions
-- ============================================================================

-- Grant execute permissions on password functions
GRANT EXECUTE ON FUNCTION verify_group_password(uuid, text) TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION set_group_password(uuid, text, uuid) TO service_role, authenticated;

-- Grant select permission on public groups view
GRANT SELECT ON public_groups TO service_role, authenticated, anon;

-- ============================================================================
-- STEP 7: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN class_groups.is_password_protected IS 
'Whether this group requires a password to join';

COMMENT ON COLUMN class_groups.password_hash IS 
'Bcrypt hash of the group password (null for public groups)';

COMMENT ON FUNCTION verify_group_password(uuid, text) IS 
'Verifies if the provided password matches the group password. Returns true for public groups.';

COMMENT ON FUNCTION set_group_password(uuid, text, uuid) IS 
'Sets or removes password protection for a group. Only group creator or admin can use this.';

COMMENT ON VIEW public_groups IS 
'Public view of groups without sensitive password information';

-- ============================================================================
-- USAGE INSTRUCTIONS
-- ============================================================================

/*
To use password protection:

1. CREATE PROTECTED GROUP:
   - Set is_password_protected = true when creating
   - Use set_group_password() to set the password

2. JOIN PROTECTED GROUP:
   - User provides password
   - Use verify_group_password() to check
   - Only allow join if password is correct

3. REMOVE PASSWORD:
   - Call set_group_password(group_id, NULL, user_id)
   - This removes password protection

4. VIEW GROUPS:
   - Use public_groups view to see available groups
   - Password-protected groups show "🔒 Password Protected"
   - Public groups show "Open to Join"

Example usage:
-- Set password for group
SELECT set_group_password('group-uuid', 'mypassword123', 'user-uuid');

-- Verify password before joining
SELECT verify_group_password('group-uuid', 'mypassword123');

-- Remove password protection
SELECT set_group_password('group-uuid', NULL, 'user-uuid');
*/
