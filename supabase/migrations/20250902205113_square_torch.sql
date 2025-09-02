/*
  # Create enhanced features for monitoring and analytics

  1. Enhanced Tables
    - `user_activity_logs` - Track user activities
    - `error_logs` - Application error tracking
    - `file_upload_sessions` - Upload progress tracking
    - `user_engagement_metrics` - User engagement analytics
    - `cleanup_logs` - System maintenance logs

  2. Functions
    - Activity logging functions
    - Error reporting functions
    - Engagement tracking functions
    - System maintenance functions

  3. Security
    - Admin-only access to sensitive logs
    - User access to their own data
    - Proper audit trails
*/

-- Create user_activity_logs table
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  activity_type text NOT NULL CHECK (activity_type IN (
    'login', 'logout', 'upload', 'download', 'message', 
    'group_join', 'group_leave', 'profile_update', 'error'
  )),
  activity_data jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create error_logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  error_type text NOT NULL CHECK (error_type IN (
    'authentication', 'database', 'file_upload', 'network', 
    'infinite_recursion', 'memory_leak', 'unknown'
  )),
  error_message text NOT NULL,
  error_stack text,
  context jsonb DEFAULT '{}',
  severity text DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create file_upload_sessions table
CREATE TABLE IF NOT EXISTS file_upload_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  file_type text NOT NULL,
  upload_status text DEFAULT 'pending' CHECK (upload_status IN (
    'pending', 'uploading', 'completed', 'failed', 'cancelled'
  )),
  upload_progress integer DEFAULT 0 CHECK (upload_progress >= 0 AND upload_progress <= 100),
  error_message text,
  storage_path text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create user_engagement_metrics table
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  page_views integer DEFAULT 0,
  messages_sent integer DEFAULT 0,
  files_uploaded integer DEFAULT 0,
  files_downloaded integer DEFAULT 0,
  groups_joined integer DEFAULT 0,
  session_duration_minutes integer DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  
  -- Unique constraint for user per day
  UNIQUE(user_id, metric_date)
);

-- Create cleanup_logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL,
  deleted_count integer DEFAULT 0,
  details jsonb DEFAULT '{}',
  status text DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'partial')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON user_activity_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user ON file_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON file_upload_sessions(upload_status);

CREATE INDEX IF NOT EXISTS idx_engagement_user_date ON user_engagement_metrics(user_id, metric_date);

-- RLS Policies for activity logs
CREATE POLICY "Users can view their own activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create activity logs"
  ON user_activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view all activity logs"
  ON user_activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for error logs
CREATE POLICY "Users can view their own error logs"
  ON error_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create error logs"
  ON error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage all error logs"
  ON error_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- RLS Policies for upload sessions
CREATE POLICY "Users can view their own upload sessions"
  ON file_upload_sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create upload sessions"
  ON file_upload_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own upload sessions"
  ON file_upload_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for engagement metrics
CREATE POLICY "Users can view their own engagement metrics"
  ON user_engagement_metrics
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can manage engagement metrics"
  ON user_engagement_metrics
  FOR ALL
  TO authenticated
  WITH CHECK (true);

-- Functions for logging activities
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id uuid,
  p_activity_type text,
  p_activity_data jsonb DEFAULT '{}',
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  activity_id uuid;
BEGIN
  INSERT INTO user_activity_logs (
    user_id, activity_type, activity_data, ip_address, user_agent
  ) VALUES (
    p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent
  ) RETURNING id INTO activity_id;
  
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for logging errors
CREATE OR REPLACE FUNCTION log_error(
  p_user_id uuid DEFAULT NULL,
  p_error_type text DEFAULT 'unknown',
  p_error_message text DEFAULT '',
  p_error_stack text DEFAULT NULL,
  p_context jsonb DEFAULT '{}',
  p_severity text DEFAULT 'error'
)
RETURNS uuid AS $$
DECLARE
  error_id uuid;
BEGIN
  INSERT INTO error_logs (
    user_id, error_type, error_message, error_stack, context, severity
  ) VALUES (
    p_user_id, p_error_type, p_error_message, p_error_stack, p_context, p_severity
  ) RETURNING id INTO error_id;
  
  RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for updating user engagement
CREATE OR REPLACE FUNCTION update_user_engagement(
  p_user_id uuid,
  p_page_views integer DEFAULT 0,
  p_messages_sent integer DEFAULT 0,
  p_files_uploaded integer DEFAULT 0,
  p_files_downloaded integer DEFAULT 0,
  p_groups_joined integer DEFAULT 0,
  p_session_duration integer DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_engagement_metrics (
    user_id, page_views, messages_sent, files_uploaded, 
    files_downloaded, groups_joined, session_duration_minutes
  ) VALUES (
    p_user_id, p_page_views, p_messages_sent, p_files_uploaded,
    p_files_downloaded, p_groups_joined, p_session_duration
  )
  ON CONFLICT (user_id, metric_date)
  DO UPDATE SET
    page_views = user_engagement_metrics.page_views + EXCLUDED.page_views,
    messages_sent = user_engagement_metrics.messages_sent + EXCLUDED.messages_sent,
    files_uploaded = user_engagement_metrics.files_uploaded + EXCLUDED.files_uploaded,
    files_downloaded = user_engagement_metrics.files_downloaded + EXCLUDED.files_downloaded,
    groups_joined = user_engagement_metrics.groups_joined + EXCLUDED.groups_joined,
    session_duration_minutes = user_engagement_metrics.session_duration_minutes + EXCLUDED.session_duration_minutes,
    last_updated = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;