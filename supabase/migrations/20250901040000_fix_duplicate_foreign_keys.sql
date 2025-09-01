-- Fix duplicate foreign key constraints

-- First, let's see what constraints exist
DO $$
DECLARE
  rec RECORD;
  constraint_count INTEGER;
BEGIN
  -- Count how many foreign key constraints exist for user_id -> profiles.id
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'group_messages'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'profiles'
    AND ccu.column_name = 'id';
    
  RAISE NOTICE 'Found % foreign key constraints for group_messages.user_id -> profiles.id', constraint_count;
  
  -- List all the constraints
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'group_messages'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
  LOOP
    RAISE NOTICE 'Found constraint: %', rec.constraint_name;
  END LOOP;
END $$;

-- Remove duplicate constraints if they exist
DO $$
DECLARE
  rec RECORD;
  first_constraint TEXT := NULL;
BEGIN
  -- Find all user_id -> profiles.id constraints
  FOR rec IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND tc.table_name = 'group_messages'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'profiles'
      AND ccu.column_name = 'id'
    ORDER BY tc.constraint_name
  LOOP
    IF first_constraint IS NULL THEN
      -- Keep the first one
      first_constraint := rec.constraint_name;
      RAISE NOTICE 'Keeping constraint: %', rec.constraint_name;
    ELSE
      -- Drop the duplicate
      EXECUTE FORMAT('ALTER TABLE group_messages DROP CONSTRAINT %I', rec.constraint_name);
      RAISE NOTICE 'Dropped duplicate constraint: %', rec.constraint_name;
    END IF;
  END LOOP;
  
  -- Ensure we have exactly one constraint
  IF first_constraint IS NULL THEN
    -- No constraint exists, create one
    ALTER TABLE group_messages 
    ADD CONSTRAINT group_messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Created new foreign key constraint: group_messages_user_id_fkey';
  END IF;
END $$;

-- Verify the final state
DO $$
DECLARE
  constraint_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO constraint_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'group_messages'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'profiles'
    AND ccu.column_name = 'id';
    
  RAISE NOTICE 'Final count of user_id foreign key constraints: %', constraint_count;
  
  IF constraint_count = 1 THEN
    RAISE NOTICE '✅ Foreign key relationship fixed successfully';
  ELSE
    RAISE NOTICE '❌ Still have % constraints, expected 1', constraint_count;
  END IF;
END $$;
