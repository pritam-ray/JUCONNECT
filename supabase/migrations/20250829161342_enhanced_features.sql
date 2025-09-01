/*
  # Enhanced Features Migration for JU_CONNECT
  
  This migration includes:
  1. User activity tracking
  2. Enhanced error logging
  3. Performance optimization indexes
  4. Real-time subscriptions cleanup
  5. File upload tracking with 5MB limit enforcement
  6. Session management improvements
  7. User engagement metrics
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- User Activity Tracking
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'login', 'logout', 'upload', 'download', 'message', 
        'group_join', 'group_leave', 'profile_update', 'error'
    )),
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for user_activity_logs
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON user_activity_logs(created_at);

-- Error Logging Table
CREATE TABLE IF NOT EXISTS error_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    error_type TEXT NOT NULL CHECK (error_type IN (
        'authentication', 'database', 'file_upload', 'network', 
        'infinite_recursion', 'memory_leak', 'unknown'
    )),
    error_message TEXT NOT NULL,
    error_stack TEXT,
    context JSONB DEFAULT '{}',
    severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for error_logs
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

-- File Upload Tracking with 5MB Enforcement
CREATE TABLE IF NOT EXISTS file_upload_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size <= 5242880), -- 5MB limit
    file_type TEXT NOT NULL,
    upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN (
        'pending', 'uploading', 'completed', 'failed', 'cancelled'
    )),
    upload_progress INTEGER DEFAULT 0 CHECK (upload_progress >= 0 AND upload_progress <= 100),
    error_message TEXT,
    storage_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for file_upload_sessions
CREATE INDEX IF NOT EXISTS idx_file_upload_user_id ON file_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_upload_status ON file_upload_sessions(upload_status);
CREATE INDEX IF NOT EXISTS idx_file_upload_created_at ON file_upload_sessions(created_at);

-- Real-time Connection Management
CREATE TABLE IF NOT EXISTS realtime_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    connection_id TEXT UNIQUE NOT NULL,
    channel_name TEXT NOT NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    status TEXT DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'reconnecting'))
);

-- Create indexes for realtime_connections
CREATE INDEX IF NOT EXISTS idx_realtime_user_id ON realtime_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_connection_id ON realtime_connections(connection_id);
CREATE INDEX IF NOT EXISTS idx_realtime_status ON realtime_connections(status);

-- User Engagement Metrics
CREATE TABLE IF NOT EXISTS user_engagement_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_date DATE DEFAULT CURRENT_DATE,
    page_views INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    files_uploaded INTEGER DEFAULT 0,
    files_downloaded INTEGER DEFAULT 0,
    groups_joined INTEGER DEFAULT 0,
    session_duration_minutes INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    UNIQUE(user_id, metric_date)
);

-- Create indexes for user_engagement_metrics
CREATE INDEX IF NOT EXISTS idx_engagement_user_id ON user_engagement_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_date ON user_engagement_metrics(metric_date);

-- Performance optimization indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_content_category_id ON content(category_id);
CREATE INDEX IF NOT EXISTS idx_content_created_at ON content(created_at);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_created_at ON group_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);

-- Functions for activity logging
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_data JSONB DEFAULT '{}',
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    activity_id UUID;
BEGIN
    INSERT INTO user_activity_logs (
        user_id, activity_type, activity_data, ip_address, user_agent
    ) VALUES (
        p_user_id, p_activity_type, p_activity_data, p_ip_address, p_user_agent
    ) RETURNING id INTO activity_id;
    
    RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for error logging
CREATE OR REPLACE FUNCTION log_error(
    p_user_id UUID DEFAULT NULL,
    p_error_type TEXT DEFAULT 'unknown',
    p_error_message TEXT DEFAULT '',
    p_error_stack TEXT DEFAULT NULL,
    p_context JSONB DEFAULT '{}',
    p_severity TEXT DEFAULT 'error'
) RETURNS UUID AS $$
DECLARE
    error_id UUID;
BEGIN
    INSERT INTO error_logs (
        user_id, error_type, error_message, error_stack, context, severity
    ) VALUES (
        p_user_id, p_error_type, p_error_message, p_error_stack, p_context, p_severity
    ) RETURNING id INTO error_id;
    
    RETURN error_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user engagement metrics
CREATE OR REPLACE FUNCTION update_user_engagement(
    p_user_id UUID,
    p_page_views INTEGER DEFAULT 0,
    p_messages_sent INTEGER DEFAULT 0,
    p_files_uploaded INTEGER DEFAULT 0,
    p_files_downloaded INTEGER DEFAULT 0,
    p_groups_joined INTEGER DEFAULT 0,
    p_session_duration INTEGER DEFAULT 0
) RETURNS VOID AS $$
BEGIN
    INSERT INTO user_engagement_metrics (
        user_id, metric_date, page_views, messages_sent, files_uploaded,
        files_downloaded, groups_joined, session_duration_minutes
    ) VALUES (
        p_user_id, CURRENT_DATE, p_page_views, p_messages_sent, p_files_uploaded,
        p_files_downloaded, p_groups_joined, p_session_duration
    ) ON CONFLICT (user_id, metric_date) DO UPDATE SET
        page_views = user_engagement_metrics.page_views + p_page_views,
        messages_sent = user_engagement_metrics.messages_sent + p_messages_sent,
        files_uploaded = user_engagement_metrics.files_uploaded + p_files_uploaded,
        files_downloaded = user_engagement_metrics.files_downloaded + p_files_downloaded,
        groups_joined = user_engagement_metrics.groups_joined + p_groups_joined,
        session_duration_minutes = user_engagement_metrics.session_duration_minutes + p_session_duration,
        last_updated = TIMEZONE('utc'::text, NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function for old logs (to prevent infinite growth)
CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS VOID AS $$
BEGIN
    -- Delete activity logs older than 6 months
    DELETE FROM user_activity_logs 
    WHERE created_at < TIMEZONE('utc'::text, NOW()) - INTERVAL '6 months';
    
    -- Delete resolved error logs older than 3 months
    DELETE FROM error_logs 
    WHERE resolved = TRUE AND created_at < TIMEZONE('utc'::text, NOW()) - INTERVAL '3 months';
    
    -- Delete disconnected realtime connections older than 1 hour
    DELETE FROM realtime_connections 
    WHERE status = 'disconnected' AND last_activity < TIMEZONE('utc'::text, NOW()) - INTERVAL '1 hour';
    
    -- Delete completed upload sessions older than 1 month
    DELETE FROM file_upload_sessions 
    WHERE upload_status = 'completed' AND completed_at < TIMEZONE('utc'::text, NOW()) - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for new tables
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realtime_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_engagement_metrics ENABLE ROW LEVEL SECURITY;

-- User Activity Logs Policies
CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity logs" ON user_activity_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Error Logs Policies (admin access for monitoring)
CREATE POLICY "Users can view their own error logs" ON error_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Anyone can insert error logs" ON error_logs
    FOR INSERT WITH CHECK (true);

-- File Upload Sessions Policies
CREATE POLICY "Users can manage their own upload sessions" ON file_upload_sessions
    FOR ALL USING (user_id = auth.uid());

-- Realtime Connections Policies
CREATE POLICY "Users can manage their own connections" ON realtime_connections
    FOR ALL USING (user_id = auth.uid());

-- User Engagement Metrics Policies
CREATE POLICY "Users can view their own metrics" ON user_engagement_metrics
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own metrics" ON user_engagement_metrics
    FOR ALL USING (user_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
