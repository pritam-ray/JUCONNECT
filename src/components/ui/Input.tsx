import React from 'react'
import { cn } from '../../utils/cn'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helpText?: string
  icon?: React.ReactNode
  premium?: boolean
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  helpText,
  className,
  id,
  icon,
  premium = false,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2)}`

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-semibold text-secondary-700"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-secondary-400">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            premium ? 'input-premium' : 'block w-full rounded-xl border border-secondary-200 px-4 py-3 text-secondary-900 placeholder-secondary-400',
            'transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:bg-secondary-50 disabled:text-secondary-500',
            error && 'border-red-300 focus:border-red-500 focus:ring-red-500',
            icon && 'pl-10',
            premium && 'shadow-lg shadow-primary-500/10 hover:shadow-primary-500/20',
            className
          )}
          {...props}
        />
        
        {/* Focus glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/20 to-primary-600/20 opacity-0 transition-opacity duration-300 pointer-events-none focus-within:opacity-100" />
      </div>
      
      {error && (
        <p className="text-sm text-red-600 flex items-center space-x-1 animate-fade-in">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      
      {helpText && !error && (
        <p className="text-sm text-secondary-500">{helpText}</p>
      )}
    </div>
  )
}

export default Input