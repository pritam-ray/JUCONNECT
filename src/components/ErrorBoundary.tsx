import { Component, ReactNode } from 'react'
import { logger } from '../utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.setState({ errorInfo })
    
    // Enhanced error handling with specific error type detection
    const errorMessage = error.message
    const isMemoryError = errorMessage.includes('memory') || errorMessage.includes('leak') || errorMessage.includes('Maximum call stack')
    const isAuthError = errorMessage.includes('auth') || errorMessage.includes('session')
    const isDatabaseError = errorMessage.includes('infinite recursion') || 
                           errorMessage.includes('database') || 
                           errorMessage.includes('supabase')
    
    // Log error details
    logger.error('Error caught by boundary:', {
      error: errorMessage,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      isMemoryError,
      isAuthError,
      isDatabaseError,
      timestamp: new Date().toISOString()
    })

    // Log to enhanced error reporting system
    import('../services/enhancedServices').then(({ enhancedErrorReporting }) => {
      enhancedErrorReporting.reportError(error, {
        operation: 'component_render',
        component: 'ErrorBoundary',
        metadata: {
          componentStack: errorInfo.componentStack,
          isMemoryError,
          isAuthError,
          isDatabaseError
        }
      })
    }).catch(reportingError => {
      console.warn('Failed to log to enhanced error reporting:', reportingError)
    })

    // Auto-reload on critical errors
    if (isDatabaseError && errorMessage.includes('infinite recursion')) {
      logger.warn('Infinite recursion detected, auto-reloading in 3 seconds...')
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
    
    // Report critical errors
    if (error.message.includes('infinite recursion') || 
        error.message.includes('Maximum call stack') ||
        error.message.includes('out of memory')) {
      console.error('CRITICAL ERROR:', error.message)
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      const errorMessage = this.state.error?.message || 'Unknown error'
      const isDBError = errorMessage.includes('infinite recursion') || 
                       errorMessage.includes('Database configuration')
      const isMemoryError = errorMessage.includes('Maximum call stack') ||
                           errorMessage.includes('out of memory')

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gray-800">
                  {isDBError ? 'Database Configuration Issue' : 
                   isMemoryError ? 'Performance Issue Detected' :
                   'Application Error'}
                </h3>
              </div>
            </div>
            
            <div className="text-sm text-gray-600 mb-4">
              {isDBError ? (
                <div>
                  <p className="mb-2">There's a database configuration issue that needs to be resolved.</p>
                  <p className="text-xs text-gray-500">This usually relates to database policies that need to be updated.</p>
                </div>
              ) : isMemoryError ? (
                <div>
                  <p className="mb-2">The application encountered a performance issue.</p>
                  <p className="text-xs text-gray-500">This might be due to too many active connections or memory usage.</p>
                </div>
              ) : (
                <div>
                  <p className="mb-2">The application encountered an unexpected error:</p>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-20">
                    {errorMessage}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Reload App
              </button>
              <button
                onClick={() => {
                  // Clear all storage and reload
                  localStorage.clear()
                  sessionStorage.clear()
                  window.location.href = '/'
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                Reset & Reload
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-4">
                <summary className="text-xs text-gray-500 cursor-pointer">Debug Info</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                  {JSON.stringify({ 
                    error: this.state.error?.stack, 
                    componentStack: this.state.errorInfo?.componentStack 
                  }, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
