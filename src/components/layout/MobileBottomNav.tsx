import { MessageSquare, Wifi, WifiOff } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, FileText, MessageCircle, Upload, Settings } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'
import RealtimePrivateMessages from '../messaging/RealtimePrivateMessages'
import { usePrivateMessages } from '../../hooks/useRealtime'

interface MobileBottomNavProps {
  onAuthRequired: () => void
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onAuthRequired }) => {
  const { user, isGuest } = useAuth()
  const location = useLocation()
  const [showMessagesModal, setShowMessagesModal] = React.useState(false)
  
  // Get connection status for messages
  const { connectionStatus } = usePrivateMessages({
    autoConnect: user && !isGuest,
    onError: (error) => console.error('Mobile nav messages error:', error)
  })
  

  const isActive = (path: string) => location.pathname === path

  const navigation = [
    { name: 'Home', href: '/', icon: Home, requiresAuth: false },
    { name: 'Categories', href: '/categories', icon: FileText, requiresAuth: false },
    { name: 'Chat', href: '/chat', icon: MessageCircle, requiresAuth: false },
    { name: 'Upload', href: '/upload', icon: Upload, requiresAuth: true },
    { name: 'My Requests', href: '/my-requests', icon: Settings, requiresAuth: true },
  ]

  const handleNavClick = (e: React.MouseEvent, item: typeof navigation[0]) => {
    if (item.requiresAuth && (!user || isGuest)) {
      e.preventDefault()
      onAuthRequired()
      return false
    }
    return true
  }

  const handleMessagesClick = () => {
    if (!user || isGuest) {
      onAuthRequired()
    } else {
      setShowMessagesModal(true)
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-sm border-t border-secondary-200/50 shadow-lg">
        {/* Messages Button - Top Left */}
        {user && !isGuest && (
          <button
            onClick={handleMessagesClick}
            className="absolute -top-12 left-4 w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all duration-300 z-10 group"
            aria-label="Open private messages"
          >
            <div className="relative">
              <MessageSquare className="h-6 w-6 text-white" />
              {/* Connection status indicator */}
              <div className="absolute -bottom-1 -right-1">
                {connectionStatus.isConnected ? (
                  <Wifi className="h-3 w-3 text-green-400" />
                ) : (
                  <WifiOff className="h-3 w-3 text-red-400" />
                )}
              </div>
            </div>
            {/* Notification dot for unread messages */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent-500 rounded-full border-2 border-white animate-pulse" />
          </button>
        )}
        
        <div className="flex items-center justify-around py-3 px-2">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={(e) => handleNavClick(e, item)}
            className={cn(
              'flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-300 relative group min-w-0 flex-1',
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
      
      {/* Private Messages Modal */}
      <RealtimePrivateMessages
        isOpen={showMessagesModal}
        onClose={() => setShowMessagesModal(false)}
      />
    </>
  )
}

export default MobileBottomNav