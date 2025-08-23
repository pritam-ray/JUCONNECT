import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, ArrowLeft, User, MessageCircle, Users, Search, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getChatMessages, sendChatMessage } from '../../services/chatService'
import { useRealtimeChatMessages } from '../../hooks/useRealtime'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'
import { searchUsers } from '../../services/privateMessageService'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
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

type ViewMode = 'tabs' | 'global-chat' | 'private-list' | 'private-chat' | 'new-chat'

const MobileChatInterface: React.FC = () => {
  const { user, profile, isGuest } = useAuth()
  const location = useLocation()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Get initial tab from URL parameters
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') === 'private' ? 'private' : 'global'
  const [viewMode, setViewMode] = useState<ViewMode>('tabs')
  
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
  
  // Common state
  const [error, setError] = useState<string | null>(null)

  // Private messages hook
  const {
    conversations,
    currentConversation,
    totalUnreadCount,
    loading: privateLoading,
    sending: privateSending,
    error: privateError,
    loadConversation,
    sendMessage: sendPrivateMessage
  } = usePrivateMessages(user?.id || null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [globalMessages, currentConversation])

  // Set initial view mode based on URL params
  useEffect(() => {
    if (initialTab === 'global') {
      setViewMode('global-chat')
    } else if (initialTab === 'private') {
      setViewMode('private-list')
    }
  }, [initialTab])

  // Load initial global messages
  useEffect(() => {
    const loadGlobalMessages = async () => {
      try {
        setGlobalLoading(true)
        const initialMessages = await getChatMessages()
        setGlobalMessages(initialMessages ? initialMessages.reverse() : [])
      } catch (error) {
        console.error('Failed to load global messages:', error)
        setError('Failed to load chat messages')
      } finally {
        setGlobalLoading(false)
      }
    }

    if (viewMode === 'global-chat') {
      loadGlobalMessages()
    }
  }, [viewMode])

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

  useRealtimeChatMessages(
    handleNewGlobalMessage,
    handleGlobalMessageUpdate,
    handleGlobalMessageDelete,
    {
      enabled: viewMode === 'global-chat',
      onError: (error) => {
        console.error('Real-time subscription error:', error)
        setError('Real-time updates unavailable')
      }
    }
  )

  // Clear error after 5 seconds
  useEffect(() => {
    if (error || privateError) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error, privateError])

  const handleSendGlobalMessage = async () => {
    if (!globalNewMessage.trim()) return

    if (!user || isGuest) return

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

    if (!user || isGuest) return

    try {
      await sendPrivateMessage(activeConversation, privateNewMessage.trim())
      setPrivateNewMessage('')
    } catch (error) {
      console.error('Failed to send private message:', error)
      setError('Failed to send private message. Please try again.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (viewMode === 'global-chat') {
        handleSendGlobalMessage()
      } else if (viewMode === 'private-chat') {
        handleSendPrivateMessage()
      }
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

  const startConversation = (userId: string) => {
    setActiveConversation(userId)
    loadConversation(userId)
    setViewMode('private-chat')
    setSearchQuery('')
    setSearchResults([])
  }

  const goBack = () => {
    switch (viewMode) {
      case 'global-chat':
        setViewMode('tabs')
        break
      case 'private-list':
        setViewMode('tabs')
        break
      case 'private-chat':
        setViewMode('private-list')
        setActiveConversation(null)
        break
      case 'new-chat':
        setViewMode('private-list')
        setSearchQuery('')
        setSearchResults([])
        break
      default:
        setViewMode('tabs')
    }
  }

  // Tab Selection View
  if (viewMode === 'tabs') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 shadow-lg">
          <h1 className="text-xl font-bold text-center">Messages</h1>
          {/* Debug info */}
          <div className="text-xs opacity-75 mt-1 text-center">Mode: {viewMode}</div>
        </div>

        {/* Tab Selection */}
        <div className="flex-1 flex flex-col p-6">
          <div className="space-y-4">
            {/* Global Chat Tab */}
            <button
              onClick={() => setViewMode('global-chat')}
              className="w-full p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl border border-blue-200 hover:from-blue-100 hover:to-blue-200 transition-all duration-300 shadow-sm"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Global Chat</h3>
                  <p className="text-sm text-gray-600">Chat with everyone in the community</p>
                </div>
              </div>
            </button>

            {/* Private Messages Tab */}
            <button
              onClick={() => setViewMode('private-list')}
              className="w-full p-6 bg-gradient-to-r from-purple-50 to-purple-100 rounded-2xl border border-purple-200 hover:from-purple-100 hover:to-purple-200 transition-all duration-300 shadow-sm relative"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Private Messages</h3>
                  <p className="text-sm text-gray-600">Direct conversations with other users</p>
                </div>
              </div>
              {totalUnreadCount > 0 && (
                <div className="absolute top-4 right-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  {totalUnreadCount}
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Global Chat View
  if (viewMode === 'global-chat') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col h-screen">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Global Chat</h1>
                <div className="text-xs opacity-75">Mode: {viewMode}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="flex-shrink-0 p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
          {globalLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : globalMessages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Be the first to start!</p>
            </div>
          ) : (
            globalMessages.map((message) => (
              <div key={message.id} className={`flex ${message.user_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${message.isOptimistic ? 'opacity-70' : ''}`}>
                  {message.user_id !== user?.id && (
                    <div className="flex items-center space-x-2 mb-1 px-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <User className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {message.profiles?.full_name || 'Anonymous'}
                      </span>
                      {message.profiles?.is_admin && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-1 rounded">Admin</span>
                      )}
                    </div>
                  )}
                  <div
                    className={`px-4 py-3 rounded-2xl ${
                      message.user_id === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    } ${message.is_flagged ? 'opacity-50 line-through' : ''}`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${message.user_id === user?.id ? 'text-blue-100' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 bg-white border-t-2 border-blue-500 shadow-lg">
          <div className="text-xs text-blue-600 mb-2 font-medium">Global Chat Input (Mode: {viewMode})</div>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={globalNewMessage}
              onChange={(e) => setGlobalNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isGuest ? "Sign in to chat" : "Type a message..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isGuest || globalSending}
            />
            <button
              onClick={handleSendGlobalMessage}
              disabled={!globalNewMessage.trim() || isGuest || globalSending}
              className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {globalSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Private Messages List View
  if (viewMode === 'private-list') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <h1 className="text-lg font-semibold">Private Messages</h1>
              </div>
            </div>
            <button
              onClick={() => setViewMode('new-chat')}
              className="p-2 hover:bg-white/20 rounded-lg"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {privateLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12 px-6 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No conversations yet</p>
              <p className="text-sm mb-6">Start chatting with other users</p>
              <Button
                onClick={() => setViewMode('new-chat')}
                className="px-6 py-3"
              >
                Start a Conversation
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => startConversation(conversation.otherUser.id)}
                  className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.otherUser.full_name}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate mb-1">
                        @{conversation.otherUser.username}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.lastMessage.message}
                        </p>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <div className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0">
                        {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // New Chat View
  if (viewMode === 'new-chat') {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">New Conversation</h1>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                handleUserSearch(e.target.value)
              }}
              placeholder="Search users by name or username..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {searching ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 px-6 text-gray-500">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No users found for "{searchQuery}"</p>
                </>
              ) : (
                <>
                  <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Search for users to start a conversation</p>
                </>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => startConversation(user.id)}
                  className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">{user.full_name}</h3>
                      <p className="text-sm text-gray-500">@{user.username}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Private Chat View
  if (viewMode === 'private-chat') {
    const conversation = conversations.find(c => c.otherUser.id === activeConversation)
    if (!conversation) return null

    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col h-screen">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg">
          <div className="flex items-center space-x-3">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">{conversation.otherUser.full_name}</h1>
              <p className="text-sm text-purple-100">@{conversation.otherUser.username}</p>
              <div className="text-xs opacity-75">Mode: {viewMode}</div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 min-h-0">
          {currentConversation ? (
            currentConversation.map((message) => {
              const isOwn = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl ${
                      isOwn
                        ? 'bg-purple-500 text-white'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                    }`}
                  >
                    <p className="text-sm">{message.message}</p>
                    <p className={`text-xs mt-1 ${isOwn ? 'text-purple-100' : 'text-gray-500'}`}>
                      {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 p-4 bg-white border-t-2 border-purple-500 shadow-lg">
          <div className="text-xs text-purple-600 mb-2 font-medium">Private Chat Input (Mode: {viewMode})</div>
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={privateNewMessage}
              onChange={(e) => setPrivateNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={privateSending}
            />
            <button
              onClick={handleSendPrivateMessage}
              disabled={!privateNewMessage.trim() || privateSending}
              className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {privateSending ? (
                <LoadingSpinner size="sm" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default MobileChatInterface
