import React from 'react'
import { cn } from '../../utils/cn'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  variant?: 'primary' | 'secondary' | 'white'
  text?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className,
  variant = 'primary',
  text
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  }

  const variantClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
  }

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
      <div className="relative">
        {/* Outer ring */}
        <svg
          className={cn('animate-spin', sizeClasses[size], variantClasses[variant])}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        
        {/* Inner glow effect */}
        <div className={cn(
          'absolute inset-0 rounded-full animate-pulse',
          size === 'xl' ? 'shadow-glow' : ''
        )} />
      </div>
      
      {text && (
        <p className={cn(
          'text-sm font-medium animate-pulse',
          variantClasses[variant]
        )}>
          {text}
        </p>
      )}
    </div>
  )
}

export default LoadingSpinner