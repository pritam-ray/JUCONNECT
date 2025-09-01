import { Link } from 'react-router-dom'
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, Menu, X, User, LogOut, Upload, Settings, FileText, Shield, Sparkles, Mail, Users, Bell, Search } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/cn'
import { appState } from '../../utils/appState'
import AuthModal from '../ui/AuthModal'
import AdminPanel from '../admin/AdminPanel'
import Button from '../ui/Button'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const { user, profile, isGuest, signOut, debugAuthState } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Get unread message count with rate limiting
  const { totalUnreadCount } = usePrivateMessages(user?.id || null)

  // Debug auth state changes
  useEffect(() => {
    console.log('🔍 Navbar: Auth state changed')
    debugAuthState()
  }, [user, isGuest, debugAuthState])

  const isActive = (path: string) => location.pathname === path

  const navigation = [
    { name: 'Browse', href: '/', icon: BookOpen, shortName: 'Home' },
    { name: 'Categories', href: '/categories', icon: FileText, shortName: 'Cat' },
    { name: 'Groups', href: '/groups', icon: Users, shortName: 'Groups' },
    { name: 'Upload', href: '/upload', icon: Upload, shortName: 'Upload' },
    { name: 'Requests', href: '/my-requests', icon: Settings, shortName: 'Req' },
  ]

  const handleSignOut = async () => {
    try {
      setIsOpen(false)
      console.log('🚪 User initiated sign out')
      await signOut()
    } catch (error) {
      console.error('Error during sign out:', error)
      setIsOpen(false)
    }
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
      <nav className="glass-card sticky top-0 z-40 border-b border-white/30 backdrop-blur-2xl bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20">
            {/* Logo and Desktop Navigation */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center space-x-3 sm:space-x-4 group">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary-400 to-primary-600 rounded-2xl opacity-20 animate-pulse" />
                  <BookOpen className="relative h-8 w-8 sm:h-10 sm:w-10 text-primary-600 group-hover:scale-110 transition-all duration-500 p-1" />
                  <div className="absolute inset-0 bg-primary-500 rounded-2xl blur-xl opacity-0 group-hover:opacity-40 transition-all duration-500" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display font-bold text-xl sm:text-2xl text-gradient animate-gradient-text hidden xs:block">
                    JU CONNECT
                  </span>
                  <span className="font-display font-bold text-xl sm:text-2xl text-gradient animate-gradient-text xs:hidden">
                    JU
                  </span>
                  <span className="text-xs text-secondary-500 font-medium hidden sm:block">Premium Education Hub</span>
                </div>
                <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent-500 animate-bounce-subtle" />
              </Link>
              
              {/* Desktop Navigation */}
              <div className="hidden lg:ml-12 lg:flex lg:space-x-2">
                {navigation.map((item) => {
                  const requiresAuth = ['/upload', '/my-requests', '/groups', '/chat'].includes(item.href)
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={(e) => handleNavClick(e, requiresAuth)}
                      className={cn(
                        'relative px-5 xl:px-7 py-3 rounded-2xl text-sm font-semibold transition-all duration-500 flex items-center space-x-3 group overflow-hidden hover:scale-105 active:scale-95',
                        isActive(item.href)
                          ? 'text-white bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 shadow-xl shadow-primary-500/50'
                          : 'text-secondary-700 hover:text-primary-600 hover:bg-white/70 backdrop-blur-lg'
                      )}
                    >
                      {isActive(item.href) && (
                        <>
                          <div className="absolute inset-0 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-800 rounded-2xl animate-pulse opacity-30" />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 -translate-x-full animate-shimmer" />
                        </>
                      )}
                      <item.icon className={cn(
                        'h-5 w-5 transition-all duration-500',
                        isActive(item.href) 
                          ? 'text-white drop-shadow-lg' 
                          : 'text-secondary-500 group-hover:text-primary-500 group-hover:scale-110'
                      )} />
                      <span className="relative z-10 hidden xl:block">{item.name}</span>
                      <span className="relative z-10 xl:hidden">{item.shortName}</span>
                      
                      {/* Auth required indicator */}
                      {requiresAuth && (!user || isGuest) && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full animate-pulse shadow-lg" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Desktop Auth Section */}
            <div className="hidden md:flex md:items-center md:space-x-4">
              {isGuest ? (
                <div className="flex items-center space-x-4">
                  <div className="glass px-4 py-2 rounded-2xl border border-white/50">
                    <span className="text-sm text-secondary-600 font-medium">
                      👋 Browsing as Guest
                    </span>
                  </div>
                  <Button size="sm" variant="premium" onClick={() => setShowAuthModal(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </div>
              ) : user && profile ? (
                <div className="flex items-center space-x-3">
                  {/* Messages Button */}
                  <button
                    onClick={() => navigate('/chat?tab=private')}
                    className="relative p-3 text-secondary-600 hover:text-primary-600 rounded-2xl hover:bg-white/60 transition-all duration-500 hover:scale-110 active:scale-95 backdrop-blur-lg"
                    title="Messages"
                  >
                    <Mail className="h-5 w-5" />
                    {totalUnreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-br from-red-400 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse shadow-lg">
                        {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                      </div>
                    )}
                  </button>
                  
                  {/* Admin Panel Button */}
                  {profile.is_admin && (
                    <button
                      onClick={() => setShowAdminPanel(true)}
                      className="p-3 text-secondary-600 hover:text-primary-600 rounded-2xl hover:bg-white/60 transition-all duration-500 hover:scale-110 active:scale-95 backdrop-blur-lg"
                      title="Admin Panel"
                    >
                      <Shield className="h-5 w-5" />
                    </button>
                  )}
                  
                  <div className="flex items-center space-x-3 px-5 py-3 glass-card border border-white/60">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <div className="status-online absolute -bottom-1 -right-1" />
                    </div>
                    <Link 
                      to={`/profile/${user.id}`}
                      className="flex flex-col hover:text-primary-600 transition-all duration-300 group"
                    >
                      <span className="text-sm font-semibold text-secondary-700 group-hover:text-primary-600">@{profile.username}</span>
                      {profile.is_admin && (
                        <span className="text-xs text-primary-600 font-medium flex items-center">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </span>
                      )}
                    </Link>
                  </div>
                  
                  <button
                    onClick={handleSignOut}
                    className="p-3 text-secondary-600 hover:text-red-600 rounded-2xl hover:bg-red-50/80 transition-all duration-500 hover:scale-110 active:scale-95 backdrop-blur-lg"
                    title="Sign Out"
                  >
                    <LogOut className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-secondary-600 hidden xl:block">👋 Guest</span>
                  <Button size="sm" variant="premium" onClick={() => setShowAuthModal(true)}>
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="lg:hidden flex items-center">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-3 rounded-2xl text-secondary-600 hover:text-primary-600 hover:bg-white/60 transition-all duration-500 hover:scale-110 active:scale-95 backdrop-blur-lg"
                aria-label={isOpen ? 'Close menu' : 'Open menu'}
              >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden border-t border-white/30 glass-card backdrop-blur-2xl bg-white/70 animate-fade-in-down">
            <div className="px-6 pt-6 pb-8 space-y-4">
              {navigation.map((item) => {
                const requiresAuth = ['/upload', '/my-requests', '/groups', '/chat'].includes(item.href)
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={(e) => handleNavClick(e, requiresAuth)}
                    className={cn(
                      'flex items-center space-x-4 px-6 py-4 rounded-2xl text-base font-semibold transition-all duration-500 group hover:scale-105 active:scale-95',
                      isActive(item.href)
                        ? 'text-white bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700 shadow-xl shadow-primary-500/40'
                        : 'text-secondary-700 hover:text-primary-600 hover:bg-white/80'
                    )}
                  >
                    <div className="relative">
                      <item.icon className={cn(
                        'h-6 w-6 transition-all duration-500',
                        isActive(item.href) 
                          ? 'text-white drop-shadow-lg' 
                          : 'text-secondary-500 group-hover:text-primary-500 group-hover:scale-110'
                      )} />
                      {isActive(item.href) && (
                        <div className="absolute inset-0 bg-white/30 rounded-full blur-sm animate-pulse" />
                      )}
                    </div>
                    <span className="relative z-10">{item.name}</span>
                    
                    {/* Auth required indicator */}
                    {requiresAuth && (!user || isGuest) && (
                      <div className="ml-auto w-3 h-3 bg-gradient-to-br from-accent-400 to-accent-600 rounded-full animate-pulse shadow-lg" />
                    )}
                  </Link>
                )
              })}
              
              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-white/30">
                {isGuest ? (
                  <div className="space-y-4">
                    <div className="glass px-4 py-3 rounded-2xl border border-white/50 text-center">
                      <span className="text-sm text-secondary-600 font-medium">
                        👋 Browsing as Guest
                      </span>
                    </div>
                    <Button 
                      variant="premium" 
                      className="w-full"
                      onClick={() => setShowAuthModal(true)}
                    >
                      <User className="h-5 w-5 mr-2" />
                      Sign In
                    </Button>
                  </div>
                ) : user && profile ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 px-6 py-4 glass-card border border-white/60">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div className="status-online absolute -bottom-1 -right-1" />
                      </div>
                      <div className="flex-1">
                        <p className="text-base font-semibold text-secondary-700">@{profile.username}</p>
                        {profile.is_admin && (
                          <p className="text-sm text-primary-600 font-medium flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => navigate('/chat?tab=private')}
                        className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-secondary-700 hover:text-primary-600 hover:bg-white/80 transition-all duration-500 hover:scale-105 active:scale-95 relative"
                      >
                        <Mail className="h-5 w-5" />
                        <span className="text-sm font-medium">Messages</span>
                        {totalUnreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-gradient-to-br from-red-400 to-red-600 text-white text-xs rounded-full flex items-center justify-center px-1 animate-pulse shadow-lg">
                            {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                          </div>
                        )}
                      </button>
                      
                      {profile.is_admin && (
                        <button
                          onClick={() => setShowAdminPanel(true)}
                          className="flex items-center justify-center space-x-2 px-4 py-3 rounded-2xl text-secondary-700 hover:text-primary-600 hover:bg-white/80 transition-all duration-500 hover:scale-105 active:scale-95"
                        >
                          <Shield className="h-5 w-5" />
                          <span className="text-sm font-medium">Admin</span>
                        </button>
                      )}
                    </div>
                    
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-2xl text-red-600 hover:text-red-700 hover:bg-red-50/80 transition-all duration-500 hover:scale-105 active:scale-95"
                    >
                      <LogOut className="h-5 w-5" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <Button 
                    variant="premium" 
                    className="w-full"
                    onClick={() => setShowAuthModal(true)}
                  >
                    <User className="h-5 w-5 mr-2" />
                    Sign In
                  </Button>
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
