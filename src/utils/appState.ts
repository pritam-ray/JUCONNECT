/**
 * Global app state to prevent multiple initializations
 */

class AppState {
  private static instance: AppState
  private initialized = false
  private initializing = false
  private components = new Set<string>()

  static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  markComponentMounted(componentName: string): boolean {
    if (this.components.has(componentName)) {
      console.log(`⚠️ Component ${componentName} already mounted, preventing duplicate mount`)
      return false // Prevent duplicate mount
    }
    
    this.components.add(componentName)
    console.log(`✅ Component ${componentName} mounted`)
    return true // Allow mount
  }

  markComponentUnmounted(componentName: string): void {
    this.components.delete(componentName)
    console.log(`❌ Component ${componentName} unmounted`)
  }

  setInitialized(): void {
    this.initialized = true
    this.initializing = false
    console.log('🎯 App fully initialized')
  }

  setInitializing(): void {
    this.initializing = true
    console.log('⏳ App initializing...')
  }

  isInitialized(): boolean {
    return this.initialized
  }

  isInitializing(): boolean {
    return this.initializing
  }

  getMountedComponents(): string[] {
    return Array.from(this.components)
  }

  reset(): void {
    this.initialized = false
    this.initializing = false
    this.components.clear()
    console.log('🔄 App state reset')
  }
}

export const appState = AppState.getInstance()

// Add to window for debugging
if (typeof window !== 'undefined') {
  (window as any).appState = appState
}
