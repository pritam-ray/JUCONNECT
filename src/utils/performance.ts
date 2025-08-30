/**
 * Performance monitoring utilities
 */

import { logger } from './logger'
import { useCallback, useRef, useEffect } from 'react'

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private timers = new Map<string, number>()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  startTimer(name: string): void {
    this.timers.set(name, performance.now())
  }

  endTimer(name: string): number | null {
    const startTime = this.timers.get(name)
    if (startTime === undefined) {
      logger.warn(`Timer "${name}" was not started`)
      return null
    }

    const duration = performance.now() - startTime
    this.timers.delete(name)
    
    if (duration > 1000) {
      logger.warn(`Performance warning: "${name}" took ${duration.toFixed(2)}ms`)
    } else {
      logger.debug(`Performance: "${name}" took ${duration.toFixed(2)}ms`)
    }

    return duration
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTimer(name)
    return fn().finally(() => {
      this.endTimer(name)
    })
  }
}

/**
 * Debounce hook to prevent excessive API calls
 */
export const useDebounce = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>()

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  ) as T

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

/**
 * Hook to prevent memory leaks from async operations
 */
export const useAsyncOperation = () => {
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const execute = useCallback(
    async <T>(asyncFn: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await asyncFn()
        return isMountedRef.current ? result : null
      } catch (error) {
        if (isMountedRef.current) {
          throw error
        }
        return null
      }
    },
    []
  )

  return { execute, isMounted: () => isMountedRef.current }
}

/**
 * Rate limiter for error logging to prevent spam
 */
class ErrorRateLimiter {
  private errorCounts: Map<string, { count: number; resetTime: number }> = new Map()
  private readonly maxErrorsPerMinute = 10
  private readonly windowMs = 60 * 1000 // 1 minute

  public shouldLogError(errorKey: string): boolean {
    const now = Date.now()
    const errorData = this.errorCounts.get(errorKey)

    if (!errorData || now > errorData.resetTime) {
      // New error or time window expired
      this.errorCounts.set(errorKey, {
        count: 1,
        resetTime: now + this.windowMs
      })
      return true
    }

    if (errorData.count < this.maxErrorsPerMinute) {
      errorData.count++
      return true
    }

    // Rate limit exceeded
    return false
  }

  public cleanup() {
    const now = Date.now()
    for (const [key, data] of this.errorCounts.entries()) {
      if (now > data.resetTime) {
        this.errorCounts.delete(key)
      }
    }
  }
}

export const errorRateLimiter = new ErrorRateLimiter()

// Cleanup expired rate limit entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    errorRateLimiter.cleanup()
  }, 5 * 60 * 1000)
}

// Web Vitals monitoring
export function initWebVitals() {
  if (typeof window === 'undefined') return

  // Monitor Largest Contentful Paint
  const observer = new PerformanceObserver((list) => {
    const entries = list.getEntries()
    const lastEntry = entries[entries.length - 1]
    
    if (lastEntry.startTime > 2500) {
      logger.warn(`LCP warning: ${lastEntry.startTime}ms`)
    }
  })

  try {
    observer.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    // LCP may not be supported
    logger.debug('LCP monitoring not supported')
  }
}

export const perf = PerformanceMonitor.getInstance()
