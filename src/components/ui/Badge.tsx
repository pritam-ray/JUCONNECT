import React from 'react'
import { cn } from '../../utils/cn'

interface BadgeProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'premium'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
  glow?: boolean
  pulse?: boolean
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'sm',
  children,
  className,
  glow = false,
  pulse = false
}) => {
  const baseClasses = 'inline-flex items-center font-semibold rounded-full transition-all duration-300'
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30',
    secondary: 'bg-gradient-to-r from-secondary-100 to-secondary-200 text-secondary-700 border border-secondary-300',
    success: 'bg-gradient-to-r from-success-500 to-success-600 text-white shadow-lg shadow-success-500/30',
    warning: 'bg-gradient-to-r from-accent-500 to-accent-600 text-white shadow-lg shadow-accent-500/30',
    error: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30',
    neutral: 'bg-gradient-to-r from-secondary-200 to-secondary-300 text-secondary-700',
    premium: 'bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white shadow-xl shadow-primary-500/40 border border-primary-400/50',
  }
  
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }

  const glowClasses = glow ? 'animate-pulse-glow' : ''
  const pulseClasses = pulse ? 'animate-pulse' : ''

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        glowClasses,
        pulseClasses,
        className
      )}
    >
      {children}
    </span>
  )
}

export default Badge