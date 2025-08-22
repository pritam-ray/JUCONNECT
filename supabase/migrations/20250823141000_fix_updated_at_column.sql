-- Fix admin functions by removing non-existent updated_at column references

-- Fixed remove_group_member function without updated_at
CREATE OR REPLACE FUNCTION remove_group_member(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  group_creator_id uuid;
  target_role text;
  member_exists boolean;
BEGIN
  -- Get group creator
  SELECT created_by INTO group_creator_id 
  FROM class_groups 
  WHERE id = group_id_param AND is_active = true;
  
  -- Check if group exists
  IF group_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Group not found or inactive');
  END IF;
  
  -- Check if target user is a member and get their role
  SELECT role, true INTO target_role, member_exists
  FROM group_members 
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param 
  AND is_active = true;
  
  -- Check if target user is actually a member
  IF NOT member_exists OR target_role IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'User is not an active member of this group');
  END IF;
  
  -- Check if requesting user is admin
  IF NOT is_group_admin(group_id_param, requesting_user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Only admins can remove members');
  END IF;
  
  -- Cannot remove the group creator
  IF target_user_id_param = group_creator_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot remove the group creator');
  END IF;
  
  -- Remove member (soft delete) - no updated_at column
  UPDATE group_members 
  SET is_active = false
  WHERE group_id = group_id_param 
  AND user_id = target_user_id_param;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to remove member');
  END IF;
  
  -- Update member count - using updated_at that exists in class_groups
  UPDATE class_groups 
  SET member_count = member_count - 1, updated_at = now()
  WHERE id = group_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Member removed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fixed delete_group function without updated_at for group_members
CREATE OR REPLACE FUNCTION delete_group(
  group_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS json AS $$
DECLARE
  group_creator_id uuid;
  group_exists boolean;
BEGIN
  -- Get group creator and check if group exists
  SELECT created_by, true INTO group_creator_id, group_exists
  FROM class_groups 
  WHERE id = group_id_param AND is_active = true;
  
  -- Check if group exists
  IF NOT group_exists OR group_creator_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Group not found or already deleted');
  END IF;
  
  -- Only group creator can delete group
  IF requesting_user_id_param != group_creator_id THEN
    RETURN json_build_object('success', false, 'error', 'Only the group creator can delete the group');
  END IF;
  
  -- Soft delete the group
  UPDATE class_groups 
  SET is_active = false, updated_at = now()
  WHERE id = group_id_param;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to delete group');
  END IF;
  
  -- Deactivate all members - no updated_at column
  UPDATE group_members 
  SET is_active = false
  WHERE group_id = group_id_param;
  
  RETURN json_build_object('success', true, 'message', 'Group deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION remove_group_member TO authenticated;
GRANT EXECUTE ON FUNCTION delete_group TO authenticated;
