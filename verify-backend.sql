-- Quick verification query for JU CONNECTS backend
-- Run this in Supabase SQL Editor to verify everything is working

-- Check if all tables exist
SELECT schemaname, tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Check categories
SELECT name, slug, icon, color FROM categories ORDER BY sort_order;

-- Check if sample functions exist
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN (
    'setup_sample_groups', 
    'setup_sample_content', 
    'setup_sample_links',
    'post_welcome_message',
    'make_user_admin',
    'approve_content'
);

-- Verify storage buckets
SELECT name, public, file_size_limit 
FROM storage.buckets 
ORDER BY name;
