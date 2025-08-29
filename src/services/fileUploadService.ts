import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'
import { 
  validateFileName, 
  validateFileContent, 
  performVirusScan, 
  storeSecurityScanResult,
  validateMetadata 
} from './securityService'

type FileUpload = Database['public']['Tables']['file_uploads']['Row']
type FileUploadInsert = Database['public']['Tables']['file_uploads']['Insert']

// File size limits in bytes (5MB max for all file types)
const FILE_SIZE_LIMITS = {
  pdf: 5 * 1024 * 1024,   // 5MB
  doc: 5 * 1024 * 1024,   // 5MB
  docx: 5 * 1024 * 1024,  // 5MB
  txt: 5 * 1024 * 1024,   // 5MB
  jpg: 5 * 1024 * 1024,   // 5MB
  png: 5 * 1024 * 1024,   // 5MB
  jpeg: 5 * 1024 * 1024,  // 5MB
  gif: 5 * 1024 * 1024,   // 5MB
}

const ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'jpeg', 'gif'] as const

export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number]

export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !ALLOWED_FILE_TYPES.includes(fileExtension as AllowedFileType)) {
    return {
      isValid: false,
      error: `This file type is not supported. Please choose a PDF, Word document, text file, or image.`
    }
  }

  const maxSize = FILE_SIZE_LIMITS[fileExtension as AllowedFileType]
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Please upload a file or PDF smaller than 5MB`
    }
  }

  return { isValid: true }
}

export const uploadFile = async (
  file: File,
  userId: string,
  folder: string = 'uploads',
  metadata?: any
): Promise<{ uploadRecord: FileUpload; fileUrl: string }> => {
  // Comprehensive security validation
  const fileNameValidation = validateFileName(file.name)
  if (!fileNameValidation.isValid) {
    throw new Error(fileNameValidation.error)
  }

  const contentValidation = await validateFileContent(file)
  if (!contentValidation.isValid) {
    throw new Error(contentValidation.error)
  }

  // Validate metadata if provided
  if (metadata) {
    const metadataValidation = validateMetadata(metadata)
    if (!metadataValidation.isValid) {
      throw new Error(metadataValidation.error)
    }
  }

  // Perform virus scan
  const scanResult = await performVirusScan(file)
  if (!scanResult.isClean) {
    throw new Error(`File failed security scan: ${scanResult.threats.join(', ')}`)
  }

  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    // Generate unique filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2)
    // Sanitize the original filename for storage
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storedFilename = `${timestamp}-${randomString}-${sanitizedName}`
    const uploadPath = `${folder}/${storedFilename}`

    // Upload file to Supabase storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from('files')
      .upload(uploadPath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (storageError) {
      console.error('Storage upload error:', storageError)
      
      if (storageError.message?.includes('Bucket not found') || storageError.statusCode === '404') {
        throw new Error('File storage is not configured yet. Please contact the administrator to set up the storage bucket.')
      }
      
      if (storageError.message?.includes('row-level security policy') || storageError.statusCode === '403') {
        throw new Error('File upload permissions are not configured. Please contact the administrator to enable file uploads for authenticated users.')
      }
      
      throw new Error(`Failed to upload file: ${storageError.message}`)
    }

    // Get public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from('files')
      .getPublicUrl(uploadPath)

    const fileUrl = urlData.publicUrl

    // Record upload in database
    const uploadRecord: FileUploadInsert = {
      user_id: userId,
      original_filename: file.name,
      stored_filename: storedFilename,
      file_size: file.size,
      file_type: fileExtension as AllowedFileType,
      upload_path: uploadPath,
      is_processed: true
    }

    const { data, error: dbError } = await supabase
      .from('file_uploads')
      .insert([uploadRecord])
      .select()
      .single()

    if (dbError) {
      // If database insert fails, clean up the uploaded file
      await supabase.storage.from('files').remove([uploadPath])
      throw dbError
    }

    // Store security scan results if we have a content ID
    // This will be called separately after content creation
    
    return { 
      uploadRecord: data, 
      fileUrl,
      scanResult 
    }
  } catch (error: any) {
    console.error('File upload error:', error)
    throw error
  }
}

const deleteFile = async (uploadId: string, userId: string): Promise<void> => {
  try {
    // Get file info first
    const { data: fileData, error: fetchError } = await supabase
      .from('file_uploads')
      .select('upload_path')
      .eq('id', uploadId)
      .eq('user_id', userId)
      .single()

    if (fetchError) throw fetchError

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('files')
      .remove([fileData.upload_path])

    if (storageError) {
      console.error('Storage deletion error:', storageError)
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', uploadId)
      .eq('user_id', userId)

    if (dbError) throw dbError
  } catch (error) {
    console.error('File deletion error:', error)
    throw error
  }
}

const getUserFiles = async (userId: string): Promise<FileUpload[]> => {
  const { data, error } = await supabase
    .from('file_uploads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

const getFileUrl = async (uploadId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('file_uploads')
    .select('upload_path')
    .eq('id', uploadId)
    .single()

  if (error) {
    console.error('Error fetching file path:', error)
    return null
  }
  
  if (!data?.upload_path) return null

  // Get public URL from Supabase storage
  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(data.upload_path)

  return urlData.publicUrl
}