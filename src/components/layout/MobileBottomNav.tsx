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
    if (path === '/chat?tab=private') {
      return location.pathname === '/chat' && location.search.includes('tab=private')
    }
    return location.pathname === path
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home, requiresAuth: false },
    { name: 'Categories', href: '/categories', icon: FileText, requiresAuth: false },
    { name: 'Groups', href: '/groups', icon: Users, requiresAuth: true },
    { name: 'Messages', href: '/chat?tab=private', icon: Mail, requiresAuth: true },
    { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true }
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
        <div className="flex items-center justify-around py-3 px-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                'flex flex-col items-center justify-center py-2 px-2 rounded-xl transition-all duration-300 relative group min-w-0 flex-1',
                isActive(item.href) 
                  ? 'text-primary-600 bg-primary-50' 
                  : 'text-secondary-500 hover:text-primary-500 hover:bg-secondary-50'
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
        </div>
      </div>
    </>
  )
}

export default MobileBottomNav