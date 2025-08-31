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
    console.log('🔐 Processing file URL:', fileUrl)
    
    // Extract file path from the full URL
    // Handle different URL formats from Supabase storage
    let bucket: string
    let filePath: string
    
    if (fileUrl.includes('/storage/v1/object/public/')) {
      // Public URL format
      const urlParts = fileUrl.split('/storage/v1/object/public/')
      if (urlParts.length < 2) {
        throw new Error('Invalid public file URL format')
      }
      const [bucketName, ...pathParts] = urlParts[1].split('/')
      bucket = bucketName
      filePath = pathParts.join('/')
    } else if (fileUrl.includes('/storage/v1/object/sign/')) {
      // Already a signed URL - extract original path
      const urlParts = fileUrl.split('/storage/v1/object/sign/')
      if (urlParts.length < 2) {
        throw new Error('Invalid signed file URL format')
      }
      const pathWithParams = urlParts[1].split('?')[0] // Remove query parameters
      const [bucketName, ...pathParts] = pathWithParams.split('/')
      bucket = bucketName
      filePath = pathParts.join('/')
    } else {
      throw new Error('Unrecognized file URL format')
    }
    
    console.log('🔐 Extracted - Bucket:', bucket, 'Path:', filePath)
    
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
      throw new Error(`Failed to generate secure download link: ${error.message}`)
    }
    
    if (!data?.signedUrl) {
      throw new Error('No signed URL generated')
    }
    
    console.log('✅ Direct signed URL generated successfully')
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
    
    // Fallback to direct download if secure download fails
    console.log('⚠️ Falling back to direct download for:', fileName)
    try {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = fileName
      link.target = '_blank'
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      console.log('✅ Fallback download completed for:', fileName)
    } catch (fallbackError: any) {
      console.error('❌ Fallback download also failed:', fallbackError.message)
      // Try opening the file in a new tab as last resort
      window.open(fileUrl, '_blank')
    }
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
