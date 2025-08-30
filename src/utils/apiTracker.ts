/**
 * Global API call tracker to monitor and prevent excessive Supabase requests
 */

interface APICallLog {
  timestamp: number
  method: string
  table?: string
  count: number
}

class APICallTracker {
  private calls: APICallLog[] = []
  private readonly MAX_CALLS_PER_MINUTE = 200 // More reasonable limit
  private readonly WINDOW_SIZE = 60000 // 1 minute
  
  logCall(method: string, table?: string) {
    const now = Date.now()
    
    // Clean old calls outside the window
    this.calls = this.calls.filter(call => now - call.timestamp < this.WINDOW_SIZE)
    
    // Add new call
    this.calls.push({ timestamp: now, method, table, count: 1 })
    
    // Check if we're exceeding limits (but don't block, just warn)
    if (this.calls.length > this.MAX_CALLS_PER_MINUTE) {
      console.warn(`🚨 High API usage: ${this.calls.length} calls in last minute`)
      // Don't block API calls, just warn
    }
    
    // Log every 20th call for monitoring (less frequent)
    if (this.calls.length % 20 === 0) {
      console.log(`📊 API Calls: ${this.calls.length}/min`)
    }
    
    return true // Always return true to not block API calls
  }
  
  getCallSummary() {
    const summary: Record<string, number> = {}
    this.calls.forEach(call => {
      const key = call.table ? `${call.method}:${call.table}` : call.method
      summary[key] = (summary[key] || 0) + 1
    })
    return summary
  }
  
  getCurrentCount() {
    return this.calls.length
  }
}

export const apiTracker = new APICallTracker()

// Monkey patch console.log to catch excessive logging
const originalConsoleLog = console.log
let logCount = 0
const LOG_LIMIT = 100

console.log = (...args) => {
  logCount++
  if (logCount > LOG_LIMIT) {
    if (logCount === LOG_LIMIT + 1) {
      originalConsoleLog('🔇 Console logging suppressed due to excessive output')
    }
    return
  }
  originalConsoleLog(...args)
}

// Reset log count every minute
setInterval(() => {
  logCount = 0
}, 60000)
