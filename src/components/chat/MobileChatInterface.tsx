import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Send, ArrowLeft, User, MessageCircle, Users, Search, Plus } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { getChatMessages, sendChatMessage } from '../../services/chatService'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'
import { searchUsers } from '../../services/privateMessageService'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

type ViewMode = 'tabs' | 'global-chat' | 'private-list' | 'private-chat' | 'new-chat'

interface MobileChatInterfaceProps {
  onClose: () => void
}

const MobileChatInterface: React.FC<MobileChatInterfaceProps> = ({ onClose }) => {
  const location = useLocation()
  const { user, isGuest } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Core state
  const [viewMode, setViewMode] = useState<ViewMode>('tabs')
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  
  // Global chat state
  const [globalMessages, setGlobalMessages] = useState<any[]>([])
  const [globalMessage, setGlobalMessage] = useState('')
  const [globalSending, setGlobalSending] = useState(false)
  const [globalLoading, setGlobalLoading] = useState(false)
  
  // Private chat state
  const [privateMessage, setPrivateMessage] = useState('')
  const [privateSending, setPrivateSending] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  
  // Use private messages hook
  const {
    conversations,
    currentConversation,
    sendMessage: sendPrivateMessage,
    startNewConversation
  } = usePrivateMessages(activeConversation)

  // Load global messages
  const loadGlobalMessages = async () => {
    try {
      setGlobalLoading(true)
      const messages = await getChatMessages()
      setGlobalMessages(messages || [])
    } catch (error) {
      console.error('Error loading global messages:', error)
    } finally {
      setGlobalLoading(false)
    }
  }

  // Handle global message send
  const handleSendGlobalMessage = async () => {
    if (!globalMessage.trim() || globalSending || isGuest) return
    
    try {
      setGlobalSending(true)
      await sendChatMessage(globalMessage.trim())
      setGlobalMessage('')
      await loadGlobalMessages() // Refresh messages
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setGlobalSending(false)
    }
  }

  // Handle private message send
  const handleSendPrivateMessage = async () => {
    if (!privateMessage.trim() || privateSending || !activeConversation) return
    
    try {
      setPrivateSending(true)
      await sendPrivateMessage(privateMessage.trim())
      setPrivateMessage('')
    } catch (error) {
      console.error('Error sending private message:', error)
    } finally {
      setPrivateSending(false)
    }
  }

  // Handle user search
  const handleUserSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    
    try {
      setSearching(true)
      const users = await searchUsers(query)
      setSearchResults(users || [])
    } catch (error) {
      console.error('Error searching users:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  // Start new conversation
  const startConversation = async (userId: string) => {
    try {
      await startNewConversation(userId)
      setActiveConversation(userId)
      setViewMode('private-chat')
    } catch (error) {
      console.error('Error starting conversation:', error)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      action()
    }
  }

  // Navigation handlers
  const goBack = () => {
    if (viewMode === 'private-chat') {
      setViewMode('private-list')
      setActiveConversation(null)
    } else if (viewMode === 'global-chat' || viewMode === 'private-list' || viewMode === 'new-chat') {
      setViewMode('tabs')
    } else {
      onClose()
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [globalMessages, currentConversation])

  // Load global messages on mount
  useEffect(() => {
    if (viewMode === 'global-chat') {
      loadGlobalMessages()
    }
  }, [viewMode])

  // Parse URL parameters
  useEffect(() => {
    const tab = new URLSearchParams(location.search).get('tab')
    if (tab === 'global') {
      setViewMode('global-chat')
    } else if (tab === 'private') {
      setViewMode('private-list')
    }
  }, [location])

  // TABS VIEW - Main Menu
  if (viewMode === 'tabs') {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-500 to-primary-600 text-white p-4 shadow-lg">
          <h1 className="text-xl font-bold text-center">Messages</h1>
        </div>

        {/* Tab Selection */}
        <div className="flex-1 flex flex-col p-6">
          <div className="space-y-4">
            {/* Global Chat Tab */}
            <button
              className="w-full p-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl hover:shadow-lg transition-all duration-200"
              onClick={() => setViewMode('global-chat')}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Global Chat</h3>
                  <p className="text-sm text-gray-600">Join the community conversation</p>
                </div>
              </div>
            </button>

            {/* Private Messages Tab */}
            <button
              className="w-full p-6 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-2xl hover:shadow-lg transition-all duration-200"
              onClick={() => setViewMode('private-list')}
              disabled={isGuest}
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
                  <MessageCircle className="h-6 w-6 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg font-semibold text-gray-900">Private Messages</h3>
                  <p className="text-sm text-gray-600">
                    {isGuest ? 'Sign in to access private messages' : 'Your private conversations'}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // GLOBAL CHAT VIEW
  if (viewMode === 'global-chat') {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 shadow-lg flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <h1 className="text-lg font-semibold">Global Chat</h1>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
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
            <div className="space-y-3 pb-20">
              {globalMessages.map((message) => {
                const isOwn = message.user_id === user?.id
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%]`}>
                      {!isOwn && (
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
                          isOwn
                            ? 'bg-blue-500 text-white'
                            : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                        }`}
                      >
                        <p className="text-sm">{message.message}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-blue-100' : 'text-gray-500'}`}>
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={globalMessage}
              onChange={(e) => setGlobalMessage(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleSendGlobalMessage)}
              placeholder={isGuest ? "Sign in to chat" : "Type a message..."}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              disabled={isGuest || globalSending}
            />
            <button
              onClick={handleSendGlobalMessage}
              disabled={!globalMessage.trim() || isGuest || globalSending}
              className="w-12 h-12 bg-blue-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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

  // PRIVATE MESSAGES LIST
  if (viewMode === 'private-list') {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <h1 className="text-lg font-semibold">Private Messages</h1>
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
          {conversations.length === 0 ? (
            <div className="text-center py-12 px-6 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No conversations yet</p>
              <button
                onClick={() => setViewMode('new-chat')}
                className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Start New Chat
              </button>
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => {
                    setActiveConversation(conversation.otherUser.id)
                    setViewMode('private-chat')
                  }}
                  className="w-full p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-900">{conversation.otherUser.full_name}</h3>
                      <p className="text-sm text-gray-500">@{conversation.otherUser.username}</p>
                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {conversation.lastMessage.message}
                        </p>
                      )}
                    </div>
                    {conversation.lastMessage && (
                      <div className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
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

  // NEW CHAT VIEW
  if (viewMode === 'new-chat') {
    return (
      <div className="h-screen w-full bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg flex-shrink-0">
          <div className="flex items-center space-x-3">
            <button onClick={goBack} className="p-2 hover:bg-white/20 rounded-lg">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-semibold">New Conversation</h1>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
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

  // PRIVATE CHAT VIEW
  if (viewMode === 'private-chat') {
    const conversation = conversations.find(c => c.otherUser.id === activeConversation)
    if (!conversation) return null

    return (
      <div className="h-screen w-full bg-white flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 shadow-lg flex-shrink-0">
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
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          {currentConversation ? (
            <div className="space-y-3 pb-20">
              {currentConversation.map((message) => {
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
              })}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          )}
        </div>

        {/* Input Area - Fixed at bottom */}
        <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <input
              type="text"
              value={privateMessage}
              onChange={(e) => setPrivateMessage(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, handleSendPrivateMessage)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
              disabled={privateSending}
            />
            <button
              onClick={handleSendPrivateMessage}
              disabled={!privateMessage.trim() || privateSending}
              className="w-12 h-12 bg-purple-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
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
