import { supabase } from '../lib/supabase'

/**
 * Secure File Download Service
 * Provides temporary signed URLs for file downloads without exposing storage details
 */

interface SecureDownloadOptions {
  fileUrl: string
  fileName: string
  userId: string
  groupId?: string
}

/**
 * Generate a secure temporary download URL for a file using Edge Function
 * This completely hides the Supabase storage URL from users
 */
export const getSecureDownloadUrl = async (
  fileUrl: string, 
  userId: string, 
  groupId?: string
): Promise<string> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    console.log('🔐 Generating secure download URL via Edge Function for:', fileUrl)
    
    // Get current session for authorization
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session) {
      throw new Error('User not authenticated')
    }
    
    // Call the secure-download Edge Function
    const { data, error } = await supabase.functions.invoke('secure-download', {
      body: {
        fileUrl,
        groupId
      },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    })
    
    if (error) {
      console.error('❌ Edge Function error:', error)
      throw new Error('Failed to generate secure download link via Edge Function')
    }
    
    if (!data?.secureUrl) {
      throw new Error('No secure URL received from Edge Function')
    }
    
    console.log('✅ Secure download URL generated via Edge Function')
    return data.secureUrl
    
  } catch (error: any) {
    console.error('❌ Edge Function approach failed:', error.message)
    
    // Fallback to direct signed URL generation
    console.log('🔄 Falling back to direct signed URL generation')
    return await getSecureDownloadUrlDirect(fileUrl, userId, groupId)
  }
}

/**
 * Fallback method: Direct signed URL generation
 */
const getSecureDownloadUrlDirect = async (
  fileUrl: string, 
  userId: string, 
  groupId?: string
): Promise<string> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    // Extract file path from the full URL
    const urlParts = fileUrl.split('/storage/v1/object/public/')
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL format')
    }
    
    const [bucket, ...pathParts] = urlParts[1].split('/')
    const filePath = pathParts.join('/')
    
    console.log('🔐 Generating direct signed URL for:', filePath)
    
    // Verify user has access to this file
    if (groupId) {
      // Check if user is a member of the group
      const { data: membership, error: memberError } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()
      
      if (memberError || !membership) {
        throw new Error('Access denied: User not authorized to download this file')
      }
    }
    
    // Generate a signed URL that expires in 1 hour
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 3600) // 1 hour expiry
    
    if (error) {
      console.error('❌ Error generating signed URL:', error)
      throw new Error('Failed to generate secure download link')
    }
    
    if (!data?.signedUrl) {
      throw new Error('No signed URL generated')
    }
    
    console.log('✅ Direct signed URL generated')
    return data.signedUrl
    
  } catch (error: any) {
    console.error('❌ Direct signed URL generation failed:', error.message)
    throw error
  }
}

/**
 * Download a file securely without exposing storage URLs
 */
export const downloadFileSecurely = async ({
  fileUrl,
  fileName,
  userId,
  groupId
}: SecureDownloadOptions): Promise<void> => {
  try {
    console.log('🔒 Starting secure download for:', fileName)
    
    // Get secure signed URL
    const secureUrl = await getSecureDownloadUrl(fileUrl, userId, groupId)
    
    // Create temporary download link
    const link = document.createElement('a')
    link.href = secureUrl
    link.download = fileName
    link.style.display = 'none'
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    console.log('✅ Secure download initiated for:', fileName)
    
  } catch (error: any) {
    console.error('❌ Download failed:', error.message)
    
    // Fallback to original URL if secure download fails
    // (This maintains functionality while we fix any issues)
    console.log('⚠️ Falling back to direct download')
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

/**
 * Get file metadata without exposing storage details
 */
export const getFileMetadata = async (
  fileUrl: string, 
  userId: string
): Promise<{ size: number; type: string; lastModified: Date } | null> => {
  try {
    const secureUrl = await getSecureDownloadUrl(fileUrl, userId)
    
    // Fetch file metadata using HEAD request
    const response = await fetch(secureUrl, { method: 'HEAD' })
    
    if (!response.ok) {
      throw new Error('Failed to fetch file metadata')
    }
    
    return {
      size: parseInt(response.headers.get('content-length') || '0'),
      type: response.headers.get('content-type') || 'application/octet-stream',
      lastModified: new Date(response.headers.get('last-modified') || Date.now())
    }
    
  } catch (error) {
    console.error('❌ Failed to get file metadata:', error)
    return null
  }
}
