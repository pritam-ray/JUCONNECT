import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

interface PageTransitionProps {
  children: React.ReactNode
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const location = useLocation()

  useEffect(() => {
    // Start loading transition
    setLoading(true)
    
    // Scroll to top immediately when route changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
    
    // Short loading delay for smooth transition
    const timer = setTimeout(() => {
      setDisplayChildren(children)
      setLoading(false)
    }, 300) // Very short delay for smooth UX

    return () => clearTimeout(timer)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <p className="text-secondary-600 font-medium animate-pulse">
            Loading page...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {displayChildren}
    </div>
  )
}

export default PageTransition