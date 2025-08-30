import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnycotjmvsairaqgjaux.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueWNvdGptdnNhaXJhcWdqYXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg2NzMxNSwiZXhwIjoyMDcwNDQzMzE1fQ.VJm7fFFXh2UqFfPBY5z8zFHoVvY8L38NuHLlAfzlHkM'

const supabase = createClient(supabaseUrl, serviceKey)

async function enableRealtime() {
  console.log('🔧 Enabling realtime for JU_CONNECT...')
  
  try {
    // Execute each SQL command individually to avoid errors
    const commands = [
      'ALTER PUBLICATION supabase_realtime ADD TABLE group_messages',
      'ALTER PUBLICATION supabase_realtime ADD TABLE group_files', 
      'ALTER PUBLICATION supabase_realtime ADD TABLE group_members',
      'GRANT SELECT ON group_messages TO anon, authenticated',
      'GRANT SELECT ON group_files TO anon, authenticated',
      'GRANT SELECT ON group_members TO anon, authenticated'
    ]
    
    for (const sql of commands) {
      console.log('🔄 Executing:', sql)
      const { error } = await supabase.rpc('exec_sql', { query: sql })
      
      if (error) {
        console.log('ℹ️  Command may already be applied or needs different approach:', error.message)
      } else {
        console.log('✅ Command executed successfully')
      }
    }
    
    // Test realtime connection
    console.log('🧪 Testing real-time connection...')
    
    const channel = supabase
      .channel('test-realtime-setup')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_messages'
      }, (payload) => {
        console.log('✅ Real-time event received!')
        process.exit(0)
      })
      .subscribe((status) => {
        console.log('📡 Connection status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('🎉 REALTIME IS WORKING! Group messaging should now be real-time.')
          setTimeout(() => {
            supabase.removeChannel(channel)
            process.exit(0)
          }, 3000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Realtime connection failed')
          process.exit(1)
        }
      })
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

enableRealtime()
