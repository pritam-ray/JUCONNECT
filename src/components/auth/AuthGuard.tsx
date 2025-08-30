import React from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Lock, UserPlus, LogIn } from 'lucide-react'
import Button from '../ui/Button'

interface AuthGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  pageName?: string
}

const AuthGuard: React.FC<AuthGuardProps> = ({ 
  children, 
  fallback,
  pageName = "this feature"
}) => {
  const { user, isGuest, loading } = useAuth()

  // Show loading state while auth is being determined
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is authenticated and not a guest, show the protected content
  if (user && !isGuest) {
    return <>{children}</>
  }

  // If there's a custom fallback, use it
  if (fallback) {
    return <>{fallback}</>
  }

  // Default authentication required message
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600">
            You need to be logged in to access {pageName}. Please sign in or create an account to continue.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => {
                // Trigger login modal - we'll need to implement this
                const event = new CustomEvent('openAuthModal', { detail: { mode: 'login' } })
                window.dispatchEvent(event)
              }}
              className="flex items-center justify-center space-x-2"
              variant="primary"
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
            
            <Button
              onClick={() => {
                // Trigger signup modal
                const event = new CustomEvent('openAuthModal', { detail: { mode: 'signup' } })
                window.dispatchEvent(event)
              }}
              className="flex items-center justify-center space-x-2"
              variant="outline"
            >
              <UserPlus className="h-4 w-4" />
              <span>Sign Up</span>
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">or</span>
            </div>
          </div>

          <Button
            onClick={() => {
              // Navigate to home page
              window.location.href = '/'
            }}
            variant="ghost"
            className="w-full"
          >
            Return to Home
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            <strong>Available Features for Guests:</strong>
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>• Browse public content</li>
            <li>• View help center</li>
            <li>• Contact support</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default AuthGuard
