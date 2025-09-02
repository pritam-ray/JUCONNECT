/*
  # Create sample data for development and testing

  1. Sample Data
    - Sample groups for different years and sections
    - Sample content in various categories
    - Sample educational links
    - Welcome messages

  2. Development Helpers
    - Functions to generate test data
    - Data cleanup functions
    - Reset functions for development

  3. Production Safety
    - Only create sample data if no real data exists
    - Safe to run multiple times
*/

-- Function to create sample groups (only if no groups exist)
CREATE OR REPLACE FUNCTION setup_sample_groups()
RETURNS void AS $$
DECLARE
  sample_user_id uuid;
  group_id uuid;
BEGIN
  -- Only create sample data if no groups exist
  IF EXISTS (SELECT 1 FROM class_groups LIMIT 1) THEN
    RETURN;
  END IF;
  
  -- Get a sample user (first admin or first user)
  SELECT id INTO sample_user_id
  FROM profiles
  WHERE is_admin = true OR role = 'admin'
  LIMIT 1;
  
  IF sample_user_id IS NULL THEN
    SELECT id INTO sample_user_id
    FROM profiles
    LIMIT 1;
  END IF;
  
  IF sample_user_id IS NULL THEN
    RETURN; -- No users exist yet
  END IF;
  
  -- Create sample groups
  INSERT INTO class_groups (name, description, year, section, subject, creator_id) VALUES
    ('Computer Science 4th Year Section A', 'Main group for CS 4th year students in section A', 4, 'A', 'Computer Science', sample_user_id),
    ('Computer Science 4th Year Section B', 'Main group for CS 4th year students in section B', 4, 'B', 'Computer Science', sample_user_id),
    ('Mathematics 3rd Year', 'Mathematics study group for 3rd year students', 3, 'A', 'Mathematics', sample_user_id),
    ('Physics 2nd Year Lab Group', 'Physics laboratory discussion group', 2, 'A', 'Physics', sample_user_id),
    ('General Study Group', 'Open study group for all students', 1, 'ALL', 'General Studies', sample_user_id)
  ON CONFLICT (year, section, subject) DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Function to create sample content (only if no content exists)
CREATE OR REPLACE FUNCTION setup_sample_content()
RETURNS void AS $$
DECLARE
  sample_user_id uuid;
  cs_category_id uuid;
  math_category_id uuid;
  physics_category_id uuid;
BEGIN
  -- Only create sample data if no content exists
  IF EXISTS (SELECT 1 FROM content LIMIT 1) THEN
    RETURN;
  END IF;
  
  -- Get sample user and categories
  SELECT id INTO sample_user_id FROM profiles LIMIT 1;
  SELECT id INTO cs_category_id FROM categories WHERE slug = 'computer-science';
  SELECT id INTO math_category_id FROM categories WHERE slug = 'mathematics';
  SELECT id INTO physics_category_id FROM categories WHERE slug = 'physics';
  
  IF sample_user_id IS NULL THEN
    RETURN; -- No users exist yet
  END IF;
  
  -- Create sample content
  INSERT INTO content (title, description, content_type, category_id, uploaded_by, external_url, tags, year, semester) VALUES
    (
      'Data Structures and Algorithms Notes',
      'Comprehensive notes covering arrays, linked lists, trees, and sorting algorithms',
      'notes',
      cs_category_id,
      sample_user_id,
      'https://example.com/dsa-notes',
      ARRAY['algorithms', 'data-structures', 'programming'],
      4,
      1
    ),
    (
      'Database Management Systems Question Paper 2024',
      'Previous year question paper for DBMS final examination',
      'question_paper',
      cs_category_id,
      sample_user_id,
      'https://example.com/dbms-paper',
      ARRAY['database', 'sql', 'exam'],
      4,
      2
    ),
    (
      'Calculus Study Guide',
      'Complete study guide for differential and integral calculus',
      'notes',
      math_category_id,
      sample_user_id,
      'https://example.com/calculus-guide',
      ARRAY['calculus', 'mathematics', 'derivatives'],
      2,
      1
    ),
    (
      'Physics Lab Manual',
      'Laboratory manual for physics experiments and procedures',
      'syllabus',
      physics_category_id,
      sample_user_id,
      'https://example.com/physics-lab',
      ARRAY['physics', 'laboratory', 'experiments'],
      2,
      2
    )
  ON CONFLICT DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Function to create sample educational links
CREATE OR REPLACE FUNCTION setup_sample_links()
RETURNS void AS $$
DECLARE
  sample_user_id uuid;
  cs_category_id uuid;
BEGIN
  SELECT id INTO sample_user_id FROM profiles LIMIT 1;
  SELECT id INTO cs_category_id FROM categories WHERE slug = 'computer-science';
  
  IF sample_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Create sample educational links
  INSERT INTO content (title, description, content_type, category_id, uploaded_by, external_url, tags) VALUES
    (
      'MIT OpenCourseWare - Introduction to Computer Science',
      'Free online course materials from MIT covering fundamental computer science concepts',
      'educational_link',
      cs_category_id,
      sample_user_id,
      'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/',
      ARRAY['mit', 'computer-science', 'free-course']
    ),
    (
      'Khan Academy - Computer Programming',
      'Interactive programming tutorials and exercises for beginners',
      'educational_link',
      cs_category_id,
      sample_user_id,
      'https://www.khanacademy.org/computing/computer-programming',
      ARRAY['programming', 'tutorial', 'interactive']
    )
  ON CONFLICT DO NOTHING;
  
END;
$$ LANGUAGE plpgsql;

-- Function to post welcome message in global chat
CREATE OR REPLACE FUNCTION post_welcome_message()
RETURNS void AS $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Get an admin user
  SELECT id INTO admin_user_id
  FROM profiles
  WHERE is_admin = true
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Post welcome message if no messages exist
  IF NOT EXISTS (SELECT 1 FROM chat_messages LIMIT 1) THEN
    INSERT INTO chat_messages (user_id, message) VALUES
      (admin_user_id, 'Welcome to JU CONNECTS! 🎓 This is your global chat where you can connect with fellow students. Feel free to ask questions, share resources, and collaborate on your academic journey!');
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Execute sample data creation functions
SELECT setup_sample_groups();
SELECT setup_sample_content();
SELECT setup_sample_links();
SELECT post_welcome_message();