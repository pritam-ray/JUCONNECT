-- Create sample test data for debugging group access issues
-- This migration adds test groups and memberships to verify functionality

BEGIN;

-- Insert a sample group if it doesn't exist
INSERT INTO class_groups (
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
  updated_at
) 
SELECT 
  '11111111-1111-1111-1111-111111111111',
  'Test Group for Debugging',
  'A test group to verify chat functionality',
  4,
  'CS',
  'Computer Science',
  (SELECT id FROM profiles LIMIT 1),
  true,
  1,
  now(),
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM class_groups WHERE id = '11111111-1111-1111-1111-111111111111'
);

-- Add the first user as a member of the test group
INSERT INTO group_members (
  id,
  group_id,
  user_id,
  role,
  is_active,
  joined_at
)
SELECT 
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  p.id,
  'admin',
  true,
  now()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM group_members 
  WHERE group_id = '11111111-1111-1111-1111-111111111111' 
  AND user_id = p.id
)
LIMIT 1;

-- Add a test message to the group
INSERT INTO group_messages (
  id,
  group_id,
  user_id,
  message,
  created_at
)
SELECT 
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  p.id,
  'Welcome to the test group! This message confirms the chat is working.',
  now()
FROM profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM group_messages WHERE id = '33333333-3333-3333-3333-333333333333'
)
LIMIT 1;

COMMIT;
