-- Seed data for JU CONNECTS
-- This file contains initial data for development and testing

-- Create a sample admin user (only for development)
-- Note: In production, admin users should be created through proper channels

-- Insert sample data only if tables are empty
DO $$
BEGIN
  -- Setup sample groups if none exist
  PERFORM setup_sample_groups();
  
  -- Setup sample content if none exists
  PERFORM setup_sample_content();
  
  -- Setup sample educational links
  PERFORM setup_sample_links();
  
  -- Post welcome message
  PERFORM post_welcome_message();
  
  RAISE NOTICE 'Sample data setup completed successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample data setup failed: %', SQLERRM;
END $$;