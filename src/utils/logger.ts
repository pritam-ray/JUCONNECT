/**
 * Logger utility that completely disables console output in production
 * NO console output will be shown in production builds
 */

const isDevelopment = import.meta.env.DEV

// Completely disable ALL console output in production
if (!isDevelopment) {
  const noop = () => {}
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
    timeStamp: noop,
    exception: noop
  }
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
