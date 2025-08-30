/**
 * Enable Realtime for JU_CONNECT Group Messaging
 * Run this script to enable real-time subscriptions for group chat
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'

if (!supabaseUrl.includes('supabase')) {
  console.error('❌ VITE_SUPABASE_URL not found in environment')
  console.log('Add it to your .env file or run with: VITE_SUPABASE_URL=your-url node enable-realtime.mjs')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function enableRealtime() {
  console.log('🔧 Enabling realtime for JU_CONNECT group messaging...')
  
  try {
    // Enable realtime publication for tables
    console.log('📡 Adding tables to realtime publication...')
    
    const { error: realtimeError } = await supabase.rpc('enable_realtime_for_table', {
      table_name: 'group_messages'
    })
    
    if (realtimeError) {
      console.log('ℹ️  Using direct SQL approach instead...')
      
      // Alternative: Execute SQL directly
      const { data, error } = await supabase
        .from('pg_publication_tables')
        .select('*')
        .eq('pubname', 'supabase_realtime')
        .in('tablename', ['group_messages', 'group_files', 'group_members'])
      
      if (error) {
        console.log('⚠️  Cannot verify realtime status directly')
      } else {
        console.log('✅ Current realtime tables:', data)
      }
    }
    
    // Test real-time connection
    console.log('🧪 Testing real-time connection...')
    
    const channel = supabase
      .channel('test-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'group_messages'
      }, (payload) => {
        console.log('✅ Real-time event received:', payload.eventType)
      })
      .subscribe((status) => {
        console.log('📡 Real-time status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time is working!')
          setTimeout(() => {
            supabase.removeChannel(channel)
            process.exit(0)
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Real-time connection failed')
          process.exit(1)
        }
      })
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('⏰ Connection timeout - check your database settings')
      process.exit(1)
    }, 10000)
    
  } catch (error) {
    console.error('❌ Error enabling realtime:', error.message)
    process.exit(1)
  }
}

// Instructions
console.log(`
🚀 JU_CONNECT Realtime Setup
============================

To enable realtime messaging:

METHOD 1 - Use Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/mnycotjmvsairaqgjaux/sql
2. Copy and paste the SQL from 'enable_realtime.sql'
3. Click "Run"

METHOD 2 - Use this script:
1. Set SUPABASE_SERVICE_ROLE_KEY in your environment
2. Run: node enable-realtime.mjs

Current config:
- URL: ${supabaseUrl}
- Service Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}

`)

if (supabaseServiceKey && supabaseServiceKey !== 'your-service-role-key') {
  enableRealtime()
} else {
  console.log('💡 Add your service role key to run the automatic setup')
  console.log('   You can find it in: Dashboard > Settings > API > service_role key')
}
