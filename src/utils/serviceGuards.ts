/**
 * Utility functions for service guards and validations
 */

import { supabase } from '../lib/supabase'
import { logger } from './logger'

/**
 * Guard function to ensure Supabase is available
 */
export function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase client is not available. Please check your configuration.')
  }
  return supabase
}

/**
 * Guard function with demo mode fallback
 */
export function withSupabaseGuard<T>(
  fallbackValue: T,
  operation: string = 'operation'
) {
  return (fn: () => Promise<T>) => {
    return async (): Promise<T> => {
      if (!supabase) {
        logger.demoMode(`${operation} not available in demo mode`)
        return fallbackValue
      }
      return fn()
    }
  }
}

/**
 * Type-safe error wrapper for async operations
 */
export async function safeOperation<T>(
  operation: () => Promise<T>,
  fallback?: T,
  errorMessage?: string
): Promise<T | undefined> {
  try {
    return await operation()
  } catch (error) {
    logger.error(errorMessage || 'Operation failed:', error)
    return fallback
  }
}

/**
 * Validate user permissions
 */
export function requireAuth(userId?: string): string {
  if (!userId) {
    throw new Error('Authentication required')
  }
  return userId
}

/**
 * Validate admin permissions
 */
export async function requireAdmin(userId?: string): Promise<string> {
  const validUserId = requireAuth(userId)
  
  if (!supabase) {
    throw new Error('Admin verification not available in demo mode')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', validUserId)
    .single()

  if (!profile?.is_admin) {
    throw new Error('Admin privileges required')
  }

  return validUserId
}
