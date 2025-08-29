import { logger } from './logger'

export interface UserFriendlyError {
  message: string
  action?: string
  severity: 'error' | 'warning' | 'info'
  code?: string
}

export interface ErrorContext {
  operation?: string
  userId?: string
  timestamp?: string
  metadata?: Record<string, any>
}

export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
  onRetry?: (attempt: number, error: Error) => void
}

/**
 * Enhanced AppError class with user-friendly error conversion
 */
export class AppError extends Error {
  public readonly code?: string
  public readonly statusCode?: number
  public readonly userFriendlyMessage: string
  public readonly action?: string
  public readonly severity: 'error' | 'warning' | 'info'
  public readonly context?: ErrorContext

  constructor(
    message: string,
    userFriendlyMessage?: string,
    action?: string,
    severity: 'error' | 'warning' | 'info' = 'error',
    code?: string,
    context?: ErrorContext
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.userFriendlyMessage = userFriendlyMessage || this.convertToUserFriendlyMessage(message)
    this.action = action
    this.severity = severity
    this.context = context
  }

  private convertToUserFriendlyMessage(message: string): string {
    const errorMap: Record<string, string> = {
      'Network request failed': 'Connection problem. Please check your internet.',
      'Invalid credentials': 'Please check your username and password.',
      'User not found': 'We could not find your account.',
      'Permission denied': 'You do not have permission to do this.',
      'File too large': 'Please upload a file or PDF smaller than 5MB',
      'Invalid file type': 'Please upload a valid file type.',
      'Session expired': 'Your session has expired. Please log in again.',
      'Rate limit exceeded': 'Too many requests. Please wait a moment.',
      'Service unavailable': 'Our service is temporarily unavailable.'
    }

    for (const [key, friendlyMessage] of Object.entries(errorMap)) {
      if (message.toLowerCase().includes(key.toLowerCase())) {
        return friendlyMessage
      }
    }

    return 'Something went wrong. Please try again.'
  }

  convertToUserFriendly(): UserFriendlyError {
    return {
      message: this.userFriendlyMessage,
      action: this.action,
      severity: this.severity,
      code: this.code
    }
  }
}

/**
 * Create user-friendly error from any error
 */
export function createUserFriendlyError(error: any, context?: ErrorContext): UserFriendlyError {
  if (error instanceof AppError) {
    return error.convertToUserFriendly()
  }

  const message = error?.message || 'An unexpected error occurred'
  const errorMap: Record<string, { message: string; action?: string; severity?: 'error' | 'warning' | 'info' }> = {
    'network error': {
      message: 'Connection problem',
      action: 'Please check your internet connection and try again',
      severity: 'warning'
    },
    'unauthorized': {
      message: 'Access denied',
      action: 'Please log in and try again',
      severity: 'warning'
    },
    'forbidden': {
      message: 'Permission denied',
      action: 'You do not have permission to perform this action',
      severity: 'error'
    },
    'not found': {
      message: 'Not found',
      action: 'The requested item could not be found',
      severity: 'info'
    },
    'timeout': {
      message: 'Request timed out',
      action: 'Please try again',
      severity: 'warning'
    },
    'file too large': {
      message: 'Please upload a file or PDF smaller than 5MB',
      action: 'Choose a smaller file and try again',
      severity: 'warning'
    },
    'session expired': {
      message: 'Session expired',
      action: 'Please log in again',
      severity: 'warning'
    }
  }

  // Check for specific error patterns
  for (const [pattern, config] of Object.entries(errorMap)) {
    if (message.toLowerCase().includes(pattern)) {
      return {
        message: config.message,
        action: config.action,
        severity: config.severity || 'error',
        code: pattern.toUpperCase().replace(' ', '_')
      }
    }
  }

  // Handle context-specific errors
  if (context?.operation) {
    switch (context.operation) {
      case 'file_upload':
        return {
          message: 'Upload failed',
          action: 'Please check your file and try again',
          severity: 'warning',
          code: 'UPLOAD_ERROR'
        }
      case 'auth':
        return {
          message: 'Authentication failed',
          action: 'Please check your credentials and try again',
          severity: 'warning',
          code: 'AUTH_ERROR'
        }
      case 'chat':
        return {
          message: 'Message could not be sent',
          action: 'Please try sending your message again',
          severity: 'warning',
          code: 'CHAT_ERROR'
        }
      case 'group':
        return {
          message: 'Group operation failed',
          action: 'Please try again or contact support',
          severity: 'error',
          code: 'GROUP_ERROR'
        }
    }
  }

  return {
    message: 'Something went wrong',
    action: 'Please try again or contact support if the problem continues',
    severity: 'error',
    code: 'UNKNOWN_ERROR'
  }
}

/**
 * Enhanced error reporting with user-friendly messages
 */
export function reportError(
  error: any,
  context?: ErrorContext,
  defaultMessage?: string
): UserFriendlyError {
  const userFriendlyError = createUserFriendlyError(error, context)
  
  // Log the actual error for debugging
  logger.error('Error occurred:', {
    originalError: error?.message || error,
    userFriendlyMessage: userFriendlyError.message,
    context,
    stack: error?.stack
  })

  return userFriendlyError
}

/**
 * Handle authentication errors specifically
 */
export function handleAuthError(error: any): UserFriendlyError {
  return createUserFriendlyError(error, { operation: 'auth' })
}

/**
 * Handle file upload errors specifically
 */
export function handleFileUploadError(error: any): UserFriendlyError {
  return createUserFriendlyError(error, { operation: 'file_upload' })
}

/**
 * Handle network errors
 */
export function handleNetworkError(error: any): UserFriendlyError {
  return {
    message: 'Connection problem',
    action: 'Please check your internet connection and try again',
    severity: 'warning',
    code: 'NETWORK_ERROR'
  }
}

/**
 * Enhanced retry function with user-friendly error handling
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

  // Create user-friendly error for the final failure
  const context: ErrorContext = {
    operation: 'retry',
    timestamp: new Date().toISOString()
  }
  
  const userFriendlyError = createUserFriendlyError(lastError!, context)
  throw new AppError(
    lastError!.message,
    userFriendlyError.message,
    userFriendlyError.action,
    userFriendlyError.severity,
    userFriendlyError.code
  )
}

/**
 * Wrapper for async operations with automatic error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext,
  defaultMessage?: string
): Promise<{ data: T | null; error: UserFriendlyError | null }> {
  try {
    const data = await operation()
    return { data, error: null }
  } catch (error) {
    const userFriendlyError = reportError(error, context, defaultMessage)
    return { data: null, error: userFriendlyError }
  }
}

/**
 * Handle form validation errors
 */
export function handleFormError(error: any): string {
  const userFriendlyError = createUserFriendlyError(error, { operation: 'form_validation' })
  return userFriendlyError.message
}

/**
 * Handle API errors with specific context
 */
export function handleAPIError(error: any, operation: string): UserFriendlyError {
  return createUserFriendlyError(error, { operation })
}

/**
 * Create error message for offline scenarios
 */
export function createOfflineError(): UserFriendlyError {
  return {
    message: 'You appear to be offline',
    action: 'Please check your internet connection and try again',
    severity: 'warning',
    code: 'OFFLINE_ERROR'
  }
}

/**
 * Create error message for maintenance scenarios
 */
export function createMaintenanceError(): UserFriendlyError {
  return {
    message: 'We are currently performing maintenance',
    action: 'Please try again in a few minutes',
    severity: 'info',
    code: 'MAINTENANCE_ERROR'
  }
}

// Legacy compatibility functions
export function safeSync<T extends any[], R>(
  fn: (...args: T) => R,
  errorHandler?: (error: Error, ...args: T) => void
) {
  return (...args: T): R | null => {
    try {
      return fn(...args)
    } catch (error) {
      const appError = error as Error
      logger.error(`Safe sync error in ${fn.name}:`, appError.message)
      errorHandler?.(appError, ...args)
      return null
    }
  }
}

export function createFriendlyError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  const message = error && typeof error === 'object' && 'message' in error ? 
    String(error.message) : 'An unexpected error occurred'
  
  return new AppError(message)
}
