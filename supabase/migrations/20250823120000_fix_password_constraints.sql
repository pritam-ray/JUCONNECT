-- Fix password protection columns to allow NULL values
-- This ensures groups can be created without password protection

-- Make sure password_hash can be NULL
ALTER TABLE class_groups ALTER COLUMN password_hash DROP NOT NULL;

-- Make sure is_password_protected has a proper default
ALTER TABLE class_groups ALTER COLUMN is_password_protected SET DEFAULT false;

-- Disable RLS temporarily to test
ALTER TABLE class_groups DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with simple policies
ALTER TABLE class_groups ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Anyone can view groups" ON class_groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON class_groups;
DROP POLICY IF EXISTS "Group creators can update their groups" ON class_groups;

-- Create very simple policies for testing
CREATE POLICY "Allow authenticated users to view groups" ON class_groups
  FOR SELECT USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "Allow authenticated users to create groups" ON class_groups
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow creators to update groups" ON class_groups
  FOR UPDATE USING (created_by = auth.uid());
