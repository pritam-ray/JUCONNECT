/**
 * Initialization guard to prevent multiple simultaneous app initializations
 * This helps prevent the 1500+ API calls on app startup
 */

class InitializationGuard {
  private isInitializing = false
  private isInitialized = false
  private initPromise: Promise<void> | null = null

  async initialize(initFn: () => Promise<void>): Promise<void> {
    // If already initialized, do nothing
    if (this.isInitialized) {
      console.log('🔒 App already initialized, skipping duplicate initialization')
      return
    }

    // If currently initializing, wait for the existing initialization to complete
    if (this.isInitializing && this.initPromise) {
      console.log('⏳ App initialization in progress, waiting...')
      return this.initPromise
    }

    // Start initialization
    console.log('🚀 Starting app initialization...')
    this.isInitializing = true
    
    this.initPromise = (async () => {
      try {
        await initFn()
        this.isInitialized = true
        console.log('✅ App initialization completed')
      } catch (error) {
        console.error('❌ App initialization failed:', error)
        throw error
      } finally {
        this.isInitializing = false
      }
    })()

    return this.initPromise
  }

  reset() {
    this.isInitialized = false
    this.isInitializing = false
    this.initPromise = null
    console.log('🔄 Initialization guard reset')
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isInitializing: this.isInitializing
    }
  }
}

export const initGuard = new InitializationGuard()
