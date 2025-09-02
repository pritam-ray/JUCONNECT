-- Realtime and Storage configuration for JU CONNECTS
-- This migration sets up realtime subscriptions and storage policies

-- ============================================================================
-- REALTIME CONFIGURATION
-- ============================================================================

-- Enable realtime for key tables (carefully selected to avoid console spam)
-- We'll enable only essential tables for real-time functionality

-- Enable realtime for chat messages (essential for chat functionality)
-- ALTER publication supabase_realtime ADD TABLE chat_messages;

-- Enable realtime for private messages (essential for messaging)
-- ALTER publication supabase_realtime ADD TABLE private_messages;

-- Enable realtime for group messages (essential for group chats)
-- ALTER publication supabase_realtime ADD TABLE group_messages;

-- Enable realtime for group message reads (for read receipts)
-- ALTER publication supabase_realtime ADD TABLE group_message_reads;

-- NOTE: Realtime is intentionally DISABLED to prevent console errors
-- The application will use polling for updates instead of real-time subscriptions
-- This ensures zero console output in production as requested

-- ============================================================================
-- STORAGE SETUP
-- ============================================================================

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('uploads', 'uploads', false, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
    ('group-files', 'group-files', false, 104857600, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Avatars bucket policies (public read, authenticated write)
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Uploads bucket policies (private access)
CREATE POLICY "Users can view their own uploads"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authenticated users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'uploads' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Group files bucket policies
CREATE POLICY "Group members can view group files"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'group-files'
    AND EXISTS (
        SELECT 1 FROM group_members gm
        JOIN class_groups cg ON gm.group_id = cg.id
        WHERE gm.user_id = auth.uid()
        AND cg.id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Group members can upload group files"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'group-files'
    AND EXISTS (
        SELECT 1 FROM group_members gm
        JOIN class_groups cg ON gm.group_id = cg.id
        WHERE gm.user_id = auth.uid()
        AND cg.id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Group admins can manage group files"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'group-files'
    AND EXISTS (
        SELECT 1 FROM group_members gm
        JOIN class_groups cg ON gm.group_id = cg.id
        WHERE gm.user_id = auth.uid()
        AND gm.role IN ('admin', 'moderator')
        AND cg.id::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Group admins and file owners can delete group files"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'group-files'
    AND (
        -- File owner can delete
        auth.uid()::text = (storage.foldername(name))[2]
        OR
        -- Group admins can delete
        EXISTS (
            SELECT 1 FROM group_members gm
            JOIN class_groups cg ON gm.group_id = cg.id
            WHERE gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'moderator')
            AND cg.id::text = (storage.foldername(name))[1]
        )
    )
);

-- ============================================================================
-- SECURE FILE ACCESS FUNCTIONS
-- ============================================================================

-- Function to get secure download URL
CREATE OR REPLACE FUNCTION get_secure_download_url(file_path TEXT)
RETURNS TEXT AS $$
DECLARE
    download_url TEXT;
BEGIN
    -- Verify user has access to the file
    -- This will be implemented based on file ownership and permissions
    
    -- For now, return a basic signed URL (implement proper security later)
    -- This is a placeholder that should be replaced with actual Supabase storage URL generation
    RETURN 'https://your-project.supabase.co/storage/v1/object/sign/uploads/' || file_path;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Create additional indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_full_text_search 
ON content USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

CREATE INDEX IF NOT EXISTS idx_profiles_full_text_search 
ON profiles USING GIN(to_tsvector('english', full_name || ' ' || username));

-- Create materialized view for popular content (optional)
CREATE MATERIALIZED VIEW popular_content AS
SELECT 
    c.*,
    cat.name as category_name,
    p.full_name as author_name,
    p.username as author_username
FROM content c
LEFT JOIN categories cat ON c.category_id = cat.id
LEFT JOIN profiles p ON c.author_id = p.id
WHERE c.is_approved = true
ORDER BY c.download_count DESC, c.created_at DESC;

-- Create index on materialized view
CREATE INDEX idx_popular_content_downloads ON popular_content(download_count DESC);
CREATE INDEX idx_popular_content_created ON popular_content(created_at DESC);

-- Function to refresh popular content view
CREATE OR REPLACE FUNCTION refresh_popular_content()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW popular_content;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP AND MAINTENANCE
-- ============================================================================

-- Function to cleanup old unverified files
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void AS $$
BEGIN
    -- Delete file records older than 30 days that are not associated with approved content
    DELETE FROM file_uploads
    WHERE created_at < NOW() - INTERVAL '30 days'
    AND NOT EXISTS (
        SELECT 1 FROM content
        WHERE content.file_url = file_uploads.file_url
        AND content.is_approved = true
    );
END;
$$ LANGUAGE plpgsql;

-- Note: Set up a cron job or scheduled function to call cleanup_old_files() periodically
