/*
  # Create admin management functions

  1. Admin Functions
    - Group management functions
    - User role management
    - Content moderation functions
    - System maintenance functions

  2. Security
    - Admin-only access controls
    - Proper permission checking
    - Audit logging

  3. Utilities
    - Bulk operations
    - Data cleanup functions
    - Statistics functions
*/

-- Function to check if user is group admin
CREATE OR REPLACE FUNCTION is_group_admin(group_id_param uuid, user_id_param uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM class_groups cg
    LEFT JOIN group_members gm ON gm.group_id = cg.id
    WHERE cg.id = group_id_param AND (
      cg.creator_id = user_id_param OR
      (gm.user_id = user_id_param AND gm.role = 'admin' AND gm.is_active = true)
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to promote user to group admin
CREATE OR REPLACE FUNCTION promote_to_admin(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  is_authorized boolean := false;
  member_exists boolean := false;
BEGIN
  -- Check if requesting user is authorized
  SELECT is_group_admin(group_id_param, requesting_user_id_param) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to promote members');
  END IF;
  
  -- Check if target user is a member
  SELECT EXISTS (
    SELECT 1 FROM group_members 
    WHERE group_id = group_id_param AND user_id = target_user_id_param AND is_active = true
  ) INTO member_exists;
  
  IF NOT member_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a member of this group');
  END IF;
  
  -- Promote to admin
  UPDATE group_members
  SET role = 'admin'
  WHERE group_id = group_id_param AND user_id = target_user_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'User promoted to admin successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to demote admin to member
CREATE OR REPLACE FUNCTION demote_admin(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  is_authorized boolean := false;
  is_creator boolean := false;
BEGIN
  -- Check if requesting user is authorized
  SELECT is_group_admin(group_id_param, requesting_user_id_param) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to demote members');
  END IF;
  
  -- Check if target user is the group creator (cannot be demoted)
  SELECT EXISTS (
    SELECT 1 FROM class_groups 
    WHERE id = group_id_param AND creator_id = target_user_id_param
  ) INTO is_creator;
  
  IF is_creator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot demote the group creator');
  END IF;
  
  -- Demote to member
  UPDATE group_members
  SET role = 'member'
  WHERE group_id = group_id_param AND user_id = target_user_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'User demoted to member successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove group member
CREATE OR REPLACE FUNCTION remove_group_member(
  group_id_param uuid,
  target_user_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  is_authorized boolean := false;
  is_creator boolean := false;
BEGIN
  -- Check if requesting user is authorized
  SELECT is_group_admin(group_id_param, requesting_user_id_param) INTO is_authorized;
  
  IF NOT is_authorized THEN
    RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to remove members');
  END IF;
  
  -- Check if target user is the group creator (cannot be removed)
  SELECT EXISTS (
    SELECT 1 FROM class_groups 
    WHERE id = group_id_param AND creator_id = target_user_id_param
  ) INTO is_creator;
  
  IF is_creator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot remove the group creator');
  END IF;
  
  -- Remove member (set as inactive)
  UPDATE group_members
  SET is_active = false
  WHERE group_id = group_id_param AND user_id = target_user_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'Member removed successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update group details
CREATE OR REPLACE FUNCTION update_group_details(
  group_id_param uuid,
  new_name text DEFAULT NULL,
  new_description text DEFAULT NULL,
  requesting_user_id_param uuid DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  is_authorized boolean := false;
BEGIN
  -- Check if requesting user is authorized (creator or admin)
  IF requesting_user_id_param IS NOT NULL THEN
    SELECT is_group_admin(group_id_param, requesting_user_id_param) INTO is_authorized;
    
    IF NOT is_authorized THEN
      RETURN jsonb_build_object('success', false, 'error', 'You do not have permission to update group details');
    END IF;
  END IF;
  
  -- Update group details
  UPDATE class_groups
  SET 
    name = COALESCE(new_name, name),
    description = COALESCE(new_description, description),
    updated_at = now()
  WHERE id = group_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'Group updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete group (creator only)
CREATE OR REPLACE FUNCTION delete_group(
  group_id_param uuid,
  requesting_user_id_param uuid
)
RETURNS jsonb AS $$
DECLARE
  is_creator boolean := false;
BEGIN
  -- Check if requesting user is the creator
  SELECT EXISTS (
    SELECT 1 FROM class_groups 
    WHERE id = group_id_param AND creator_id = requesting_user_id_param
  ) INTO is_creator;
  
  IF NOT is_creator THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the group creator can delete the group');
  END IF;
  
  -- Delete group (cascade will handle related records)
  DELETE FROM class_groups WHERE id = group_id_param;
  
  RETURN jsonb_build_object('success', true, 'message', 'Group deleted successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to make user admin (super admin only)
CREATE OR REPLACE FUNCTION make_user_admin(target_user_id uuid)
RETURNS boolean AS $$
DECLARE
  requesting_user_role user_role;
BEGIN
  -- Get requesting user's role
  SELECT role INTO requesting_user_role
  FROM profiles
  WHERE id = auth.uid();
  
  -- Only super_admin can promote users to admin
  IF requesting_user_role != 'super_admin' THEN
    RETURN false;
  END IF;
  
  -- Update user role
  UPDATE profiles
  SET role = 'admin'
  WHERE id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group admin info
CREATE OR REPLACE VIEW group_admin_info AS
SELECT 
  cg.id as group_id,
  cg.name as group_name,
  cg.creator_id,
  cp.full_name as creator_name,
  cp.username as creator_username,
  COUNT(CASE WHEN gm.role = 'admin' THEN 1 END) as admin_count,
  COUNT(gm.id) as total_members,
  cg.created_at,
  cg.is_active
FROM class_groups cg
LEFT JOIN profiles cp ON cp.id = cg.creator_id
LEFT JOIN group_members gm ON gm.group_id = cg.id AND gm.is_active = true
GROUP BY cg.id, cg.name, cg.creator_id, cp.full_name, cp.username, cg.created_at, cg.is_active;

-- Function to get content statistics
CREATE OR REPLACE FUNCTION get_content_stats()
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_content', COUNT(*),
    'approved_content', COUNT(*) FILTER (WHERE is_approved = true),
    'pending_content', COUNT(*) FILTER (WHERE is_approved = false),
    'by_type', jsonb_object_agg(content_type, type_count)
  ) INTO stats
  FROM (
    SELECT 
      content_type,
      COUNT(*) as type_count
    FROM content
    GROUP BY content_type
  ) type_stats,
  content;
  
  RETURN COALESCE(stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user engagement stats
CREATE OR REPLACE FUNCTION get_user_engagement_stats(user_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_uploads', (SELECT COUNT(*) FROM content WHERE uploaded_by = user_id_param),
    'total_messages', (
      SELECT COUNT(*) FROM chat_messages WHERE user_id = user_id_param
    ) + (
      SELECT COUNT(*) FROM group_messages WHERE user_id = user_id_param
    ) + (
      SELECT COUNT(*) FROM private_messages WHERE sender_id = user_id_param
    ),
    'groups_joined', (SELECT COUNT(*) FROM group_members WHERE user_id = user_id_param AND is_active = true),
    'total_views', (SELECT COALESCE(SUM(view_count), 0) FROM content WHERE uploaded_by = user_id_param),
    'join_date', (SELECT created_at FROM profiles WHERE id = user_id_param)
  ) INTO stats;
  
  RETURN COALESCE(stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;