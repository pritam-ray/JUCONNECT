/**
 * EMERGENCY: Complete API shutdown for development
 * This will disable ALL API calls temporarily to isolate the issue
 */

class EmergencyAPIShutdown {
  private isShutdown = false
  private allowedCalls = new Set([
    'auth/token', // Allow essential auth
    'auth/session' // Allow session management
  ])

  shutdown() {
    this.isShutdown = true
    console.log('🚨 EMERGENCY API SHUTDOWN ACTIVATED')
  }

  enable() {
    this.isShutdown = false
    console.log('✅ API calls re-enabled')
  }

  isCallAllowed(url: string): boolean {
    if (!this.isShutdown) return true
    
    // Check if this is an allowed call
    for (const allowed of this.allowedCalls) {
      if (url.includes(allowed)) {
        return true
      }
    }
    
    console.log('🛑 API call blocked by emergency shutdown:', url)
    return false
  }
}

export const emergencyShutdown = new EmergencyAPIShutdown()

// Override ALL network requests
const originalFetch = globalThis.fetch
globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input.toString()
  
  // Block Supabase calls if shutdown is active
  if ((url.includes('supabase') || url.includes('localhost:54321')) && !emergencyShutdown.isCallAllowed(url)) {
    throw new Error('API call blocked by emergency shutdown')
  }
  
  return originalFetch(input, init)
}

// Add global controls
if (typeof window !== 'undefined') {
  (window as any).emergencyShutdown = () => {
    emergencyShutdown.shutdown()
  }
  
  (window as any).enableAPI = () => {
    emergencyShutdown.enable()
  }
}

// DISABLE EMERGENCY SHUTDOWN - API calls are controlled by other methods
// emergencyShutdown.shutdown()
