/**
 * Logger utility that respects production environment
 * In production, only errors are logged to console
 */

const isDevelopment = import.meta.env.DEV

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
    // Only log errors in development
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
