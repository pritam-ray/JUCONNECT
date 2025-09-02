-- Initial data and categories for JU CONNECTS
-- This migration populates initial categories and sample data

-- ============================================================================
-- CATEGORIES
-- ============================================================================

INSERT INTO categories (name, slug, description, icon, color, sort_order) VALUES
('Computer Science', 'computer-science', 'Programming, algorithms, data structures, and CS fundamentals', '💻', '#3B82F6', 1),
('Mathematics', 'mathematics', 'Calculus, algebra, statistics, and mathematical concepts', '📊', '#8B5CF6', 2),
('Physics', 'physics', 'Mechanics, thermodynamics, electronics, and physics principles', '⚡', '#F59E0B', 3),
('Electronics', 'electronics', 'Circuit design, digital electronics, and embedded systems', '🔌', '#EF4444', 4),
('Management', 'management', 'Business studies, project management, and organizational behavior', '📈', '#10B981', 5),
('English', 'english', 'Literature, communication skills, and technical writing', '📚', '#6366F1', 6),
('Previous Papers', 'previous-papers', 'Previous year question papers and sample papers', '📝', '#F97316', 7),
('Assignments', 'assignments', 'Assignment solutions and project submissions', '📋', '#84CC16', 8),
('Study Materials', 'study-materials', 'Comprehensive study guides and reference materials', '📖', '#06B6D4', 9),
('Lab Manuals', 'lab-manuals', 'Laboratory experiment guides and practical manuals', '🔬', '#EC4899', 10);

-- Create a function to set up sample educational links
CREATE OR REPLACE FUNCTION setup_sample_links()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
    cs_category_id UUID;
    math_category_id UUID;
    physics_category_id UUID;
    electronics_category_id UUID;
    management_category_id UUID;
BEGIN
    -- Get the first admin user
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
    LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO cs_category_id FROM categories WHERE slug = 'computer-science';
    SELECT id INTO math_category_id FROM categories WHERE slug = 'mathematics';
    SELECT id INTO physics_category_id FROM categories WHERE slug = 'physics';
    SELECT id INTO electronics_category_id FROM categories WHERE slug = 'electronics';
    SELECT id INTO management_category_id FROM categories WHERE slug = 'management';
    
    -- Only proceed if admin exists
    IF admin_user_id IS NOT NULL THEN
        INSERT INTO educational_links (title, url, description, category_id, added_by, is_verified) VALUES
        ('MIT OpenCourseWare - Computer Science', 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/', 'Free computer science courses from MIT', cs_category_id, admin_user_id, true),
        ('Khan Academy - Mathematics', 'https://www.khanacademy.org/math', 'Comprehensive mathematics tutorials and exercises', math_category_id, admin_user_id, true),
        ('Physics Classroom', 'https://www.physicsclassroom.com/', 'Interactive physics lessons and simulations', physics_category_id, admin_user_id, true),
        ('All About Circuits', 'https://www.allaboutcircuits.com/', 'Electronics tutorials and circuit analysis', electronics_category_id, admin_user_id, true),
        ('Coursera Business Courses', 'https://www.coursera.org/browse/business', 'Online business and management courses', management_category_id, admin_user_id, true);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE ADMIN USER SETUP
-- ============================================================================

-- Note: This will be triggered when the first admin user signs up
-- The handle_new_user trigger will create the profile automatically

-- ============================================================================
-- SAMPLE CLASS GROUPS
-- ============================================================================

-- These will be created when admin users exist
-- For now, we'll create a structure that can be populated later

-- Create a function to set up sample groups (called after admin setup)
CREATE OR REPLACE FUNCTION setup_sample_groups()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first admin user
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
    LIMIT 1;
    
    -- Only proceed if admin exists
    IF admin_user_id IS NOT NULL THEN
        -- Insert sample groups
        INSERT INTO class_groups (name, description, year, section, subject, is_public, created_by) VALUES
        ('CSE 2024 - Section A', 'Computer Science Engineering 2024 batch Section A general group', 2, 'A', 'General', true, admin_user_id),
        ('CSE 2024 - Data Structures', 'Data Structures and Algorithms discussion group for CSE 2024', 2, 'A', 'Data Structures', true, admin_user_id),
        ('CSE 2024 - Web Development', 'Web Development project collaboration group', 2, 'A', 'Web Development', true, admin_user_id),
        ('ECE 2024 - Section B', 'Electronics and Communication Engineering 2024 batch Section B', 2, 'B', 'General', true, admin_user_id),
        ('ME 2024 - Section A', 'Mechanical Engineering 2024 batch Section A general group', 2, 'A', 'General', true, admin_user_id);
        
        -- Add admin to all groups
        INSERT INTO group_members (group_id, user_id, role)
        SELECT id, admin_user_id, 'admin'
        FROM class_groups
        WHERE created_by = admin_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SAMPLE CONTENT (APPROVED)
-- ============================================================================

-- Create a function to set up sample content
CREATE OR REPLACE FUNCTION setup_sample_content()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
    cs_category_id UUID;
    math_category_id UUID;
    physics_category_id UUID;
BEGIN
    -- Get the first admin user
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
    LIMIT 1;
    
    -- Get category IDs
    SELECT id INTO cs_category_id FROM categories WHERE slug = 'computer-science';
    SELECT id INTO math_category_id FROM categories WHERE slug = 'mathematics';
    SELECT id INTO physics_category_id FROM categories WHERE slug = 'physics';
    
    -- Only proceed if admin exists
    IF admin_user_id IS NOT NULL THEN
        -- Insert sample content
        INSERT INTO content (title, description, content_type, category_id, author_id, tags, is_approved, approved_by, approved_at) VALUES
        (
            'Introduction to Data Structures',
            'Comprehensive notes covering arrays, linked lists, stacks, and queues with examples and implementations.',
            'notes',
            cs_category_id,
            admin_user_id,
            ARRAY['data-structures', 'algorithms', 'programming', 'fundamentals'],
            true,
            admin_user_id,
            NOW()
        ),
        (
            'Calculus - Limits and Derivatives',
            'Complete study material for calculus including limits, continuity, and differentiation with solved examples.',
            'study_materials',
            math_category_id,
            admin_user_id,
            ARRAY['calculus', 'mathematics', 'derivatives', 'limits'],
            true,
            admin_user_id,
            NOW()
        ),
        (
            'Physics Previous Year Paper 2023',
            'Previous year question paper for Physics with detailed solutions and marking scheme.',
            'previous_papers',
            physics_category_id,
            admin_user_id,
            ARRAY['previous-papers', 'physics', '2023', 'solutions'],
            true,
            admin_user_id,
            NOW()
        ),
        (
            'Object Oriented Programming Lab Manual',
            'Complete lab manual for OOP with C++ including all experiments and sample codes.',
            'study_materials',
            cs_category_id,
            admin_user_id,
            ARRAY['oop', 'cpp', 'lab-manual', 'programming'],
            true,
            admin_user_id,
            NOW()
        ),
        (
            'Digital Electronics Assignment Solutions',
            'Solved assignments for Digital Electronics covering logic gates, flip-flops, and counters.',
            'assignments',
            (SELECT id FROM categories WHERE slug = 'electronics'),
            admin_user_id,
            ARRAY['digital-electronics', 'assignments', 'logic-gates'],
            true,
            admin_user_id,
            NOW()
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- WELCOME MESSAGE FUNCTION
-- ============================================================================

-- Create a function to post welcome message
CREATE OR REPLACE FUNCTION post_welcome_message()
RETURNS void AS $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first admin user
    SELECT id INTO admin_user_id
    FROM profiles
    WHERE role IN ('admin', 'super_admin')
    LIMIT 1;
    
    -- Only proceed if admin exists
    IF admin_user_id IS NOT NULL THEN
        -- Insert welcome message
        INSERT INTO chat_messages (user_id, message) VALUES
        (admin_user_id, '🎓 Welcome to JU CONNECTS! This is your university resource hub where you can share study materials, collaborate with classmates, and access academic resources. Feel free to share your notes, ask questions, and help your fellow students. Let''s build a strong academic community together! 📚✨');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Note: The sample setup functions will be called manually after the first admin user is created
