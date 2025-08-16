import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, FileText, MessageCircle, Upload, Settings, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'

interface MobileBottomNavProps {
  onAuthRequired: () => void
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onAuthRequired }) => {
  const { user, isGuest } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navigation = [
    { name: 'Browse', href: '/', icon: BookOpen, requiresAuth: false },
    { name: 'Categories', href: '/categories', icon: FileText, requiresAuth: false },
    { name: 'Chat', href: '/chat', icon: MessageCircle, requiresAuth: false },
    { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true },
    { name: 'Requests', href: '/my-requests', icon: Settings, requiresAuth: true },
  ]

  const handleNavClick = (item: typeof navigation[0], e: React.MouseEvent) => {
    if (item.requiresAuth && (!user || isGuest)) {
      e.preventDefault()
      onAuthRequired()
    }
  }

  return (
    <div className="mobile-nav md:hidden">
      <div className="flex items-center justify-around py-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={(e) => handleNavClick(item, e)}
            className={cn(
              'mobile-nav-item relative group',
              isActive(item.href) && 'active'
            )}
          >
            <div className="relative">
              <item.icon className={cn(
                'h-6 w-6 transition-all duration-300',
                isActive(item.href) 
                  ? 'text-primary-600 scale-110' 
                  : 'text-secondary-500 group-hover:text-primary-500 group-hover:scale-110'
              )} />
              
              {/* Active indicator */}
              {isActive(item.href) && (
                <div className="absolute -top-1 -inset-x-1 h-1 bg-gradient-to-r from-primary-500 to-primary-600 rounded-full animate-scale-in" />
              )}
              
              {/* Auth required indicator */}
              {item.requiresAuth && (!user || isGuest) && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
              )}
            </div>
            
            <span className={cn(
              'text-xs font-medium transition-all duration-300',
              isActive(item.href) 
                ? 'text-primary-600' 
                : 'text-secondary-500 group-hover:text-primary-500'
            )}>
              {item.name}
            </span>
            
            {/* Ripple effect */}
            <div className="absolute inset-0 rounded-lg bg-primary-500/10 scale-0 group-active:scale-100 transition-transform duration-200" />
          </Link>
        ))}
      </div>
      
      {/* Floating Action Button for Upload */}
      <Link
        to="/upload"
        onClick={(e) => {
          if (!user || isGuest) {
            e.preventDefault()
            onAuthRequired()
          }
        }}
        className="fab group"
      >
        <Plus className="h-6 w-6 transition-transform duration-300 group-hover:rotate-90" />
        
        {/* Pulse rings */}
        <div className="absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20" />
        <div className="absolute inset-0 rounded-full bg-primary-500 animate-pulse opacity-30" />
      </Link>
    </div>
  )
}

export default MobileBottomNav