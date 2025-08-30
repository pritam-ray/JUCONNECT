/**
 * Circuit Breaker to completely prevent excessive API calls
 * This will aggressively block API requests if too many are made
 */

class CircuitBreaker {
  private callCount = 0
  private resetTime = 0
  private readonly MAX_CALLS_PER_MINUTE = 50 // Very strict limit
  private readonly RESET_INTERVAL = 60000 // 1 minute
  private isBlocked = false
  private blockedUntil = 0
  
  canMakeCall(): boolean {
    const now = Date.now()
    
    // Reset counter every minute
    if (now > this.resetTime) {
      this.callCount = 0
      this.resetTime = now + this.RESET_INTERVAL
      this.isBlocked = false
    }
    
    // Check if we're in blocked state
    if (this.isBlocked && now < this.blockedUntil) {
      console.warn('🚫 API calls blocked - too many requests')
      return false
    }
    
    // Check if we've exceeded the limit
    if (this.callCount >= this.MAX_CALLS_PER_MINUTE) {
      this.isBlocked = true
      this.blockedUntil = now + 30000 // Block for 30 seconds
      console.error(`🚨 CIRCUIT BREAKER TRIGGERED! ${this.callCount} calls in last minute. Blocking API calls for 30 seconds.`)
      return false
    }
    
    this.callCount++
    
    // Warn when approaching limit
    if (this.callCount > this.MAX_CALLS_PER_MINUTE * 0.8) {
      console.warn(`⚠️ High API usage: ${this.callCount}/${this.MAX_CALLS_PER_MINUTE} calls`)
    }
    
    return true
  }
  
  getStats() {
    return {
      callCount: this.callCount,
      isBlocked: this.isBlocked,
      maxCalls: this.MAX_CALLS_PER_MINUTE
    }
  }
  
  reset() {
    this.callCount = 0
    this.isBlocked = false
    this.blockedUntil = 0
    console.log('🔄 Circuit breaker reset')
  }
}

export const circuitBreaker = new CircuitBreaker()

// Override the global fetch with circuit breaker
const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString()
  
  // Only protect Supabase calls
  if (url.includes('supabase') || url.includes('localhost:54321')) {
    if (!circuitBreaker.canMakeCall()) {
      // Return a rejected promise to prevent the call
      throw new Error('API call blocked by circuit breaker - too many requests')
    }
    
    console.log(`🌐 API Call #${circuitBreaker.getStats().callCount}: ${url.substring(url.lastIndexOf('/') + 1)}`)
  }
  
  return originalFetch(input, init)
}

// Add emergency stop function to window for debugging
if (typeof window !== 'undefined') {
  (window as any).stopAllAPICalls = () => {
    circuitBreaker.reset()
    console.log('🛑 Emergency API stop activated')
  }
  
  (window as any).getAPIStats = () => {
    return circuitBreaker.getStats()
  }
}
