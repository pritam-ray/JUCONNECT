import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('🧹 Starting automatic cleanup of group data older than 2 weeks...')

    // Calculate 2 weeks ago
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    console.log(`Cutoff date: ${twoWeeksAgo.toISOString()}`)

    // Get all messages older than 2 weeks
    const { data: oldMessages, error: fetchError } = await supabase
      .from('group_messages')
      .select('id, message_type, file_url')
      .lt('created_at', twoWeeksAgo.toISOString())

    if (fetchError) {
      console.error('Error fetching old messages:', fetchError)
      throw fetchError
    }

    if (!oldMessages || oldMessages.length === 0) {
      console.log('✅ No old messages to clean up')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No old messages found',
          deletedMessages: 0,
          deletedFiles: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    console.log(`🗑️ Found ${oldMessages.length} messages to delete`)

    // Count file messages and prepare file paths for deletion
    const fileMessages = oldMessages.filter(msg => msg.message_type === 'file' && msg.file_url)
    console.log(`📁 Found ${fileMessages.length} files to delete from storage`)

    // Delete files from storage if any exist
    let deletedFilesCount = 0
    if (fileMessages.length > 0) {
      for (const fileMsg of fileMessages) {
        try {
          // Extract the file path from the URL
          const url = new URL(fileMsg.file_url)
          const pathParts = url.pathname.split('/')
          const bucketIndex = pathParts.indexOf('files')
          if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
            const filePath = pathParts.slice(bucketIndex + 1).join('/')
            
            const { error: storageError } = await supabase.storage
              .from('files')
              .remove([filePath])
            
            if (storageError) {
              console.warn(`Failed to delete file ${filePath}:`, storageError)
            } else {
              deletedFilesCount++
              console.log(`✅ Deleted file: ${filePath}`)
            }
          }
        } catch (error) {
          console.warn(`Failed to process file URL ${fileMsg.file_url}:`, error)
        }
      }
    }

    // Delete all message records
    const messageIds = oldMessages.map(msg => msg.id)
    const { error: deleteError } = await supabase
      .from('group_messages')
      .delete()
      .in('id', messageIds)

    if (deleteError) {
      console.error('Error deleting old messages:', deleteError)
      throw deleteError
    }

    // Log the cleanup operation
    await supabase
      .from('cleanup_logs')
      .insert({
        operation_type: 'automatic_cleanup',
        deleted_count: oldMessages.length,
        details: {
          deleted_messages: oldMessages.length,
          deleted_files: deletedFilesCount,
          cutoff_date: twoWeeksAgo.toISOString(),
          cleanup_date: new Date().toISOString()
        }
      })

    console.log(`✅ Cleanup completed: ${oldMessages.length} messages deleted (${deletedFilesCount} files)`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cleanup completed successfully',
        deletedMessages: oldMessages.length,
        deletedFiles: deletedFilesCount,
        cutoffDate: twoWeeksAgo.toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred during cleanup',
        deletedMessages: 0,
        deletedFiles: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
