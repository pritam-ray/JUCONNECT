-- Fix RLS policies to properly handle password protection
-- This migration ensures INSERT works correctly for both protected and unprotected groups

-- First, let's see what policies exist and recreate them properly
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Anyone can view groups" ON class_groups;
    DROP POLICY IF EXISTS "Authenticated users can create groups" ON class_groups;
    DROP POLICY IF EXISTS "Group creators can update their groups" ON class_groups;
    
    -- Recreate SELECT policy
    CREATE POLICY "Anyone can view groups" ON class_groups
      FOR SELECT USING (
        is_active = true AND (
          NOT COALESCE(is_password_protected, false) OR
          EXISTS (
            SELECT 1 FROM group_members
            WHERE group_id = class_groups.id
            AND user_id = auth.uid()
            AND is_active = true
          )
        )
      );
    
    -- Recreate INSERT policy - simplified to just check authentication
    CREATE POLICY "Authenticated users can create groups" ON class_groups
      FOR INSERT WITH CHECK (
        auth.role() = 'authenticated' AND 
        created_by = auth.uid()
      );
    
    -- Recreate UPDATE policy
    CREATE POLICY "Group creators can update their groups" ON class_groups
      FOR UPDATE 
      USING (created_by = auth.uid())
      WITH CHECK (created_by = auth.uid());
      
END $$;
