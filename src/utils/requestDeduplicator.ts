/**
 * Request deduplication middleware for Supabase
 * Prevents duplicate API calls from being made simultaneously
 */

interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>()
  private readonly REQUEST_TIMEOUT = 30000 // 30 seconds
  private requestCount = 0

  generateKey(url: string, options?: any): string {
    // Create a unique key based on URL and request options
    const method = options?.method || 'GET'
    const body = options?.body ? JSON.stringify(options.body) : ''
    return `${method}:${url}:${body}`
  }

  async deduplicate<T>(
    url: string, 
    requestFn: () => Promise<T>,
    options?: any
  ): Promise<T> {
    const key = this.generateKey(url, options)
    this.requestCount++
    
    // Log every request for monitoring
    console.log(`🌐 API Call #${this.requestCount}: ${key.substring(0, 100)}...`)
    
    // Clean up expired requests
    this.cleanupExpiredRequests()
    
    // Check if there's already a pending request for this exact call
    const existing = this.pendingRequests.get(key)
    if (existing) {
      console.log(`🔄 Deduplicating request: ${key.substring(0, 50)}...`)
      return existing.promise
    }

    // Create new request
    const promise = requestFn().finally(() => {
      // Remove from pending requests when done
      this.pendingRequests.delete(key)
    })

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    })

    return promise
  }

  private cleanupExpiredRequests() {
    const now = Date.now()
    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key)
      }
    }
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      totalRequests: this.requestCount
    }
  }

  reset() {
    this.pendingRequests.clear()
    this.requestCount = 0
  }
}

export const requestDeduplicator = new RequestDeduplicator()

// Monkey patch the global fetch to add deduplication
const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString()
  
  // Only deduplicate Supabase requests
  if (url.includes('supabase') || url.includes('localhost:54321')) {
    return requestDeduplicator.deduplicate(
      url,
      () => originalFetch(input, init),
      init
    )
  }
  
  // Let other requests pass through normally
  return originalFetch(input, init)
}

// Monitor and report stats every 10 seconds
setInterval(() => {
  const stats = requestDeduplicator.getStats()
  if (stats.totalRequests > 0) {
    console.log(`📊 Request Stats: ${stats.totalRequests} total, ${stats.pendingRequests} pending`)
  }
}, 10000)
