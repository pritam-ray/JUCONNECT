import React from 'react'
import { Wifi, WifiOff, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ConnectionStatusProps {
  isConnected: boolean
  reconnectAttempts?: number
  lastError?: Error
  onRetry?: () => void
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  reconnectAttempts = 0,
  lastError,
  onRetry,
  className,
  showText = true,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  const getStatusInfo = () => {
    if (isConnected) {
      return {
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        text: 'Connected',
        description: 'Real-time updates active'
      }
    }

    if (reconnectAttempts > 0) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        text: 'Reconnecting...',
        description: `Attempt ${reconnectAttempts}/5`
      }
    }

    return {
      icon: WifiOff,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      text: 'Disconnected',
      description: lastError?.message || 'Connection lost'
    }
  }

  const status = getStatusInfo()
  const Icon = status.icon

  if (!showText) {
    return (
      <div className={cn('flex items-center', className)}>
        <Icon className={cn(sizeClasses[size], status.color)} />
      </div>
    )
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-200',
      status.bgColor,
      status.borderColor,
      className
    )}>
      <Icon className={cn(sizeClasses[size], status.color)} />
      <div className="flex-1 min-w-0">
        <div className={cn('font-medium', status.color, textSizeClasses[size])}>
          {status.text}
        </div>
        {status.description && (
          <div className={cn('text-gray-600 truncate', textSizeClasses[size])}>
            {status.description}
          </div>
        )}
      </div>
      {!isConnected && onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'px-2 py-1 rounded text-white font-medium transition-colors hover:opacity-80',
            reconnectAttempts > 0 ? 'bg-yellow-500' : 'bg-red-500',
            textSizeClasses[size]
          )}
        >
          Retry
        </button>
      )}
    </div>
  )
}

export default ConnectionStatus