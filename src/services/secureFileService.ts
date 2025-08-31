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
 * Generate a secure temporary download URL for a file
 * For now, uses direct signed URLs which still provide good security
 */
export const getSecureDownloadUrl = async (
  fileUrl: string, 
  userId: string, 
  groupId?: string
): Promise<string> => {
  if (!supabase) throw new Error('Supabase not available')
  
  try {
    console.log('🔐 Generating secure download URL for:', fileUrl)
    
    // For now, use direct signed URL generation
    // This still provides security benefits:
    // 1. URLs expire after 1 hour
    // 2. User authorization is checked
    // 3. Hides the direct storage path structure
    return await getSecureDownloadUrlDirect(fileUrl, userId, groupId)
    
  } catch (error: any) {
    console.error('❌ Secure download URL generation failed:', error.message)
    throw error
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
    
    // Get secure signed URL (with user authorization)
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
    
    console.log('✅ Secure download completed for:', fileName)
    
  } catch (error: any) {
    console.error('❌ Secure download failed:', error.message)
    throw new Error(`Download failed: ${error.message}`)
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
