import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, Upload, Mail, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'

interface MobileBottomNavProps {
  onAuthRequired: () => void
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onAuthRequired }) => {
  const { user, isGuest } = useAuth()
  const location = useLocation()

  // Get unread message count
  const { totalUnreadCount } = usePrivateMessages(user?.id || null)

  const isActive = (path: string) => {
    // Special handling for chat routes
    if (path === '/chat') {
      return location.pathname === '/chat'
    }
    return location.pathname === path
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home, requiresAuth: false },
    { name: 'Categories', href: '/categories', icon: FileText, requiresAuth: false },
    { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true },
    { name: 'Messages', href: '/chat', icon: Mail, requiresAuth: true },
    { name: 'Groups', href: '/groups', icon: Users, requiresAuth: true }
  ]

  const handleNavClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    if (item.requiresAuth && (!user || isGuest)) {
      e.preventDefault()
      onAuthRequired()
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-sm border-t border-secondary-200/50 shadow-lg">
        <div className="flex items-center justify-around py-3 px-2 relative">
          {navigation.map((item, index) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-300 relative group min-w-0 flex-1',
                isActive(item.href) 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-secondary-500 hover:text-primary-500 hover:bg-secondary-50',
                // Hide the middle item (Groups) to make space for the floating button
                index === 2 ? 'opacity-0 pointer-events-none' : ''
              )}
              aria-label={item.name}
            >
              <div className="relative mb-1">
                <item.icon className={cn(
                  'h-5 w-5 transition-all duration-300',
                  isActive(item.href) 
                    ? 'scale-110' 
                    : 'group-hover:scale-110'
                )} />
                
                {/* Unread message badge for Messages tab */}
                {item.name === 'Messages' && totalUnreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </div>
                )}
                
                {/* Auth required indicator */}
                {item.requiresAuth && (!user || isGuest) && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full animate-pulse border border-white" />
                )}
              </div>
              
              <span className={cn(
                'text-xs font-medium transition-all duration-300 text-center truncate',
                item.name.length > 8 ? 'text-2xs' : 'text-xs'
              )}>
                {item.name}
              </span>
            </Link>
          ))}
          
          {/* Central Floating Action Button */}
          <Link
            to="/upload"
            onClick={(e) => handleNavClick(e, { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true })}
            className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/4 z-10"
          >
            <div className="w-14 h-14 bg-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-600 transition-all duration-300 hover:scale-110 active:scale-95">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <Upload className="text-red-500 w-5 h-5" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}

export default MobileBottomNav