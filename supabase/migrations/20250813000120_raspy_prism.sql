/*
  # Update schema for hybrid storage system

  1. Schema Changes
    - Remove file_data columns from content and file_uploads tables
    - Add "other" to content_type enum
    - Make year and semester optional (already nullable)
    - Keep file_url for Supabase storage URLs

  2. Storage
    - Files stored in Supabase storage buckets
    - Chat messages, links, and metadata in database
    - File URLs reference Supabase storage objects
*/

-- Add "other" to content_type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'other' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'content_type')
  ) THEN
    ALTER TYPE content_type ADD VALUE 'other';
  END IF;
END $$;

-- Remove file_data columns if they exist (cleanup from previous migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'file_data'
  ) THEN
    ALTER TABLE content DROP COLUMN file_data;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'file_uploads' AND column_name = 'file_data'
  ) THEN
    ALTER TABLE file_uploads DROP COLUMN file_data;
  END IF;
END $$;

-- Drop indexes on file_data columns if they exist
DROP INDEX IF EXISTS idx_content_file_data;
DROP INDEX IF EXISTS idx_file_uploads_file_data;

-- Ensure file_url column exists and is properly configured
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'content' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE content ADD COLUMN file_url text;
  END IF;
END $$;

-- Add comment about storage strategy
COMMENT ON COLUMN content.file_url IS 'URL to file stored in Supabase storage bucket';
COMMENT ON COLUMN content.external_url IS 'External URL for educational links';
COMMENT ON COLUMN content.year IS 'Academic year (optional)';
COMMENT ON COLUMN content.semester IS 'Semester number (optional)';