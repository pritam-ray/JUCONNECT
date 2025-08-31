-- Check and fix foreign key relationships for group_messages

-- First, let's check if we have any messages in the database
-- and see the current schema

-- Check if group_messages table exists and has the right structure
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- Check current schema of group_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_messages') THEN
    RAISE NOTICE 'group_messages table exists';
    
    -- List all columns
    FOR rec IN 
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'group_messages' 
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %', 
        rec.column_name, rec.data_type, rec.is_nullable, rec.column_default;
    END LOOP;
    
    -- Check foreign key constraints
    FOR rec IN
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'group_messages'
    LOOP
      RAISE NOTICE 'Foreign Key: % -> %.%', 
        rec.column_name, rec.foreign_table_name, rec.foreign_column_name;
    END LOOP;
    
  ELSE
    RAISE NOTICE 'group_messages table does not exist';
  END IF;
END $$;

-- Check if we have any test messages
DO $$
DECLARE
  message_count INTEGER;
  rec RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'group_messages') THEN
    SELECT COUNT(*) INTO message_count FROM group_messages;
    RAISE NOTICE 'Total messages in database: %', message_count;
    
    -- Show sample messages if any exist
    IF message_count > 0 THEN
      FOR rec IN 
        SELECT id, group_id, user_id, message, created_at
        FROM group_messages 
        ORDER BY created_at DESC 
        LIMIT 3
      LOOP
        RAISE NOTICE 'Message: ID=% | Group=% | User=% | Text=% | Date=%', 
          rec.id, rec.group_id, rec.user_id, rec.message, rec.created_at;
      END LOOP;
    END IF;
  END IF;
END $$;

-- Ensure the foreign key relationship exists for user_id -> profiles.id
DO $$
BEGIN
  -- Check if foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'group_messages_user_id_fkey' 
    AND table_name = 'group_messages'
  ) THEN
    -- Add the foreign key constraint if it doesn't exist
    ALTER TABLE group_messages 
    ADD CONSTRAINT group_messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    
    RAISE NOTICE 'Added foreign key constraint: group_messages.user_id -> profiles.id';
  ELSE
    RAISE NOTICE 'Foreign key constraint already exists: group_messages.user_id -> profiles.id';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error adding foreign key: %', SQLERRM;
END $$;
