/*
  # Create Sample Groups Data
  
  This migration creates sample class groups to test the functionality
  and ensures users can see groups when they visit the page.
*/

-- Insert sample class groups (only if table is empty)
INSERT INTO class_groups (name, description, year, section, subject, created_by, member_count)
SELECT 
  'Computer Science Year 1 - Section A',
  'Main group for CS Year 1 Section A students. Share notes, assignments, and collaborate on projects.',
  1,
  'A',
  'Computer Science',
  (SELECT id FROM profiles LIMIT 1), -- Use first available user as creator
  0
WHERE NOT EXISTS (SELECT 1 FROM class_groups WHERE year = 1 AND section = 'A' AND subject = 'Computer Science');

INSERT INTO class_groups (name, description, year, section, subject, created_by, member_count)
SELECT 
  'Mathematics Year 2 - Section B',
  'Group for Mathematics Year 2 Section B. Discuss complex problems and share study materials.',
  2,
  'B',
  'Mathematics',
  (SELECT id FROM profiles LIMIT 1),
  0
WHERE NOT EXISTS (SELECT 1 FROM class_groups WHERE year = 2 AND section = 'B' AND subject = 'Mathematics');

INSERT INTO class_groups (name, description, year, section, subject, created_by, member_count)
SELECT 
  'Physics Year 3 - Section A',
  'Advanced Physics discussion group. Share research papers and collaborate on experiments.',
  3,
  'A',
  'Physics',
  (SELECT id FROM profiles LIMIT 1),
  0
WHERE NOT EXISTS (SELECT 1 FROM class_groups WHERE year = 3 AND section = 'A' AND subject = 'Physics');

INSERT INTO class_groups (name, description, year, section, subject, created_by, member_count)
SELECT 
  'Chemistry Year 1 - Section C',
  'Chemistry basics and lab work coordination. Share safety protocols and results.',
  1,
  'C',
  'Chemistry',
  (SELECT id FROM profiles LIMIT 1),
  0
WHERE NOT EXISTS (SELECT 1 FROM class_groups WHERE year = 1 AND section = 'C' AND subject = 'Chemistry');

INSERT INTO class_groups (name, description, year, section, subject, created_by, member_count)
SELECT 
  'Engineering Year 4 - Section A',
  'Final year engineering projects and internship discussions.',
  4,
  'A',
  'Engineering',
  (SELECT id FROM profiles LIMIT 1),
  0
WHERE NOT EXISTS (SELECT 1 FROM class_groups WHERE year = 4 AND section = 'A' AND subject = 'Engineering');
