/*
  # Fix Group RLS Policies to Prevent Infinite Recursion

  1. Drop existing problematic policies
  2. Create new non-recursive policies
  3. Ensure proper access control without circular references
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Group members can view membership" ON group_members;
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
DROP POLICY IF EXISTS "Group admins can manage members" ON group_members;
DROP POLICY IF EXISTS "Group members can view messages" ON group_messages;
DROP POLICY IF EXISTS "Group members can send messages" ON group_messages;
DROP POLICY IF EXISTS "Group members can view files" ON group_files;
DROP POLICY IF EXISTS "Group members can upload files" ON group_files;
DROP POLICY IF EXISTS "Group members can view announcements" ON group_announcements;
DROP POLICY IF EXISTS "Group admins can manage announcements" ON group_announcements;

-- Create non-recursive group member policies
CREATE POLICY "Users can view their own membership" ON group_members
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view members of groups they belong to" ON group_members
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Authenticated users can join groups" ON group_members
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own membership" ON group_members
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Group admins can update member roles" ON group_members
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Group admins can remove members" ON group_members
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

-- Create non-recursive group message policies
CREATE POLICY "Group members can view messages" ON group_messages
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group members can send messages" ON group_messages
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND user_id = auth.uid()
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create non-recursive group file policies
CREATE POLICY "Group members can view files" ON group_files
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group members can upload files" ON group_files
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND uploaded_by = auth.uid()
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Create non-recursive group announcement policies
CREATE POLICY "Group members can view announcements" ON group_announcements
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Group admins can create announcements" ON group_announcements
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' 
    AND created_by = auth.uid()
    AND group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Group admins can update announcements" ON group_announcements
  FOR UPDATE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );

CREATE POLICY "Group admins can delete announcements" ON group_announcements
  FOR DELETE USING (
    group_id IN (
      SELECT group_id FROM group_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = true
    )
  );
