/**
 * Utility functions for handling errors and retries
 */

import { logger } from './logger'

export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    onRetry
  } = options

  let lastError: Error

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt === maxAttempts) {
        break
      }

      onRetry?.(attempt, lastError)
      logger.warn(`Attempt ${attempt} failed, retrying...`, lastError.message)
      
      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

/**
 * Safe async function wrapper that catches errors
 */
export function safeAsync<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  fallback?: R
) {
  return async (...args: T): Promise<R | undefined> => {
    try {
      return await fn(...args)
    } catch (error) {
      logger.error('Safe async function failed:', error)
      return fallback
    }
  }
}

/**
 * Error boundary for React components
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message)
    this.name = 'AppError'
  }
}

/**
 * Handle Supabase errors consistently
 */
export function handleSupabaseError(error: any): AppError {
  // User-friendly error messages for common Supabase errors
  const userFriendlyMessages: Record<string, string> = {
    'PGRST116': 'The information you requested could not be found.',
    '23505': 'This already exists. Please try a different name.',
    '42501': 'You do not have permission to do this.',
    'auth/invalid-email': 'Please check your email address.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Password is incorrect. Please try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment.',
    'auth/network-request-failed': 'Connection problem. Please check your internet.',
    'refresh_token_not_found': 'Please sign in again.',
    'invalid_grant': 'Please sign in again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Please choose a stronger password.',
    'auth/invalid-password': 'Password must be at least 6 characters.',
    'storage/object-not-found': 'The file could not be found.',
    'storage/bucket-not-found': 'File storage is not set up yet.',
    'storage/unauthorized': 'You cannot upload files right now.',
  }
  
  if (error?.code) {
    const friendlyMessage = userFriendlyMessages[error.code]
    if (friendlyMessage) {
      return new AppError(friendlyMessage, error.code, getStatusCode(error.code))
    }
    
    switch (error.code) {
      case 'PGRST116':
        return new AppError('The information you requested could not be found.', 'NOT_FOUND', 404)
      case '23505':
        return new AppError('This already exists. Please try a different name.', 'CONFLICT', 409)
      case '42501':
        return new AppError('You do not have permission to do this.', 'FORBIDDEN', 403)
      default:
        return new AppError(getUserFriendlyMessage(error.message) || 'Something went wrong. Please try again.', error.code, 500)
    }
  }
  
  return new AppError(getUserFriendlyMessage(error?.message) || 'Something went wrong. Please try again.', 'UNKNOWN', 500)
}

/**
 * Convert technical error messages to user-friendly ones
 */
function getUserFriendlyMessage(message: string): string {
  if (!message) return 'Something went wrong. Please try again.'
  
  const lowerMessage = message.toLowerCase()
  
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return 'Connection problem. Please check your internet.'
  }
  
  if (lowerMessage.includes('timeout')) {
    return 'This is taking too long. Please try again.'
  }
  
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
    return 'You do not have permission to do this.'
  }
  
  if (lowerMessage.includes('not found')) {
    return 'Could not find what you are looking for.'
  }
  
  if (lowerMessage.includes('already exists') || lowerMessage.includes('duplicate')) {
    return 'This already exists. Please try something different.'
  }
  
  if (lowerMessage.includes('invalid') && lowerMessage.includes('email')) {
    return 'Please check your email address.'
  }
  
  if (lowerMessage.includes('password')) {
    return 'Please check your password.'
  }
  
  if (lowerMessage.includes('session') || lowerMessage.includes('token')) {
    return 'Please sign in again.'
  }
  
  if (lowerMessage.includes('file') && lowerMessage.includes('size')) {
    return 'Please upload a file or PDF smaller than 5MB'
  }
  
  if (lowerMessage.includes('bucket') || lowerMessage.includes('storage')) {
    return 'File uploads are not available right now.'
  }
  
  // Return simplified message for anything else
  return 'Something went wrong. Please try again.'
}

/**
 * Get appropriate HTTP status code for error
 */
function getStatusCode(errorCode: string): number {
  const statusCodes: Record<string, number> = {
    'PGRST116': 404,
    '23505': 409,
    '42501': 403,
    'auth/invalid-email': 400,
    'auth/user-not-found': 404,
    'auth/wrong-password': 401,
    'auth/too-many-requests': 429,
    'auth/network-request-failed': 503,
  }
  
  return statusCodes[errorCode] || 500
}
