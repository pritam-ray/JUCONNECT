/**
 * Global API Cache to prevent duplicate API calls during app initialization
 * This cache will store responses for a short period to prevent excessive API usage
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  expiry: number
}

class APICache {
  private cache = new Map<string, CacheEntry<any>>()
  private readonly DEFAULT_TTL = 30000 // 30 seconds
  private readonly MAX_CACHE_SIZE = 100
  
  // Track ongoing requests to prevent duplicate calls
  private pendingRequests = new Map<string, Promise<any>>()

  generateKey(url: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : ''
    return `${url}${paramStr}`
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data as T
  }

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Prevent cache from growing too large
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp)
      entries.slice(0, 10).forEach(([key]) => this.cache.delete(key))
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry: ttl
    })
  }

  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number = this.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = await this.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Check if there's already a pending request for this key
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!
    }

    // Create new request
    const fetchPromise = fetchFn().then(data => {
      this.set(key, data, ttl)
      this.pendingRequests.delete(key)
      return data
    }).catch(error => {
      this.pendingRequests.delete(key)
      throw error
    })

    this.pendingRequests.set(key, fetchPromise)
    return fetchPromise
  }

  clear(): void {
    this.cache.clear()
    this.pendingRequests.clear()
  }

  invalidate(pattern: string): void {
    const keysToDelete: string[] = []
    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key))
  }

  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    }
  }
}

export const apiCache = new APICache()

// Clear cache every 5 minutes to prevent memory leaks
setInterval(() => {
  const stats = apiCache.getStats()
  if (stats.cacheSize > 0) {
    apiCache.clear()
  }
}, 5 * 60 * 1000)
