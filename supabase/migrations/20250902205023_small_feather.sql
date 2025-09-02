/*
  # Create storage buckets and policies

  1. Storage Buckets
    - `files` - General file storage
    - `avatars` - User profile pictures
    - `group-files` - Group-specific file sharing

  2. Security Policies
    - File access control based on user authentication
    - Group file access for members only
    - Public avatar access

  3. Configuration
    - File size limits (5MB)
    - Allowed file types
    - Automatic cleanup policies
*/

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  (
    'files',
    'files',
    true,
    5242880, -- 5MB limit
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  ),
  (
    'avatars',
    'avatars',
    true,
    1048576, -- 1MB limit for avatars
    ARRAY[
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  ),
  (
    'group-files',
    'group-files',
    false, -- Private bucket for group files
    5242880, -- 5MB limit
    ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
  )
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'files' bucket
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'files');

CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for 'avatars' bucket
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can update their own avatars"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for 'group-files' bucket
CREATE POLICY "Group members can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'group-files' AND
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id::text = (storage.foldername(name))[1]
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
    )
  );

CREATE POLICY "Group members can view group files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'group-files' AND
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id::text = (storage.foldername(name))[1]
        AND gm.user_id = auth.uid()
        AND gm.is_active = true
    )
  );

CREATE POLICY "File uploaders can delete their files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'group-files' AND
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Function to clean up old files (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void AS $$
BEGIN
  -- Delete group files older than 3 months
  DELETE FROM storage.objects
  WHERE bucket_id = 'group-files'
    AND created_at < now() - interval '3 months';
  
  -- Delete orphaned file uploads
  DELETE FROM file_uploads
  WHERE created_at < now() - interval '1 month'
    AND content_id IS NULL
    AND group_id IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;