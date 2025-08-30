import pg from 'pg'
const { Client } = pg

const connectionString = 'postgresql://postgres:23022003@pP@db.mnycotjmvsairaqgjaux.supabase.co:5432/postgres'

async function enableRealtimeDirectly() {
  const client = new Client({
    connectionString
  })

  try {
    console.log('🔌 Connecting to database...')
    await client.connect()
    console.log('✅ Connected to PostgreSQL')

    // Enable realtime for tables
    const commands = [
      `ALTER PUBLICATION supabase_realtime ADD TABLE group_messages;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE group_files;`,
      `ALTER PUBLICATION supabase_realtime ADD TABLE group_members;`,
      `GRANT SELECT ON group_messages TO anon, authenticated;`,
      `GRANT SELECT ON group_files TO anon, authenticated;`,
      `GRANT SELECT ON group_members TO anon, authenticated;`
    ]

    for (const sql of commands) {
      try {
        console.log('🔄 Executing:', sql)
        await client.query(sql)
        console.log('✅ Success')
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate')) {
          console.log('ℹ️  Already configured')
        } else {
          console.log('⚠️  Error:', error.message)
        }
      }
    }

    // Verify realtime publication
    console.log('\n📋 Checking realtime publication...')
    const result = await client.query(`
      SELECT tablename 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename IN ('group_messages', 'group_files', 'group_members')
    `)
    
    console.log('📡 Tables in realtime publication:', result.rows.map(r => r.tablename))
    
    if (result.rows.length === 3) {
      console.log('🎉 REALTIME IS NOW ENABLED FOR ALL TABLES!')
    } else {
      console.log('⚠️  Some tables may not be in realtime publication')
    }

  } catch (error) {
    console.error('❌ Database error:', error.message)
  } finally {
    await client.end()
    console.log('🔌 Database connection closed')
  }
}

enableRealtimeDirectly()
