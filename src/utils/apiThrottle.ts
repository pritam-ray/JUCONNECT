/**
 * API Throttling utilities to prevent excessive API calls and data leaks
 */

// Global throttle map to track API call rates
const throttleMap = new Map<string, number>()
const THROTTLE_WINDOW = 5000 // 5 seconds minimum between similar calls

/**
 * Throttle API calls by key to prevent spam
 */
export const throttleApiCall = (key: string, minInterval: number = THROTTLE_WINDOW): boolean => {
  const now = Date.now()
  const lastCall = throttleMap.get(key)
  
  if (lastCall && (now - lastCall) < minInterval) {
    console.log(`🚫 API call throttled: ${key}`)
    return false
  }
  
  throttleMap.set(key, now)
  return true
}

/**
 * Check if document is visible to pause background operations
 */
export const isDocumentVisible = (): boolean => {
  return !document.hidden
}

/**
 * Debounce function for high-frequency events
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Clean up old throttle entries periodically
 */
setInterval(() => {
  const now = Date.now()
  const cutoff = now - (THROTTLE_WINDOW * 2)
  
  for (const [key, timestamp] of throttleMap.entries()) {
    if (timestamp < cutoff) {
      throttleMap.delete(key)
    }
  }
}, 60000) // Clean up every minute

export default {
  throttleApiCall,
  isDocumentVisible,
  debounce
}
