/*
  # Update schema to store everything in database

  1. Schema Changes
    - Add `file_data` column to content table for storing base64 encoded files
    - Remove dependency on external storage
    - Update file_uploads table to store file data directly
    - Ensure all content is stored in database

  2. Security
    - Maintain existing RLS policies
    - Add size limits through application logic
*/

-- Add file_data column to content table for storing base64 encoded files
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'file_data'
  ) THEN
    ALTER TABLE content ADD COLUMN file_data text;
  END IF;
END $$;

-- Add file_data column to file_uploads table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_uploads' AND column_name = 'file_data'
  ) THEN
    ALTER TABLE file_uploads ADD COLUMN file_data text;
  END IF;
END $$;

-- Update content table to make file_url optional since we're storing data directly
DO $$
BEGIN
  -- No need to modify file_url column, it can remain for backward compatibility
  NULL;
END $$;

-- Add index for better performance on file searches
CREATE INDEX IF NOT EXISTS idx_content_file_data ON content USING btree (file_data) WHERE file_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_file_uploads_file_data ON file_uploads USING btree (file_data) WHERE file_data IS NOT NULL;