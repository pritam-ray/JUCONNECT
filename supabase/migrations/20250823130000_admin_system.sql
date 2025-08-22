-- Implement comprehensive admin system for group creators
-- This adds admin functionality including auto-admin assignment and admin privileges

-- ============================================================================
-- STEP 1: Create admin management functions
-- ============================================================================

-- Function to automatically make group creator an admin
CREATE OR REPLACE FUNCTION auto_assign_creator_as_admin()
RETURNS trigger AS $$
BEGIN
  -- When a new group is created, automatically add the creator as admin
  INSERT INTO group_members (group_id, user_id, role, joined_at, is_active)
  VALUES (NEW.id, NEW.created_by, 'admin', now(), true)
  ON CONFLICT (group_id, user_id) 
  DO UPDATE SET role = 'admin', is_active = true;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-assign creator as admin
DROP TRIGGER IF EXISTS auto_assign_creator_admin ON class_groups;
CREATE TRIGGER auto_assign_creator_admin
  AFTER INSERT ON class_groups
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_creator_as_admin();

-- ============================================================================
-- STEP 2: Admin management functions
-- ============================================================================

-- Function to check if user is admin of a group
CREATE OR REPLACE FUNCTION is_group_admin(group_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param 
    AND user_id = user_id_param 
    AND role = 'admin' 
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote member to admin (only by existing admins)
CREATE OR REPLACE FUNCTION promote_to_admin(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  result json;
BEGIN
  -- Check if requesting user is admin
  IF NOT is_group_admin(group_id_param, requesting_user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can promote members');
  END IF;
  
  -- Check if target user is a member
  IF NOT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param 
    AND user_id = target_user_id_param 
    AND is_active = true
  ) THEN
    RETURN json_build_object('success', false, 'error', 'User is not a member of this group');
  END IF;
  
  -- Promote to admin
  UPDATE group_members 
  SET role = 'admin'
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Member promoted to admin successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin to member (only by other admins, cannot demote group creator)
CREATE OR REPLACE FUNCTION demote_admin(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  group_creator_id uuid;
  result json;
BEGIN
  -- Get group creator
  SELECT created_by INTO group_creator_id 
  FROM class_groups 
  WHERE id = group_id_param;
  
  -- Check if requesting user is admin
  IF NOT is_group_admin(group_id_param, requesting_user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can demote other admins');
  END IF;
  
  -- Cannot demote the group creator
  IF target_user_id_param = group_creator_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot demote the group creator');
  END IF;
  
  -- Cannot demote yourself if you're the only admin
  IF requesting_user_id_param = target_user_id_param THEN
    IF (SELECT COUNT(*) FROM group_members WHERE group_id = group_id_param AND role = 'admin' AND is_active = true) <= 1 THEN
      RETURN json_build_object('success', false, 'error', 'Cannot demote yourself as the only admin');
    END IF;
  END IF;
  
  -- Demote to member
  UPDATE group_members 
  SET role = 'member'
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Admin demoted to member successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Member management functions
-- ============================================================================

-- Function to remove member from group (only by admins)
CREATE OR REPLACE FUNCTION remove_group_member(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  group_creator_id uuid;
  target_role text;
BEGIN
  -- Get group creator and target user role
  SELECT created_by INTO group_creator_id 
  FROM class_groups 
  WHERE id = group_id_param;
  
  SELECT role INTO target_role 
  FROM group_members 
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param;
  
  -- Check if requesting user is admin
  IF NOT is_group_admin(group_id_param, requesting_user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can remove members');
  END IF;
  
  -- Cannot remove the group creator
  IF target_user_id_param = group_creator_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot remove the group creator');
  END IF;
  
  -- Remove member (soft delete)
  UPDATE group_members 
  SET is_active = false
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param;
  
  -- Update member count
  UPDATE class_groups 
  SET member_count = member_count - 1
  WHERE id = group_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Member removed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 4: Group management functions (admin only)
-- ============================================================================

-- Function to update group details (only by admins)
CREATE OR REPLACE FUNCTION update_group_details(
  group_id_param uuid,
  new_name text,
  new_description text,
  requesting_user_id_param uuid
)
RETURNS json AS $$
BEGIN
  -- Check if requesting user is admin
  IF NOT is_group_admin(group_id_param, requesting_user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can update group details');
  END IF;
  
  -- Update group details
  UPDATE class_groups 
  SET 
    name = COALESCE(new_name, name),
    description = COALESCE(new_description, description),
    updated_at = now()
  WHERE id = group_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Group details updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete group (only by group creator)
CREATE OR REPLACE FUNCTION delete_group(
  group_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  group_creator_id uuid;
BEGIN
  -- Get group creator
  SELECT created_by INTO group_creator_id 
  FROM class_groups 
  WHERE id = group_id_param;
  
  -- Only group creator can delete group
  IF requesting_user_id_param != group_creator_id THEN
    RETURN json_build_object('success', false, 'error', 'Only the group creator can delete the group');
  END IF;
  
  -- Soft delete the group
  UPDATE class_groups 
  SET is_active = false, updated_at = now()
  WHERE id = group_id_param;
  
  -- Deactivate all members
  UPDATE group_members 
  SET is_active = false
  WHERE group_id = group_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Group deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 5: Update RLS policies for admin functions
-- ============================================================================

-- Update class_groups policies to allow admin updates
DROP POLICY IF EXISTS "Allow creators to update groups" ON class_groups;
CREATE POLICY "Allow admins to update groups" ON class_groups
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    is_group_admin(id, auth.uid())
  );

-- Update group_members policies for admin management
DROP POLICY IF EXISTS "Group admins can update member roles" ON group_members;
CREATE POLICY "Group admins can manage members" ON group_members
  FOR ALL USING (
    user_id = auth.uid() OR
    is_group_admin(group_id, auth.uid())
  );

-- ============================================================================
-- STEP 6: Create view for admin information
-- ============================================================================

-- View to get group admin information
CREATE OR REPLACE VIEW group_admin_info AS
SELECT 
  g.id as group_id,
  g.name as group_name,
  g.created_by as creator_id,
  p.full_name as creator_name,
  p.username as creator_username,
  COUNT(gm.id) FILTER (WHERE gm.role = 'admin' AND gm.is_active = true) as admin_count,
  COUNT(gm.id) FILTER (WHERE gm.is_active = true) as total_members,
  g.created_at,
  g.is_active
FROM class_groups g
LEFT JOIN profiles p ON g.created_by = p.id
LEFT JOIN group_members gm ON g.id = gm.group_id
WHERE g.is_active = true
GROUP BY g.id, g.name, g.created_by, p.full_name, p.username, g.created_at, g.is_active;

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION is_group_admin TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin TO authenticated;
GRANT EXECUTE ON FUNCTION demote_admin TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_details TO authenticated;
GRANT EXECUTE ON FUNCTION delete_group TO authenticated;
