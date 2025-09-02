/**
 * Logger utility that completely disables console output in production
 * NO console output will be shown in production builds
 */

const isDevelopment = import.meta.env.DEV

// Completely disable ALL console output in production
if (!isDevelopment) {
  const noop = () => {}
  
  // Store original console methods
  const originalConsole = window.console
  
  // Override all console methods immediately
  window.console = {
    ...window.console,
    log: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    table: noop,
    group: noop,
    groupEnd: noop,
    trace: noop,
    time: noop,
    timeEnd: noop,
    count: noop,
    clear: noop,
    assert: noop,
    dir: noop,
    dirxml: noop,
    profile: noop,
    profileEnd: noop,
  }
  
  // Also override console on all global objects to catch external libraries
  if (typeof globalThis !== 'undefined') {
    globalThis.console = window.console
  }
  if (typeof global !== 'undefined') {
    global.console = window.console
  }
  
  // Intercept global error events to prevent WebSocket errors from showing
  window.addEventListener('error', (event) => {
    event.preventDefault()
    event.stopPropagation()
    return false
  }, { capture: true })
  
  window.addEventListener('unhandledrejection', (event) => {
    event.preventDefault()
    event.stopPropagation()
    return false
  }, { capture: true })
  
  // Additional intercept for console calls from external libraries
  const interceptConsole = (obj: any) => {
    if (obj && typeof obj === 'object' && obj.console) {
      obj.console = window.console
    }
  }
  
  // Monitor for dynamic console usage
  setInterval(() => {
    interceptConsole(window)
    interceptConsole(globalThis)
    if (typeof global !== 'undefined') {
      interceptConsole(global)
    }
  }, 1000)
}

export const logger = {
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  },
  
  info: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.info(`[INFO] ${message}`, ...args)
    }
  },
  
  warn: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  },
  
  error: (message: string, ...args: any[]) => {
    // No console output in production
    if (isDevelopment) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  },
  
  // For demo mode warnings that should only show in development
  demoMode: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.warn(`[DEMO MODE] ${message}`, ...args)
    }
  }
}

export default logger
