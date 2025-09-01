import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, Flag, Trash2, User, MessageCircle, AlertCircle, Users, Search, Plus, ArrowLeft, X } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { reportChatMessage } from '../../services/reportingService'
import { deleteChatMessage, getChatMessages, sendChatMessage } from '../../services/chatService'
import { useRealtimeChatMessages } from '../../hooks/useRealtime'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'
import { searchUsers } from '../../services/privateMessageService'
import AuthModal from '../ui/AuthModal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import MobileChatInterface from './MobileChatInterface'
import { formatDistanceToNow } from 'date-fns'

interface OptimisticChatMessage {
  id: string
  user_id: string | null
  message: string
  is_reported: boolean
  is_flagged?: boolean
  created_at: string
  profiles?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_admin?: boolean
  } | null
  isOptimistic?: boolean
}

interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
}

type ChatMode = 'global' | 'private'

const UnifiedChatInterface: React.FC = () => {
  const { user, profile, isGuest } = useAuth()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const privateInputRef = useRef<HTMLInputElement>(null)
  const globalInputRef = useRef<HTMLInputElement>(null)
  
  // Get initial tab from URL parameters
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') === 'private' ? 'private' : 'global'
  const [chatMode, setChatMode] = useState<ChatMode>(initialTab)
  
  // Check if mobile view
  const [isMobile, setIsMobile] = useState(false)
  
  // Global chat state
  const [globalMessages, setGlobalMessages] = useState<OptimisticChatMessage[]>([])
  const [globalLoading, setGlobalLoading] = useState(true)
  const [globalNewMessage, setGlobalNewMessage] = useState('')
  const [globalSending, setGlobalSending] = useState(false)
  
  // Private chat state
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [privateNewMessage, setPrivateNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  
  // Common state
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Private messages hook
  const {
    conversations,
    currentConversation,
    totalUnreadCount,
    loading: privateLoading,
    sending: privateSending,
    error: privateError,
    loadConversations,
    sendMessage: sendPrivateMessage,
    startNewConversation
  } = usePrivateMessages(user?.id || null)

  // Real-time global message handlers
  const handleNewGlobalMessage = useCallback((message: any) => {
    setGlobalMessages(prevMessages => {
      const optimisticIndex = prevMessages.findIndex(msg => 
        msg.isOptimistic && 
        msg.user_id === message.user_id &&
        msg.message === message.message &&
        Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000
      )
      
      if (optimisticIndex !== -1) {
        const newMessages = [...prevMessages]
        newMessages[optimisticIndex] = message
        return newMessages
      } else {
        const isDuplicate = prevMessages.some(msg => msg.id === message.id)
        if (!isDuplicate) {
          return [...prevMessages, message]
        }
        return prevMessages
      }
    })
  }, [])

  const handleGlobalMessageUpdate = useCallback((updatedMessage: any) => {
    setGlobalMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
      )
    )
  }, [])

  const handleGlobalMessageDelete = useCallback((messageId: string) => {
    setGlobalMessages(prevMessages => 
      prevMessages.filter(msg => msg.id !== messageId)
    )
  }, [])

  // Mobile detection effect
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Scroll to bottom effect - improved to be less aggressive
  useEffect(() => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Debounce the scroll behavior
    scrollTimeoutRef.current = setTimeout(() => {
      // Only scroll if we have messages and the component is mounted
      if ((globalMessages.length > 0 && chatMode === 'global') || 
          (currentConversation && currentConversation.length > 0 && chatMode === 'private')) {
        
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          const element = messagesEndRef.current
          if (element) {
            // Get the scrollable container (messages area)
            const container = element.parentElement
            if (container) {
              const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100
              
              // Only auto-scroll if user is already near the bottom or it's a new conversation
              if (isNearBottom || 
                  (currentConversation && currentConversation.length <= 1) || 
                  (globalMessages.length <= 1)) {
                
                // Scroll within the container only, not the entire page
                container.scrollTo({
                  top: container.scrollHeight,
                  behavior: 'smooth'
                })
              }
            }
          }
        })
      }
    }, 100) // 100ms debounce
    
    // Cleanup timeout on unmount
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [globalMessages.length, currentConversation?.length, chatMode]) // Only depend on message count changes

  // Load initial global messages
  useEffect(() => {
    const loadGlobalMessages = async () => {
      try {
        setGlobalLoading(true)
        const initialMessages = await getChatMessages()
        setGlobalMessages(initialMessages || [])
      } catch (error) {
        console.error('Failed to load global messages:', error)
        setError('Failed to load chat messages')
      } finally {
        setGlobalLoading(false)
      }
    }

    if (!isMobile) {
      loadGlobalMessages()
    }
  }, [isMobile])

  // Periodic refresh for global messages (every 3 seconds) - with scroll preservation
  useEffect(() => {
    if (isMobile || chatMode !== 'global') return

    const refreshInterval = setInterval(async () => {
      try {
        // Store current scroll position
        const messagesContainer = messagesEndRef.current?.parentElement
        const isNearBottom = messagesContainer ? 
          messagesContainer.scrollHeight - messagesContainer.scrollTop - messagesContainer.clientHeight < 100 : false

        const refreshedMessages = await getChatMessages()
        
        // Only update if there are new messages to prevent unnecessary re-renders
        setGlobalMessages(prevMessages => {
          if (JSON.stringify(prevMessages) !== JSON.stringify(refreshedMessages || [])) {
            // If user was near bottom, they'll get auto-scrolled. Otherwise, preserve position.
            if (!isNearBottom && messagesContainer) {
              // Preserve scroll position for users reading older messages
              setTimeout(() => {
                if (messagesContainer) {
                  messagesContainer.scrollTop = messagesContainer.scrollHeight - messagesContainer.clientHeight
                }
              }, 10)
            }
            return refreshedMessages || []
          }
          return prevMessages
        })
      } catch (error) {
        console.error('Failed to refresh global messages:', error)
      }
    }, 3000) // Every 3 seconds

    return () => clearInterval(refreshInterval)
  }, [isMobile, chatMode])

  // Load conversations when switching to private chat mode
  useEffect(() => {
    if (!isMobile && chatMode === 'private' && user?.id && loadConversations) {
      // Force reload conversations to bypass rate limiting when switching modes
      loadConversations(true)
    }
  }, [chatMode, user?.id, isMobile, loadConversations])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error || privateError) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, privateError])

  // Real-time chat messages hook
  useRealtimeChatMessages(
    handleNewGlobalMessage,
    handleGlobalMessageUpdate,
    handleGlobalMessageDelete,
    {
      enabled: !isMobile,
      onError: (error) => {
        console.error('Real-time subscription error:', error)
        setError('Real-time updates unavailable')
      }
    }
  )

  // Function definitions
  const handleSendGlobalMessage = async () => {
    if (!globalNewMessage.trim()) return

    // Debug logging for authentication state
    console.log('🔍 Send Global Message Debug:', {
      hasUser: !!user,
      userId: user?.id,
      isGuest: isGuest,
      userEmail: user?.email,
      profileExists: !!profile
    })

    // Check if user is authenticated - allow all authenticated users to send messages
    if (!user?.id) {
      console.log('❌ No user ID found, showing auth modal')
      setShowAuthModal(true)
      return
    }

    // Additional check: don't allow if explicitly marked as guest AND no valid user
    if (isGuest && !user?.id) {
      console.log('❌ User is guest with no ID, showing auth modal')
      setShowAuthModal(true)
      return
    }

    // Allow authenticated users even if isGuest flag is incorrectly set
    console.log('✅ User authenticated, proceeding to send message')

    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimisticMessage: OptimisticChatMessage = {
      id: tempMessageId,
      user_id: user.id,
      message: globalNewMessage.trim(),
      is_reported: false,
      is_flagged: false,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
        full_name: user.user_metadata?.full_name || user.user_metadata?.username || 'Anonymous User',
        avatar_url: user.user_metadata?.avatar_url || null,
        is_admin: profile?.is_admin || false
      },
      isOptimistic: true
    }

    try {
      setGlobalSending(true)
      setError(null)

      setGlobalMessages(prev => [...prev, optimisticMessage])
      setGlobalNewMessage('')

      await sendChatMessage(optimisticMessage.message, user.id)
      
      // Maintain focus on input after sending
      setTimeout(() => {
        globalInputRef.current?.focus()
      }, 50)
    } catch (error) {
      console.error('Failed to send global message:', error)
      setGlobalMessages(prev => prev.filter(msg => msg.id !== tempMessageId))
      setGlobalNewMessage(optimisticMessage.message)
      setError('Failed to send message. Please try again.')
    } finally {
      setGlobalSending(false)
    }
  }

  const handleSendPrivateMessage = async () => {
    if (!privateNewMessage.trim() || !activeConversation) return

    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }

    // Store the current message and clear input immediately for better UX
    const messageToSend = privateNewMessage.trim()
    setPrivateNewMessage('')

    try {
      await sendPrivateMessage(activeConversation, messageToSend)
      
      // Maintain focus on input after sending
      setTimeout(() => {
        privateInputRef.current?.focus()
      }, 50)
    } catch (error) {
      console.error('Failed to send private message:', error)
      setError('Failed to send private message. Please try again.')
      // Restore the message if sending failed
      setPrivateNewMessage(messageToSend)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chatMode === 'global') {
        handleSendGlobalMessage()
      } else {
        handleSendPrivateMessage()
      }
    }
  }

  const handleReport = async (messageId: string) => {
    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }

    try {
      await reportChatMessage(messageId, user.id, 'inappropriate')
      alert('Message reported successfully')
    } catch (error) {
      console.error('Failed to report message:', error)
      alert('Failed to report message')
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!profile?.is_admin) return

    try {
      await deleteChatMessage(messageId)
    } catch (error) {
      console.error('Failed to delete message:', error)
      alert('Failed to delete message')
    }
  }

  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    if (!user?.id) return

    try {
      setSearching(true)
      const users = await searchUsers(query, user.id)
      setSearchResults(users.filter(u => u.id !== user?.id))
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setSearching(false)
    }
  }

  const startConversation = async (userId: string) => {
    setActiveConversation(userId)
    try {
      await startNewConversation(userId)
    } catch (error) {
      console.error('Failed to start conversation:', error)
    }
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
  }

  // Use mobile interface for small screens
  if (isMobile) {
    return (
      <div className="h-full">
        <MobileChatInterface onClose={() => {/* No action needed for unified interface */}} />
      </div>
    )
  }

  const renderGlobalChat = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Global Chat</h2>
            <p className="text-sm text-gray-500">Chat with everyone in the community</p>
          </div>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-400 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
        {globalLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : globalMessages.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-blue-500" />
            </div>
            <p>No messages yet. Be the first to start the conversation!</p>
          </div>
        ) : (
          globalMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 p-3 rounded-lg transition-all duration-200 ${
                message.is_flagged
                  ? 'bg-red-50 border border-red-200'
                  : 'hover:bg-gray-50'
              } ${message.isOptimistic ? 'opacity-70 animate-pulse' : ''}`}
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">
                    {message.profiles?.full_name || message.profiles?.username || 'Anonymous'}
                  </span>
                  {message.profiles?.is_admin && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                      Admin
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-gray-800 leading-relaxed ${message.is_flagged ? 'line-through opacity-60' : ''}`}>
                  {message.message}
                </p>
                {message.is_flagged && (
                  <p className="text-red-500 text-sm mt-1">This message has been flagged</p>
                )}
              </div>
              <div className="flex-shrink-0 flex gap-1">
                {user && !isGuest && message.user_id !== user.id && (
                  <button
                    onClick={() => handleReport(message.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Report message"
                  >
                    <Flag className="h-4 w-4" />
                  </button>
                )}
                {user && profile?.is_admin && (
                  <button
                    onClick={() => handleDelete(message.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                    title="Delete message"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 border-t border-gray-200 bg-white shadow-lg">
        <div className="flex gap-3">
          <input
            ref={globalInputRef}
            type="text"
            value={globalNewMessage}
            onChange={(e) => setGlobalNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isGuest ? "Please sign in to chat" : "Type your message..."}
            className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm text-gray-900 placeholder-gray-500"
            disabled={isGuest || globalSending}
          />
          <Button
            onClick={handleSendGlobalMessage}
            disabled={!globalNewMessage.trim() || isGuest || globalSending}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {globalSending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )

  const renderPrivateChat = () => {
    if (!activeConversation) {
      return (
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-secondary-400 to-secondary-600 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Private Messages</h2>
                  <p className="text-sm text-gray-500">Direct conversations with other users</p>
                </div>
              </div>
              <Button
                onClick={() => setShowNewChat(true)}
                className="px-4 py-2 rounded-full flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {privateLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-4">No conversations yet</p>
                <Button
                  onClick={() => setShowNewChat(true)}
                  className="px-6 py-2"
                >
                  Start a Conversation
                </Button>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.otherUser.id}
                    onClick={() => startConversation(conversation.otherUser.id)}
                    className="flex items-center gap-4 p-4 rounded-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer transition-all duration-200 border border-transparent hover:border-blue-100 hover:shadow-sm"
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <User className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.otherUser.full_name}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        @{conversation.otherUser.username}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.message}
                        </p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="flex-shrink-0">
                        <span className="bg-primary-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          {conversation.unreadCount}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* New Chat Modal */}
          {showNewChat && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Start New Conversation</h3>
                    <button
                      onClick={() => {
                        setShowNewChat(false)
                        setSearchQuery('')
                        setSearchResults([])
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        handleUserSearch(e.target.value)
                      }}
                      placeholder="Search users..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  
                  {searching && (
                    <div className="flex justify-center py-4">
                      <LoadingSpinner size="sm" />
                    </div>
                  )}
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => startConversation(user.id)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }

    // Active conversation view
    const conversation = conversations.find(c => c.otherUser.id === activeConversation)
    
    // If conversation doesn't exist, check if we have search results to get user info
    const otherUser = conversation?.otherUser || searchResults.find(u => u.id === activeConversation)
    
    if (!otherUser && !conversation) {
      return (
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveConversation(null)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Loading...</h2>
              </div>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveConversation(null)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {conversation?.otherUser.full_name || otherUser?.full_name || 'User'}
              </h2>
              <p className="text-sm text-gray-500">
                @{conversation?.otherUser.username || otherUser?.username || 'username'}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {currentConversation && currentConversation.length > 0 ? (
            currentConversation.map((message) => {
              const isOwn = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}
                >
                  <div
                    className={`max-w-xs md:max-w-md px-6 py-3 rounded-2xl shadow-sm break-words overflow-hidden ${
                      isOwn
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="leading-relaxed break-words">{message.message}</p>
                    <p className={`text-xs mt-2 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })
          ) : currentConversation ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-lg font-medium text-gray-700">No messages yet</p>
              <p className="text-sm text-gray-500">Start a conversation!</p>
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-200 bg-white shadow-lg">
          <div className="flex gap-3">
            <input
              ref={privateInputRef}
              type="text"
              value={privateNewMessage}
              onChange={(e) => setPrivateNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-6 py-3 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all duration-200 bg-white shadow-sm text-gray-900 placeholder-gray-500"
              disabled={privateSending}
            />
            <Button
              onClick={handleSendPrivateMessage}
              disabled={!privateNewMessage.trim() || privateSending}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {privateSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 py-6 md:py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Header with gradient background */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <MessageCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">JU Connect Chat</h1>
                  <p className="text-white/80 text-sm">Connect with your community</p>
                </div>
              </div>
              {totalUnreadCount > 0 && (
                <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {totalUnreadCount} unread
                </div>
              )}
            </div>
          </div>
          
          {/* Tab Navigation with enhanced design */}
          <div className="flex bg-gray-50/50 border-b border-gray-200/50">
            <button
              onClick={() => setChatMode('global')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 ${
                chatMode === 'global'
                  ? 'text-blue-600 border-b-3 border-blue-600 bg-blue-50/50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                Global Chat
              </div>
            </button>
            <button
              onClick={() => setChatMode('private')}
              className={`flex-1 px-6 py-4 text-sm font-semibold transition-all duration-200 relative ${
                chatMode === 'private'
                  ? 'text-purple-600 border-b-3 border-purple-600 bg-purple-50/50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Private Messages
                {totalUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {totalUnreadCount}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Chat Content Area with proper height */}
          <div className="h-[calc(75vh)] flex flex-col">
            {chatMode === 'global' ? renderGlobalChat() : renderPrivateChat()}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  )
}

export default UnifiedChatInterface
