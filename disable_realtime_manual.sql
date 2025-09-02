-- Safe script to disable realtime - run this in Supabase SQL Editor
-- This will stop WebSocket connections and console errors
-- Note: Some commands may show "table not in publication" errors - this is normal and safe

-- 1. First, check what tables are currently in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 2. Remove all tables from realtime publication
-- (Ignore any "table not in publication" errors)

DO $$
BEGIN
    -- Remove common tables from realtime publication
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.profiles;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'profiles not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.chat_messages;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'chat_messages not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.group_messages;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'group_messages not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.private_messages;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'private_messages not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.class_groups;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'class_groups not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.group_members;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'group_members not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.content;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'content not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.update_requests;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'update_requests not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.file_uploads;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'file_uploads not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE public.group_files;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'group_files not in publication (this is fine)';
    END;
    
    BEGIN
        ALTER publication supabase_realtime DROP TABLE auth.users;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'auth.users not in publication (this is fine)';
    END;
END $$;

-- 3. Verify that no tables remain in the publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- 4. Comment to confirm changes
COMMENT ON SCHEMA public IS 'Realtime disabled for production - prevents WebSocket console errors';
