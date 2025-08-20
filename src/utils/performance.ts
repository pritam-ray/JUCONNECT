/**
 * Performance monitoring utilities
 */

import { logger } from './logger'

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
  } catch (e) {
    // LCP may not be supported
    logger.debug('LCP monitoring not supported')
  }
}

export const perf = PerformanceMonitor.getInstance()
