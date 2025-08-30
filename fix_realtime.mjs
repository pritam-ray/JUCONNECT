import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mnycotjmvsairaqgjaux.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ueWNvdGptdnNhaXJhcWdqYXV4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDg2NzMxNSwiZXhwIjoyMDcwNDQzMzE1fQ.VJm7fFFXh2UqFfPBY5z8zFHoVvY8L38NuHLlAfzlHkM'

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false
  }
})

async function fixRealtime() {
  console.log('🔧 Applying realtime fix for JU_CONNECT...')
  
  try {
    // Test direct database access
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['group_messages', 'group_files', 'group_members'])
    
    if (tablesError) {
      console.error('❌ Cannot access database:', tablesError.message)
      return
    }
    
    console.log('✅ Database tables found:', tables.map(t => t.table_name))
    
    // Try to insert a test message to trigger realtime
    console.log('🧪 Testing message insertion...')
    
    const { data: testUser } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .single()
    
    const { data: testGroup } = await supabase
      .from('class_groups')
      .select('id')
      .limit(1)
      .single()
    
    if (testUser && testGroup) {
      const { data, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: testGroup.id,
          user_id: testUser.id,
          message: `Realtime test ${Date.now()}`,
          message_type: 'text'
        })
        .select()
      
      if (error) {
        console.error('❌ Cannot insert test message:', error.message)
      } else {
        console.log('✅ Test message inserted:', data)
      }
    }
    
    // Test realtime subscription
    console.log('🔌 Testing realtime subscription...')
    
    const channel = supabase
      .channel('realtime-test')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages'
      }, (payload) => {
        console.log('🎉 REALTIME WORKING! Received:', payload.new.message)
        process.exit(0)
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active!')
          
          // Insert another test message after subscription
          setTimeout(async () => {
            if (testUser && testGroup) {
              console.log('📤 Sending test message via realtime...')
              await supabase
                .from('group_messages')
                .insert({
                  group_id: testGroup.id,
                  user_id: testUser.id,
                  message: `Realtime verification ${Date.now()}`,
                  message_type: 'text'
                })
            }
          }, 1000)
          
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Realtime subscription failed')
          console.log('🔧 This means realtime is not properly configured')
        }
      })
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Test timeout - realtime may not be working')
      console.log('📋 Please run the SQL script in Supabase Dashboard manually')
      process.exit(1)
    }, 10000)
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

fixRealtime()
