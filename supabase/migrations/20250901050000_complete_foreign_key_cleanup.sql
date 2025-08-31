-- Comprehensive fix for foreign key relationship issues

-- First, let's see the current state of ALL foreign keys on group_messages
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Current Foreign Key Constraints on group_messages ===';
  
  FOR rec IN
    SELECT 
      tc.constraint_name,
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
    ORDER BY tc.constraint_name
  LOOP
    RAISE NOTICE 'Constraint: % | Column: % -> %.%', 
      rec.constraint_name, rec.column_name, rec.foreign_table_name, rec.foreign_column_name;
  END LOOP;
END $$;

-- Now let's completely clean up and rebuild the foreign key relationships
-- This is the most thorough approach

-- Drop ALL foreign key constraints on group_messages
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Dropping all existing foreign key constraints ===';
  
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc 
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'group_messages'
  LOOP
    EXECUTE FORMAT('ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS %I', rec.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', rec.constraint_name;
  END LOOP;
END $$;

-- Now recreate ONLY the necessary foreign key constraints with clear names
DO $$
BEGIN
  RAISE NOTICE '=== Recreating clean foreign key constraints ===';
  
  -- Foreign key for user_id -> profiles.id
  ALTER TABLE group_messages 
  ADD CONSTRAINT fk_group_messages_user_profile 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  RAISE NOTICE 'Created: fk_group_messages_user_profile (user_id -> profiles.id)';
  
  -- Foreign key for group_id -> class_groups.id  
  ALTER TABLE group_messages 
  ADD CONSTRAINT fk_group_messages_class_group 
  FOREIGN KEY (group_id) REFERENCES class_groups(id) ON DELETE CASCADE;
  RAISE NOTICE 'Created: fk_group_messages_class_group (group_id -> class_groups.id)';
  
  -- Foreign key for reply_to -> group_messages.id (self-reference for replies)
  ALTER TABLE group_messages 
  ADD CONSTRAINT fk_group_messages_reply_to 
  FOREIGN KEY (reply_to) REFERENCES group_messages(id) ON DELETE SET NULL;
  RAISE NOTICE 'Created: fk_group_messages_reply_to (reply_to -> group_messages.id)';
  
END $$;

-- Verify the final clean state
DO $$
DECLARE
  rec RECORD;
  constraint_count INTEGER;
BEGIN
  RAISE NOTICE '=== Final Foreign Key Constraints (should be exactly 3) ===';
  
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'group_messages';
    
  RAISE NOTICE 'Total foreign key constraints: %', constraint_count;
  
  FOR rec IN
    SELECT 
      tc.constraint_name,
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
    ORDER BY tc.constraint_name
  LOOP
    RAISE NOTICE '✅ %: % -> %.%', 
      rec.constraint_name, rec.column_name, rec.foreign_table_name, rec.foreign_column_name;
  END LOOP;
  
  IF constraint_count = 3 THEN
    RAISE NOTICE '🎉 Foreign key relationships successfully cleaned and rebuilt!';
  ELSE
    RAISE NOTICE '⚠️ Expected 3 constraints, got %', constraint_count;
  END IF;
END $$;
