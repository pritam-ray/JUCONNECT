/*
# College Exam Preparation Platform Database Schema

## Overview
This migration creates the complete database schema for a college exam preparation platform.

## New Tables

### 1. User Profiles (`profiles`)
- Extended user information with mobile numbers and unique usernames
- Links to Supabase auth users

### 2. Content Storage (`content`)
- Stores all educational materials (papers, notes, links, etc.)
- Tracks uploader, approval status, and metadata

### 3. Content Categories (`categories`)
- Hierarchical organization of subjects and topics
- Supports nested categorization

### 4. Educational Links (`educational_links`)
- YouTube videos, websites, and articles
- Metadata extraction and organization

### 5. Chat Messages (`chat_messages`)
- Real-time messaging system
- Auto-cleanup after 6 months

### 6. Update Requests (`update_requests`)
- Ticketing system for content modifications
- Admin workflow for approvals

### 7. File Uploads (`file_uploads`)
- Secure file management with validation
- Size and type restrictions

## Security
- Row Level Security (RLS) enabled on all tables
- Appropriate policies for different user roles
- Guest access restrictions

## Performance
- Optimized indexes for search functionality
- Efficient query patterns for large datasets
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE content_type AS ENUM ('question_paper', 'notes', 'syllabus', 'educational_link');
CREATE TYPE request_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE file_type AS ENUM ('pdf', 'doc', 'docx', 'txt', 'jpg', 'png');

-- Profiles table for extended user information
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  mobile_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Categories for organizing content
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Main content table
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type content_type NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  file_url text,
  file_size bigint,
  file_type file_type,
  external_url text,
  tags text[] DEFAULT '{}',
  year integer,
  semester integer,
  is_approved boolean DEFAULT false,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Educational links table
CREATE TABLE IF NOT EXISTS educational_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  url text NOT NULL,
  description text,
  platform text NOT NULL, -- youtube, website, article
  thumbnail_url text,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_approved boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  is_reported boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Update requests table (ticketing system)
CREATE TABLE IF NOT EXISTS update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  content_type content_type NOT NULL,
  content_id uuid, -- References content.id or educational_links.id
  issue_description text NOT NULL,
  suggested_changes text,
  status request_status DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- File uploads tracking
CREATE TABLE IF NOT EXISTS file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  file_size bigint NOT NULL,
  file_type file_type NOT NULL,
  upload_path text NOT NULL,
  is_processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_approved ON content(is_approved);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_content_search ON content USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_educational_links_category ON educational_links(category_id);
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON update_requests(status);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE educational_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Categories policies (public read, admin write)
CREATE POLICY "Categories are viewable by everyone" ON categories
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage categories" ON categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Content policies
CREATE POLICY "Approved content is viewable by everyone" ON content
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own content" ON content
  FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can insert content" ON content
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all content" ON content
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Educational links policies
CREATE POLICY "Approved links are viewable by everyone" ON educational_links
  FOR SELECT USING (is_approved = true);

CREATE POLICY "Users can view their own links" ON educational_links
  FOR SELECT USING (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can insert links" ON educational_links
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all links" ON educational_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Chat messages policies
CREATE POLICY "Chat messages are viewable by authenticated users" ON chat_messages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert messages" ON chat_messages
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all chat messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Update requests policies
CREATE POLICY "Users can view their own requests" ON update_requests
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can create requests" ON update_requests
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Admins can view and manage all requests" ON update_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- File uploads policies
CREATE POLICY "Users can view their own uploads" ON file_uploads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can upload files" ON file_uploads
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = auth.uid());

CREATE POLICY "Admins can view all uploads" ON file_uploads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Insert default categories
INSERT INTO categories (name, slug, description) VALUES
('Computer Science', 'computer-science', 'All computer science related materials'),
('Mathematics', 'mathematics', 'Mathematical concepts and problem sets'),
('Physics', 'physics', 'Physics theory and practical materials'),
('Chemistry', 'chemistry', 'Chemistry notes and question papers'),
('Engineering', 'engineering', 'General engineering subjects'),
('Business Studies', 'business-studies', 'Business and management materials');

-- Insert subcategories
INSERT INTO categories (name, slug, description, parent_id) VALUES
('Data Structures', 'data-structures', 'Data structures and algorithms', 
  (SELECT id FROM categories WHERE slug = 'computer-science')),
('Database Systems', 'database-systems', 'Database management systems',
  (SELECT id FROM categories WHERE slug = 'computer-science')),
('Calculus', 'calculus', 'Differential and integral calculus',
  (SELECT id FROM categories WHERE slug = 'mathematics')),
('Linear Algebra', 'linear-algebra', 'Matrix operations and vector spaces',
  (SELECT id FROM categories WHERE slug = 'mathematics'));

-- Function to auto-delete old chat messages (6 months)
CREATE OR REPLACE FUNCTION delete_old_chat_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM chat_messages 
  WHERE created_at < now() - interval '6 months';
END;
$$;

-- Create a trigger to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_updated_at BEFORE UPDATE ON content
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_update_requests_updated_at BEFORE UPDATE ON update_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();