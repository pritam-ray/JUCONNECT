/*
  # Create content table for file and resource management

  1. New Tables
    - `content`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, optional)
      - `content_type` (enum)
      - `category_id` (uuid, references categories)
      - `uploaded_by` (uuid, references profiles)
      - `file_url` (text, optional)
      - `file_name` (text, optional)
      - `file_size` (bigint, optional)
      - `file_type` (text, optional)
      - `external_url` (text, optional)
      - `tags` (text array, optional)
      - `year` (integer, optional)
      - `semester` (integer, optional)
      - `view_count` (integer, default 0)
      - `download_count` (integer, default 0)
      - `is_approved` (boolean, default true for auto-approval)
      - `is_featured` (boolean, default false)
      - `approved_by` (uuid, references profiles)
      - `approved_at` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `content` table
    - Add policies for content viewing and management
    - Add policies for user uploads

  3. Functions
    - Auto-approval for content uploads
    - View count increment function
*/

-- Create content type enum
CREATE TYPE content_type AS ENUM (
  'notes', 
  'question_paper', 
  'syllabus', 
  'assignments', 
  'educational_link', 
  'other'
);

-- Create content table
CREATE TABLE IF NOT EXISTS content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type content_type NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  file_url text,
  file_name text,
  file_size bigint CHECK (file_size <= 5242880), -- 5MB limit
  file_type text,
  external_url text,
  tags text[],
  year integer CHECK (year >= 1 AND year <= 5),
  semester integer CHECK (semester >= 1 AND semester <= 10),
  view_count integer DEFAULT 0,
  download_count integer DEFAULT 0,
  is_approved boolean DEFAULT true, -- Auto-approve for better UX
  is_featured boolean DEFAULT false,
  approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Ensure either file_url or external_url is provided
  CONSTRAINT content_has_resource CHECK (
    file_url IS NOT NULL OR external_url IS NOT NULL
  )
);

-- Enable RLS
ALTER TABLE content ENABLE ROW LEVEL SECURITY;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_content_category ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_uploader ON content(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_content_type ON content(content_type);
CREATE INDEX IF NOT EXISTS idx_content_approved ON content(is_approved);
CREATE INDEX IF NOT EXISTS idx_content_year_semester ON content(year, semester);
CREATE INDEX IF NOT EXISTS idx_content_tags ON content USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_content_created ON content(created_at DESC);

-- RLS Policies
CREATE POLICY "Anyone can view approved content"
  ON content
  FOR SELECT
  USING (is_approved = true);

CREATE POLICY "Users can view their own content"
  ON content
  FOR SELECT
  TO authenticated
  USING (uploaded_by = auth.uid());

CREATE POLICY "Authenticated users can upload content"
  ON content
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Users can update their own content"
  ON content
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all content"
  ON content
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_content_updated_at
  BEFORE UPDATE ON content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_view_count(content_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE content 
  SET view_count = view_count + 1 
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(content_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE content 
  SET download_count = download_count + 1 
  WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;