import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  premium?: boolean
  blur?: boolean
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  premium = true,
  blur = true
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md mx-4',
    md: 'max-w-lg mx-4',
    lg: 'max-w-2xl mx-4',
    xl: 'max-w-4xl mx-4',
    full: 'max-w-7xl mx-4',
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto animate-fade-in">
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 transition-all duration-300',
            blur ? 'backdrop-blur-sm bg-black/50' : 'bg-black/50'
          )}
          onClick={onClose}
        />
        
        {/* Modal */}
        <div
          className={cn(
            'relative w-full transform transition-all duration-300 animate-scale-in max-h-[90vh] overflow-y-auto',
            premium ? 'modal-premium' : 'bg-white rounded-2xl shadow-2xl',
            sizeClasses[size]
          )}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between border-b border-secondary-200/50 px-4 md:px-6 py-4">
              <h3 className="text-lg md:text-xl font-bold text-secondary-900 text-gradient">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-all duration-200 hover:scale-110"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )}
          
          {/* Close button when no title */}
          {!title && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-xl p-2 text-secondary-400 hover:bg-secondary-100 hover:text-secondary-600 transition-all duration-200 hover:scale-110"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          
          {/* Content */}
          <div className={cn('px-4 md:px-6', title ? 'py-4 md:py-6' : 'py-6 md:py-8')}>
            {children}
          </div>
          
          {/* Decorative gradient border */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-primary-500/20 via-transparent to-primary-500/20 pointer-events-none" />
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Modal