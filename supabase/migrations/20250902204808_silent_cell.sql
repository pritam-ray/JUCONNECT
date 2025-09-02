/*
  # Create categories table for content organization

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `description` (text, optional)
      - `icon` (text, optional)
      - `color` (text, default color)
      - `parent_id` (uuid, self-reference for hierarchy)
      - `is_active` (boolean)
      - `sort_order` (integer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `categories` table
    - Add policies for public reading
    - Add policies for admin management

  3. Sample Data
    - Insert common academic categories
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  icon text,
  color text DEFAULT '#3B82F6',
  parent_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(sort_order);

-- RLS Policies
CREATE POLICY "Anyone can view active categories"
  ON categories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create categories"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample categories
INSERT INTO categories (name, slug, description, icon, color) VALUES
  ('Computer Science', 'computer-science', 'Programming, algorithms, and software development', '💻', '#3B82F6'),
  ('Mathematics', 'mathematics', 'Calculus, algebra, statistics, and mathematical concepts', '📊', '#10B981'),
  ('Physics', 'physics', 'Mechanics, thermodynamics, and physical sciences', '⚛️', '#8B5CF6'),
  ('Chemistry', 'chemistry', 'Organic, inorganic, and analytical chemistry', '🧪', '#F59E0B'),
  ('Electronics', 'electronics', 'Circuit design, digital systems, and electronics', '⚡', '#EF4444'),
  ('Mechanical Engineering', 'mechanical-engineering', 'Thermodynamics, mechanics, and machine design', '⚙️', '#6B7280'),
  ('Civil Engineering', 'civil-engineering', 'Structural engineering, construction, and infrastructure', '🏗️', '#84CC16'),
  ('Business Studies', 'business-studies', 'Management, economics, and business administration', '💼', '#F97316'),
  ('English Literature', 'english-literature', 'Literature, writing, and language studies', '📚', '#EC4899'),
  ('General Studies', 'general-studies', 'Miscellaneous academic content and resources', '📖', '#64748B')
ON CONFLICT (slug) DO NOTHING;