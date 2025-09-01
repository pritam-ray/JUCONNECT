import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, Upload, Mail, Users, Sparkles } from 'lucide-react'
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
    { name: 'Home', href: '/', icon: Home, requiresAuth: false, color: 'from-blue-500 to-blue-600' },
    { name: 'Categories', href: '/categories', icon: FileText, requiresAuth: false, color: 'from-green-500 to-green-600' },
    { name: 'Groups', href: '/groups', icon: Users, requiresAuth: true, color: 'from-purple-500 to-purple-600' },
    { name: 'Messages', href: '/chat', icon: Mail, requiresAuth: true, color: 'from-pink-500 to-pink-600' },
    { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true, color: 'from-primary-500 to-primary-600' }
  ]

  const handleNavClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    if (item.requiresAuth && (!user || isGuest)) {
      e.preventDefault()
      onAuthRequired()
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden mobile-nav-safe-area">
        <div className="flex items-center justify-around px-4 py-3">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={(e) => handleNavClick(e, item)}
              className={cn(
                'flex flex-col items-center justify-center py-3 px-3 rounded-2xl transition-all duration-500 relative group min-w-0 flex-1 hover:scale-110 active:scale-95',
                isActive(item.href) 
                  ? `text-white bg-gradient-to-br ${item.color} shadow-xl shadow-primary-500/40` 
                  : 'text-secondary-600 hover:text-primary-600 hover:bg-white/80 backdrop-blur-lg'
              )}
              aria-label={item.name}
            >
              {isActive(item.href) && (
                <>
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl animate-pulse opacity-20`} />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer rounded-2xl" />
                </>
              )}
              
              <div className="relative mb-2">
                <item.icon className={cn(
                  'h-6 w-6 transition-all duration-500 relative z-10',
                  isActive(item.href) 
                    ? 'text-white drop-shadow-lg scale-110' 
                    : 'group-hover:scale-110'
                )} />
                
                {/* Active indicator glow */}
                {isActive(item.href) && (
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-full blur-md opacity-50 animate-pulse`} />
                )}
                
                {/* Unread message badge for Messages tab */}
                {item.name === 'Messages' && totalUnreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] bg-gradient-to-br from-red-400 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse shadow-lg border-2 border-white">
                    {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                  </div>
                )}
                
                {/* Auth required indicator */}
                {item.requiresAuth && (!user || isGuest) && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full animate-pulse border-2 border-white shadow-lg">
                    <Sparkles className="h-2 w-2 text-white" />
                  </div>
                )}
              </div>
              
              <span className={cn(
                'text-xs font-semibold transition-all duration-500 relative z-10',
                isActive(item.href) 
                  ? 'text-white drop-shadow-sm' 
                  : 'text-secondary-500 group-hover:text-primary-600'
              )}>
                {item.name}
              </span>
              
              {/* Premium shine effect on active */}
              {isActive(item.href) && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-t-2xl" />
              )}
            </Link>
          ))}
        </div>
      </div>
      
      {/* Safe area spacer */}
      <div className="h-20 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
    </>
  )
}

export default MobileBottomNav