import { Link } from 'react-router-dom'
import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Menu, X, User, LogOut, Upload, Settings, FileText, Shield, Sparkles, Mail, Users } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'
import AuthModal from '../ui/AuthModal'
import AdminPanel from '../admin/AdminPanel'
import Button from '../ui/Button'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const { user, profile, isGuest, signInAsGuest, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Get unread message count
  const { totalUnreadCount } = usePrivateMessages(user?.id || null)

  const isActive = (path: string) => location.pathname === path

  const navigation = [
    { name: 'Browse', href: '/', icon: BookOpen },
    { name: 'Categories', href: '/categories', icon: FileText },
    { name: 'Groups', href: '/groups', icon: Users },
    { name: 'Upload', href: '/upload', icon: Upload },
    { name: 'Requests', href: '/my-requests', icon: Settings },
  ]

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  const handleGuestSignIn = () => {
    signInAsGuest()
    setIsOpen(false)
  }

  const handleNavClick = (e: React.MouseEvent, requiresAuth: boolean = false) => {
    // Close mobile menu first
    setIsOpen(false)
    
    if (requiresAuth && (!user || isGuest)) {
      e.preventDefault()
      setShowAuthModal(true)
      return
    }
    
    // Allow normal navigation to proceed
  }

  return (
    <>
      <nav className="glass sticky top-0 z-40 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3 group">
                <div className="relative">
                  <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 group-hover:scale-110 transition-transform duration-300" />
                  <div className="absolute inset-0 bg-primary-500 rounded-full blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
                </div>
                <span className="font-display font-bold text-lg sm:text-xl text-gradient animate-gradient-text hidden xs:block">
                  JU CONNECT
                </span>
                <span className="font-display font-bold text-lg sm:text-xl text-gradient animate-gradient-text xs:hidden">
                  JU
                </span>
                <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-accent-500 animate-bounce-subtle" />
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:ml-8 lg:flex lg:space-x-2">
                {navigation.map((item) => {
                  const requiresAuth = ['/upload', '/my-requests'].includes(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={(e) => handleNavClick(e, requiresAuth)}
                      className={cn(
                        'px-3 xl:px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 flex items-center space-x-2 group relative overflow-hidden',
                        isActive(item.href)
                          ? 'text-white bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30'
                          : 'text-secondary-600 hover:text-primary-600 hover:bg-white/50'
                      )}
                    >
                      <item.icon className={cn(
                        'h-4 w-4 transition-transform duration-300',
                        isActive(item.href) ? 'scale-110' : 'group-hover:scale-110'
                      )} />
                      <span className="hidden xl:block">{item.name}</span>
                      
                      {/* Shimmer effect */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 -translate-x-full transition-transform duration-700 group-hover:translate-x-full" />
                      
                      {/* Auth required indicator */}
                      {requiresAuth && (!user || isGuest) && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {isGuest ? (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-secondary-600 px-3 py-1 bg-secondary-100 rounded-full">
                    👋 Browsing as Guest
                  </span>
                  <Button size="sm" variant="premium" onClick={() => setShowAuthModal(true)}>
                    Sign In
                  </Button>
                </div>
              ) : user && profile ? (
                <div className="flex items-center space-x-3">
                  {/* Messages Button */}
                  <button
                    onClick={() => navigate('/chat?tab=private')}
                    className="relative p-3 text-secondary-600 hover:text-primary-600 rounded-xl hover:bg-white/50 transition-all duration-300 hover:scale-110"
                    title="Messages"
                  >
                    <Mail className="h-5 w-5" />
                    {totalUnreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </div>
                    )}
                  </button>
                  
                  {/* Admin Panel Button */}
                  {profile.is_admin && (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="p-3 text-secondary-600 hover:text-primary-600 rounded-xl hover:bg-white/50 transition-all duration-300 hover:scale-110"
                      title="Admin Panel"
                    >
                      <Shield className="h-5 w-5" />
                    </button>
                  )}
                  
                  <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-white/80 to-white/60 rounded-2xl border border-white/50 backdrop-blur-sm">
                    <div className="relative">
                      <User className="h-5 w-5 text-secondary-600" />
                      <div className="status-online absolute -bottom-1 -right-1" />
                    </div>
                    <Link 
                      to={`/profile/${user.id}`}
                      className="flex flex-col hover:text-primary-600 transition-colors duration-300"
                    >
                      <span className="text-sm font-semibold text-secondary-700 hover:text-primary-600">@{profile.username}</span>
                      {profile.is_admin && (
                        <span className="text-xs text-primary-600 font-medium">Admin</span>
                      )}
                    </Link>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="p-3 text-secondary-600 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-300 hover:scale-110"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button variant="ghost" onClick={handleGuestSignIn}>
                    Browse as Guest
                  </Button>
                  <Button size="sm" variant="premium" onClick={() => setShowAuthModal(true)}>
                    Sign In
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-2 rounded-xl text-secondary-600 hover:text-primary-600 hover:bg-white/50 transition-all duration-300"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
              >
                {isOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden border-t border-white/20 bg-white/95 backdrop-blur-xl animate-fade-in-down">
            <div className="px-4 pt-4 pb-6 space-y-3">
              {navigation.map((item) => {
                const requiresAuth = ['/upload', '/my-requests'].includes(item.href)
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => handleNavClick(e, requiresAuth)}
                    className={cn(
                      'flex items-center space-x-3 px-4 py-3 rounded-xl text-base font-semibold transition-all duration-300 relative overflow-hidden',
                      isActive(item.href)
                        ? 'text-white bg-gradient-to-r from-primary-500 to-primary-600 shadow-lg shadow-primary-500/30'
                        : 'text-secondary-600 hover:text-primary-600 hover:bg-white/50'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                    
                    {requiresAuth && (!user || isGuest) && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-accent-500 rounded-full animate-pulse" />
                      </div>
                    )}
                  </Link>
                )
              })}
              
              {/* Mobile Auth Section */}
              <div className="border-t border-secondary-200 pt-4 mt-4">
                {isGuest ? (
                  <div className="space-y-3">
                    <div className="px-4 py-2 text-sm text-secondary-600 bg-secondary-100 rounded-xl">
                      👋 Browsing as Guest
                    </div>
                    <Button
                      className="w-full"
                      variant="premium"
                      onClick={() => {
                        setShowAuthModal(true)
                        setIsOpen(false)
                      }}
                    >
                      Sign In
                    </Button>
                  </div>
                ) : user && profile ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 px-4 py-3 bg-gradient-to-r from-white/80 to-white/60 rounded-xl border border-white/50">
                      <div className="relative">
                        <User className="h-6 w-6 text-secondary-600" />
                        <div className="status-online absolute -bottom-1 -right-1" />
                      </div>
                      <Link 
                        to={`/profile/${user.id}`}
                        className="flex flex-col hover:text-primary-600 transition-colors duration-300"
                        onClick={() => setIsOpen(false)}
                      >
                        <span className="text-base font-semibold text-secondary-700 hover:text-primary-600">@{profile.username}</span>
                        {profile.is_admin && (
                          <span className="text-sm text-primary-600 font-medium">Admin</span>
                        )}
                      </Link>
                    </div>
                    
                    {/* Real-time messaging removed for better performance */}
                    
                    {profile.is_admin && (
                      <button
                        onClick={() => {
                          setShowAdminPanel(true)
                          setIsOpen(false)
                        }}
                        className="w-full flex items-center space-x-3 px-4 py-3 text-base font-semibold text-secondary-600 hover:bg-white/50 rounded-xl transition-all duration-300"
                      >
                        <Shield className="h-5 w-5" />
                        <span>Admin Panel</span>
                      </button>
                    )}
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-base font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300"
                    >
                      <LogOut className="h-5 w-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={handleGuestSignIn}
                    >
                      Browse as Guest
                    </Button>
                    <Button
                      className="w-full"
                      variant="premium"
                      onClick={() => {
                        setShowAuthModal(true)
                        setIsOpen(false)
                      }}
                    >
                      Sign In
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
      
      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
      
      {profile?.is_admin && (
        <AdminPanel
          isOpen={showAdminPanel}
          onClose={() => setShowAdminPanel(false)}
        />
      )}
    </>
  )
}

export default Navbar