/**
 * Safety wrapper to prevent application crashes
 * This file provides utilities to handle common crash scenarios
 */

// Prevent unhandled promise rejections from crashing the app
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  
  // Check if it's a critical error
  if (event.reason?.message?.includes('infinite recursion') ||
      event.reason?.message?.includes('Maximum call stack') ||
      event.reason?.message?.includes('out of memory')) {
    console.error('CRITICAL ERROR PREVENTED:', event.reason.message)
    
    // Show user-friendly message
    const errorDiv = document.createElement('div')
    errorDiv.innerHTML = `
      <div style="position: fixed; top: 20px; right: 20px; background: #ef4444; color: white; padding: 16px; border-radius: 8px; z-index: 9999; max-width: 300px;">
        <h4 style="margin: 0 0 8px 0; font-weight: bold;">Critical Error Detected</h4>
        <p style="margin: 0 0 8px 0; font-size: 14px;">The app prevented a potential crash. Please reload the page.</p>
        <button onclick="window.location.reload()" style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
          Reload
        </button>
      </div>
    `
    document.body.appendChild(errorDiv)
    
    // Auto-reload after 10 seconds
    setTimeout(() => {
      window.location.reload()
    }, 10000)
  }
  
  // Prevent the default unhandled rejection behavior
  event.preventDefault()
})

// Prevent uncaught errors from crashing the app
window.addEventListener('error', (event) => {
  console.error('Uncaught error:', event.error)
  
  // Check if it's a critical error
  if (event.error?.message?.includes('infinite recursion') ||
      event.error?.message?.includes('Maximum call stack') ||
      event.error?.message?.includes('out of memory')) {
    console.error('CRITICAL ERROR CAUGHT:', event.error.message)
    event.preventDefault()
  }
})

// Memory usage monitoring (development only)
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory
      const used = Math.round(memory.usedJSHeapSize / 1048576)
      const total = Math.round(memory.totalJSHeapSize / 1048576)
      
      if (used > 100) { // Over 100MB
        console.warn('High memory usage detected:', { used, total, unit: 'MB' })
      }
    }
  }, 30000) // Check every 30 seconds
}

export const safeguards = {
  initialized: true
}
