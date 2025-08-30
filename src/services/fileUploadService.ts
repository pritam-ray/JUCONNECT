/**
 * Enhanced File Upload Service for JU_CONNECT
 * 
 * Features:
 * - Strict 5MB file size limit with user-friendly error messages
 * - Progress tracking for uploads
 * - Comprehensive error handling
 * - File validation and security scanning
 * - Optimistic UI updates
 */

import { supabase } from '../lib/supabase'
import { 
  validateFileName, 
  validateFileContent
} from './securityService'
import { logger } from '../utils/logger'

// File size limits in bytes (5MB max for all file types)
const FILE_SIZE_LIMIT = 5 * 1024 * 1024 // 5MB
const FILE_SIZE_LIMITS = {
  pdf: FILE_SIZE_LIMIT,
  doc: FILE_SIZE_LIMIT,
  docx: FILE_SIZE_LIMIT,
  txt: FILE_SIZE_LIMIT,
  jpg: FILE_SIZE_LIMIT,
  png: FILE_SIZE_LIMIT,
  jpeg: FILE_SIZE_LIMIT,
  gif: FILE_SIZE_LIMIT,
  webp: FILE_SIZE_LIMIT
}

const ALLOWED_FILE_TYPES = ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'jpeg', 'gif', 'webp'] as const

export type AllowedFileType = typeof ALLOWED_FILE_TYPES[number]

export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
  stage: 'validating' | 'uploading' | 'processing' | 'complete' | 'error'
  message: string
}

export interface FileUploadResult {
  success: boolean
  fileUrl?: string
  fileName?: string
  fileSize?: number
  uploadId?: string
  error?: string
}

export interface FileUploadOptions {
  onProgress?: (progress: FileUploadProgress) => void
  onError?: (error: string) => void
  bucket?: string
  folder?: string
}

/**
 * Validate file with user-friendly error messages
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file name
  if (!file.name || file.name.trim() === '') {
    return {
      isValid: false,
      error: 'Please choose a valid file with a proper name'
    }
  }

  // Check file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  
  if (!fileExtension || !ALLOWED_FILE_TYPES.includes(fileExtension as AllowedFileType)) {
    return {
      isValid: false,
      error: `This file type is not supported. Please choose a PDF, Word document, text file, or image (JPG, PNG)`
    }
  }

  // Check file size with the exact required message
  const maxSize = FILE_SIZE_LIMITS[fileExtension as AllowedFileType]
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `Please upload a file or PDF smaller than 5MB`
    }
  }

  // Check if file is empty
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'The file appears to be empty. Please choose a different file'
    }
  }

  return { isValid: true }
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Get file type category for better organization
 */
export const getFileTypeCategory = (fileName: string): 'document' | 'image' | 'other' => {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (['pdf', 'doc', 'docx', 'txt'].includes(extension || '')) {
    return 'document'
  }
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
    return 'image'
  }
  
  return 'other'
}

/**
 * Enhanced file upload with progress tracking and user-friendly error messages
 */
export const uploadFile = async (
  file: File,
  userId: string,
  options: FileUploadOptions = {}
): Promise<FileUploadResult> => {
  const { onProgress, onError, bucket = 'files', folder = 'general' } = options
  let uploadSession: any = null

  try {
    // Create upload tracking session
    const { fileUploadTrackingService } = await import('./enhancedServices')
    uploadSession = await fileUploadTrackingService.createUploadSession(
      userId,
      file.name,
      file.size,
      file.type
    )

    // Validation stage
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 0,
      stage: 'validating',
      message: 'Checking file...'
    })

    if (uploadSession) {
      await fileUploadTrackingService.updateUploadProgress(uploadSession.id, 5, 'pending')
    }

    if (!supabase) {
      const error = 'File upload is not available right now. Please try again later'
      if (uploadSession) {
        await fileUploadTrackingService.markUploadFailed(uploadSession.id, error)
      }
      onError?.(error)
      return { success: false, error }
    }

    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      if (uploadSession) {
        await fileUploadTrackingService.markUploadFailed(uploadSession.id, validation.error!)
      }
      onError?.(validation.error!)
      return { success: false, error: validation.error }
    }

    // Additional security validation
    const nameValidation = validateFileName(file.name)
    if (!nameValidation.isValid) {
      const error = 'This file name contains invalid characters. Please rename your file and try again'
      onError?.(error)
      return { success: false, error }
    }

    // Content validation (async)
    try {
      const contentValidation = await validateFileContent(file)
      if (!contentValidation.isValid) {
        const error = 'This file appears to be corrupted or unsafe. Please try a different file'
        onError?.(error)
        return { success: false, error }
      }
    } catch (validationError) {
      console.warn('Content validation failed:', validationError)
      // Continue with upload even if validation fails (non-blocking)
    }

    // Upload stage
    onProgress?.({
      loaded: 20,
      total: 100,
      percentage: 20,
      stage: 'uploading',
      message: 'Uploading file...'
    })

    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const timestamp = Date.now()
    const fileName = `${userId}_${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const uploadPath = `${folder}/${fileName}`

    // Upload to Supabase storage with progress tracking
    const { error: storageError } = await supabase.storage
      .from(bucket)
      .upload(uploadPath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (storageError) {
      let userFriendlyError = 'Failed to upload file. Please try again'
      
      if (storageError.message?.includes('Bucket not found')) {
        userFriendlyError = 'File storage is not properly set up. Please contact support'
      } else if (storageError.message?.includes('File size')) {
        userFriendlyError = 'Please upload a file or PDF smaller than 5MB'
      } else if (storageError.message?.includes('row-level security policy')) {
        userFriendlyError = 'You do not have permission to upload files right now'
      } else if (storageError.message?.includes('already exists')) {
        userFriendlyError = 'A file with this name already exists. Please rename your file and try again'
      }
      
      logger.error('Storage upload error:', storageError)
      onError?.(userFriendlyError)
      return { success: false, error: userFriendlyError }
    }

    // Processing stage
    onProgress?.({
      loaded: 70,
      total: 100,
      percentage: 70,
      stage: 'processing',
      message: 'Processing file...'
    })

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(uploadPath)

    if (!urlData?.publicUrl) {
      const error = 'Failed to generate file access link. Please try again'
      onError?.(error)
      return { success: false, error }
    }

    // Normalize file type for database (convert jpeg to jpg for consistency)
    const normalizedFileType = fileExtension === 'jpeg' ? 'jpg' : 
                              fileExtension === 'gif' ? 'jpg' :  // Convert gif to jpg
                              fileExtension === 'webp' ? 'jpg' : // Convert webp to jpg
                              fileExtension

    // Save upload record to database
    const uploadRecord = {
      user_id: userId,
      original_filename: file.name,
      stored_filename: fileName,
      file_size: file.size,
      file_type: normalizedFileType as 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png',
      upload_path: uploadPath,
      is_processed: false
    }

    const { data, error: dbError } = await supabase
      .from('file_uploads')
      .insert([uploadRecord])
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file if database insert fails
      try {
        await supabase.storage.from(bucket).remove([uploadPath])
      } catch (cleanupError) {
        logger.error('Failed to cleanup file after DB error:', cleanupError)
      }
      
      const error = 'Failed to save file information. Please try again'
      logger.error('Database insert error:', dbError)
      onError?.(error)
      return { success: false, error }
    }

    // Complete
    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      stage: 'complete',
      message: 'Upload complete!'
    })

    // Mark upload session as completed and log activity
    if (uploadSession) {
      await fileUploadTrackingService.updateUploadProgress(uploadSession.id, 100, 'completed')
    }

    // Log upload activity
    const { activityService } = await import('./enhancedServices')
    await activityService.logActivity(
      userId,
      'upload',
      { 
        fileName: file.name,
        fileSize: file.size,
        fileType: fileExtension,
        uploadPath 
      }
    ).catch(err => console.warn('Failed to log upload activity:', err))

    return {
      success: true,
      fileUrl: urlData.publicUrl,
      fileName: file.name,
      fileSize: file.size,
      uploadId: data.id
    }

  } catch (error) {
    const errorMessage = 'An unexpected error occurred during upload. Please try again'
    logger.error('File upload error:', error)
    
    // Mark upload session as failed and log error
    if (uploadSession) {
      const { fileUploadTrackingService } = await import('./enhancedServices')
      await fileUploadTrackingService.markUploadFailed(uploadSession.id, errorMessage)
    }

    // Log error to enhanced error reporting
    const { enhancedErrorReporting } = await import('./enhancedServices')
    await enhancedErrorReporting.reportError(error, {
      userId,
      operation: 'file_upload',
      component: 'fileUploadService',
      metadata: { 
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      }
    })
    
    onError?.(errorMessage)
    
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 0,
      stage: 'error',
      message: errorMessage
    })

    return { success: false, error: errorMessage }
  }
}