-- BOLT SAFE VERSION - No complex functions or indexes
-- This should work in Bolt without any IMMUTABLE function errors

-- Simple function to delete old messages
CREATE OR REPLACE FUNCTION simple_cleanup()
RETURNS integer
LANGUAGE sql
AS $$
  DELETE FROM group_messages
  WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '14 days');
  SELECT 1;
$$;

-- Test query to see old messages
SELECT COUNT(*) FROM group_messages WHERE created_at < (CURRENT_TIMESTAMP - INTERVAL '14 days');
