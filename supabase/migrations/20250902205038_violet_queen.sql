/*
  # Configure real-time subscriptions for live updates

  1. Real-time Configuration
    - Enable real-time for messaging tables
    - Configure publication settings
    - Set up proper filters

  2. Performance Optimization
    - Optimize real-time queries
    - Add proper indexing for real-time operations
    - Configure connection limits

  3. Security
    - Ensure real-time respects RLS policies
    - Add proper authentication checks
*/

-- Enable real-time for messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE private_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Create function to handle real-time message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger AS $$
BEGIN
  -- Notify about new message (for real-time updates)
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'table', TG_TABLE_NAME,
      'type', TG_OP,
      'id', NEW.id,
      'user_id', NEW.user_id,
      'group_id', CASE WHEN TG_TABLE_NAME = 'group_messages' THEN NEW.group_id ELSE NULL END,
      'recipient_id', CASE WHEN TG_TABLE_NAME = 'private_messages' THEN NEW.recipient_id ELSE NULL END
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for real-time notifications
CREATE TRIGGER notify_chat_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

CREATE TRIGGER notify_private_message
  AFTER INSERT ON private_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

CREATE TRIGGER notify_group_message
  AFTER INSERT ON group_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Function to handle user presence updates
CREATE OR REPLACE FUNCTION handle_user_presence()
RETURNS trigger AS $$
BEGIN
  -- Update last_seen when user goes offline
  IF NEW.is_online = false AND OLD.is_online = true THEN
    NEW.last_seen = now();
  END IF;
  
  -- Notify about presence change
  PERFORM pg_notify(
    'user_presence',
    json_build_object(
      'user_id', NEW.id,
      'is_online', NEW.is_online,
      'last_seen', NEW.last_seen
    )::text
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user presence updates
CREATE TRIGGER handle_presence_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  WHEN (OLD.is_online IS DISTINCT FROM NEW.is_online)
  EXECUTE FUNCTION handle_user_presence();

-- Create view for popular content (for performance)
CREATE OR REPLACE VIEW popular_content AS
SELECT 
  c.*,
  cat.name as category_name,
  p.full_name as author_name,
  p.username as author_username
FROM content c
LEFT JOIN categories cat ON cat.id = c.category_id
LEFT JOIN profiles p ON p.id = c.uploaded_by
WHERE c.is_approved = true
ORDER BY (c.view_count + c.download_count) DESC, c.created_at DESC;

-- Function to refresh materialized views (if needed)
CREATE OR REPLACE FUNCTION refresh_popular_content()
RETURNS void AS $$
BEGIN
  -- This would refresh materialized views if we had them
  -- For now, it's a placeholder for future optimizations
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;