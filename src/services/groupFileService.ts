import { supabase } from '../lib/supabase'
import { uploadFile } from './fileUploadService'

interface GroupFileUpload {
  file: File
  groupId: string
  userId: string
}

interface GroupFileRecord {
  id: string
  group_id: string
  user_id: string
  file_url: string
  file_name: string
  file_size: number
  message_type: 'file'
  created_at: string
}

/**
 * Upload a file to group chat with automatic 2-week expiration
 */
export const uploadGroupFile = async ({ 
  file, 
  groupId, 
  userId 
}: GroupFileUpload): Promise<GroupFileRecord> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    console.log('📁 Uploading file to group:', groupId, 'File:', file.name)
    
    // Upload file to Supabase storage in group-specific folder
    const folder = `group-files/${groupId}`
    const { fileUrl } = await uploadFile(file, userId, folder)
    
    console.log('✅ File uploaded to storage:', fileUrl)
    
    // Create group message with file data
    const messageData = {
      group_id: groupId,
      user_id: userId,
      message: `📎 ${file.name}`,
      message_type: 'file' as const,
      file_url: fileUrl,
      file_name: file.name,
      file_size: file.size
    }
    
    const { data: messageRecord, error: messageError } = await supabase
      .from('group_messages')
      .insert([messageData])
      .select(`
        *,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .single()
    
    if (messageError) {
      console.error('❌ Failed to create group message:', messageError)
      throw new Error(`Failed to send file: ${messageError.message}`)
    }
    
    console.log('✅ Group file message created:', messageRecord.id)
    
    return {
      id: messageRecord.id,
      group_id: messageRecord.group_id,
      user_id: messageRecord.user_id,
      file_url: messageRecord.file_url,
      file_name: messageRecord.file_name,
      file_size: messageRecord.file_size,
      message_type: 'file',
      created_at: messageRecord.created_at
    }
    
  } catch (error: any) {
    console.error('❌ Error uploading group file:', error)
    throw new Error(`Failed to upload file: ${error.message || 'Unknown error'}`)
  }
}

/**
 * Get all files shared in a group
 */
export const getGroupFiles = async (groupId: string): Promise<GroupFileRecord[]> => {
  if (!supabase || !groupId) return []
  
  try {
    const { data, error } = await supabase
      .from('group_messages')
      .select(`
        id,
        group_id,
        user_id,
        file_url,
        file_name,
        file_size,
        message_type,
        created_at,
        profiles (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .eq('message_type', 'file')
      .not('file_url', 'is', null)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching group files:', error)
      return []
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getGroupFiles:', error)
    return []
  }
}

/**
 * Delete a file from group chat (removes from storage and database)
 */
export const deleteGroupFile = async (messageId: string, userId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    // Get the message to verify ownership and get file URL
    const { data: message, error: fetchError } = await supabase
      .from('group_messages')
      .select('user_id, file_url')
      .eq('id', messageId)
      .eq('message_type', 'file')
      .single()
    
    if (fetchError || !message) {
      throw new Error('File message not found')
    }
    
    // Verify user owns the file or is admin (you can enhance this with admin check)
    if (message.user_id !== userId) {
      throw new Error('You can only delete your own files')
    }
    
    // Delete from storage if file URL exists
    if (message.file_url) {
      const filePath = message.file_url.split('/').slice(-2).join('/') // Get relative path
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove([filePath])
      
      if (storageError) {
        console.warn('Failed to delete file from storage:', storageError)
      }
    }
    
    // Delete message record
    const { error: deleteError } = await supabase
      .from('group_messages')
      .delete()
      .eq('id', messageId)
    
    if (deleteError) {
      throw new Error(`Failed to delete file message: ${deleteError.message}`)
    }
    
    console.log('✅ File deleted successfully:', messageId)
    
  } catch (error: any) {
    console.error('❌ Error deleting group file:', error)
    throw error
  }
}

/**
 * Clean up files older than 2 weeks (for scheduled cleanup)
 */
export const cleanupOldGroupFiles = async (): Promise<{ deletedCount: number }> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    console.log('🧹 Starting cleanup of files older than 2 weeks...')
    
    // Calculate 2 weeks ago
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    // Get all file messages older than 2 weeks
    const { data: oldFileMessages, error: fetchError } = await supabase
      .from('group_messages')
      .select('id, file_url')
      .eq('message_type', 'file')
      .lt('created_at', twoWeeksAgo.toISOString())
      .not('file_url', 'is', null)
    
    if (fetchError) {
      console.error('Error fetching old files:', fetchError)
      return { deletedCount: 0 }
    }
    
    if (!oldFileMessages || oldFileMessages.length === 0) {
      console.log('✅ No old files to clean up')
      return { deletedCount: 0 }
    }
    
    console.log(`🗑️ Found ${oldFileMessages.length} files to delete`)
    
    // Delete files from storage
    const filePaths = oldFileMessages
      .map(msg => msg.file_url?.split('/').slice(-2).join('/'))
      .filter(Boolean) as string[]
    
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove(filePaths)
      
      if (storageError) {
        console.warn('Some files failed to delete from storage:', storageError)
      }
    }
    
    // Delete message records
    const messageIds = oldFileMessages.map(msg => msg.id)
    const { error: deleteError } = await supabase
      .from('group_messages')
      .delete()
      .in('id', messageIds)
    
    if (deleteError) {
      console.error('Error deleting old message records:', deleteError)
      return { deletedCount: 0 }
    }
    
    console.log(`✅ Cleaned up ${oldFileMessages.length} old files`)
    return { deletedCount: oldFileMessages.length }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    return { deletedCount: 0 }
  }
}

/**
 * Clean up all group messages (text + files) older than 2 weeks
 */
export const cleanupOldGroupMessages = async (): Promise<{ deletedMessages: number; deletedFiles: number }> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    console.log('🧹 Starting cleanup of all group messages older than 2 weeks...')
    
    // Calculate 2 weeks ago
    const twoWeeksAgo = new Date()
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    // Get all messages older than 2 weeks
    const { data: oldMessages, error: fetchError } = await supabase
      .from('group_messages')
      .select('id, message_type, file_url')
      .lt('created_at', twoWeeksAgo.toISOString())
    
    if (fetchError) {
      console.error('Error fetching old messages:', fetchError)
      return { deletedMessages: 0, deletedFiles: 0 }
    }
    
    if (!oldMessages || oldMessages.length === 0) {
      console.log('✅ No old messages to clean up')
      return { deletedMessages: 0, deletedFiles: 0 }
    }
    
    console.log(`🗑️ Found ${oldMessages.length} messages to delete`)
    
    // Count file messages and prepare file paths for deletion
    const fileMessages = oldMessages.filter(msg => msg.message_type === 'file' && msg.file_url)
    const filePaths = fileMessages
      .map(msg => msg.file_url?.split('/').slice(-2).join('/'))
      .filter(Boolean) as string[]
    
    // Delete files from storage
    if (filePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('files')
        .remove(filePaths)
      
      if (storageError) {
        console.warn('Some files failed to delete from storage:', storageError)
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
      return { deletedMessages: 0, deletedFiles: 0 }
    }
    
    console.log(`✅ Cleaned up ${oldMessages.length} old messages (${fileMessages.length} files)`)
    return { 
      deletedMessages: oldMessages.length, 
      deletedFiles: fileMessages.length 
    }
    
  } catch (error) {
    console.error('❌ Error during message cleanup:', error)
    return { deletedMessages: 0, deletedFiles: 0 }
  }
}
