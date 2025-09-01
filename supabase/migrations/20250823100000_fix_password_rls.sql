-- Fix RLS policies for password protection
-- This migration fixes the INSERT policy to allow password-protected groups

-- Drop and recreate the INSERT policy to handle password columns
DROP POLICY IF EXISTS "Authenticated users can create groups" ON class_groups;
CREATE POLICY "Authenticated users can create groups" ON class_groups
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    created_by = auth.uid()
  );

-- Ensure the UPDATE policy allows updating password fields
DROP POLICY IF EXISTS "Group creators can update their groups" ON class_groups;
CREATE POLICY "Group creators can update their groups" ON class_groups
  FOR UPDATE USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
