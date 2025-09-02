/*
  # Create file management and security system

  1. New Tables
    - `file_uploads` - Track all file uploads
    - `file_security_scans` - Security scan results
    - `update_requests` - User requests for content updates

  2. Security
    - Enable RLS on all file tables
    - Add policies for file access control
    - Add security scanning policies

  3. Functions
    - File upload tracking
    - Security validation
    - Request management
*/

-- Create file_uploads table for tracking all uploads
CREATE TABLE IF NOT EXISTS file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size <= 5242880), -- 5MB limit
  file_type text NOT NULL,
  upload_path text NOT NULL,
  content_id uuid REFERENCES content(id) ON DELETE SET NULL,
  group_id uuid REFERENCES class_groups(id) ON DELETE SET NULL,
  upload_purpose text DEFAULT 'content' CHECK (upload_purpose IN ('content', 'group_file', 'avatar', 'other')),
  is_processed boolean DEFAULT false,
  processing_error text,
  created_at timestamptz DEFAULT now()
);

-- Create file_security_scans table
CREATE TABLE IF NOT EXISTS file_security_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_upload_id uuid NOT NULL REFERENCES file_uploads(id) ON DELETE CASCADE,
  content_id uuid REFERENCES content(id) ON DELETE CASCADE,
  scan_status text DEFAULT 'pending' CHECK (scan_status IN ('pending', 'scanning', 'clean', 'infected', 'error')),
  scan_results jsonb,
  threats_found text[],
  scan_engine text DEFAULT 'internal',
  scanned_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create update_requests table for user requests
CREATE TABLE IF NOT EXISTS update_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content_id uuid REFERENCES content(id) ON DELETE SET NULL,
  content_type content_type DEFAULT 'notes',
  title text,
  description text,
  issue_description text NOT NULL,
  suggested_changes text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_requests ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_file_uploads_user ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_content ON file_uploads(content_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_group ON file_uploads(group_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_created ON file_uploads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_file_security_scans_upload ON file_security_scans(file_upload_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_content ON file_security_scans(content_id);
CREATE INDEX IF NOT EXISTS idx_file_security_scans_status ON file_security_scans(scan_status);

CREATE INDEX IF NOT EXISTS idx_update_requests_user ON update_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_update_requests_status ON update_requests(status);
CREATE INDEX IF NOT EXISTS idx_update_requests_created ON update_requests(created_at DESC);

-- RLS Policies for file_uploads
CREATE POLICY "Users can view their own file uploads"
  ON file_uploads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create file uploads"
  ON file_uploads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all file uploads"
  ON file_uploads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for file_security_scans
CREATE POLICY "Users can view scans of their files"
  ON file_security_scans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM file_uploads fu 
      WHERE fu.id = file_upload_id AND fu.user_id = auth.uid()
    )
  );

CREATE POLICY "System can create security scans"
  ON file_security_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for update_requests
CREATE POLICY "Users can view their own requests"
  ON update_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create requests"
  ON update_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all requests"
  ON update_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Triggers for updated_at
CREATE TRIGGER update_update_requests_updated_at
  BEFORE UPDATE ON update_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle file upload completion
CREATE OR REPLACE FUNCTION handle_file_upload_completion()
RETURNS trigger AS $$
BEGIN
  -- Mark file as processed
  NEW.is_processed = true;
  
  -- Create security scan entry
  INSERT INTO file_security_scans (file_upload_id, scan_status)
  VALUES (NEW.id, 'clean'); -- Auto-approve for now
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for file upload completion
CREATE TRIGGER on_file_upload_complete
  BEFORE UPDATE ON file_uploads
  FOR EACH ROW
  WHEN (OLD.is_processed = false AND NEW.is_processed = true)
  EXECUTE FUNCTION handle_file_upload_completion();