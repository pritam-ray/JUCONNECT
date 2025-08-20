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
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return new AppError('Resource not found', 'NOT_FOUND', 404)
      case '23505':
        return new AppError('Resource already exists', 'CONFLICT', 409)
      case '42501':
        return new AppError('Permission denied', 'FORBIDDEN', 403)
      default:
        return new AppError(error.message || 'Database error', error.code, 500)
    }
  }
  
  return new AppError(error?.message || 'Unknown error occurred', 'UNKNOWN', 500)
}
