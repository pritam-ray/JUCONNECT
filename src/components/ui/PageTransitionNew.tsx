import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

interface PageTransitionProps {
  children: React.ReactNode
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const location = useLocation()

  useEffect(() => {
    // Start loading transition
    setLoading(true)
    setIsVisible(false)
    
    // Scroll to top immediately when route changes
    window.scrollTo({ top: 0, behavior: 'instant' })
    
    // Short loading sequence
    const timer = setTimeout(() => {
      setLoading(false)
      // Small delay before showing content for smooth transition
      setTimeout(() => {
        setIsVisible(true)
      }, 50)
    }, 300) // Reduced from 800ms to 300ms

    return () => clearTimeout(timer)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div 
      key={location.pathname} 
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
      }`}
    >
      {children}
    </div>
  )
}

export default PageTransition
