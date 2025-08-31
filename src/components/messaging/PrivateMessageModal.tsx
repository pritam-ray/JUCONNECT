import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Send, Search, User, MessageCircle, Clock } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { usePrivateMessages } from '../../hooks/usePrivateMessages'
import { searchUsers } from '../../services/privateMessageService'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

interface PrivateMessageModalProps {
  isOpen: boolean
  onClose: () => void
  initialRecipientId?: string
}

interface UserProfile {
  id: string
  username: string
  full_name: string
  avatar_url?: string
}

const PrivateMessageModal: React.FC<PrivateMessageModalProps> = ({
  isOpen,
  onClose,
  initialRecipientId
}) => {
  const { user } = useAuth()
  const {
    conversations,
    currentConversation,
    totalUnreadCount,
    loading,
    sending,
    error,
    loadConversation,
    sendMessage
  } = usePrivateMessages(user?.id || null)

  const [activeConversation, setActiveConversation] = useState<string | null>(initialRecipientId || null)
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive - only scroll within container
  useEffect(() => {
    const element = messagesEndRef.current
    if (element) {
      const container = element.parentElement
      if (container) {
        // Scroll within the container only, not the entire page
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      }
    }
  }, [currentConversation])

  // Load conversation when activeConversation changes
  useEffect(() => {
    if (activeConversation && user) {
      loadConversation(activeConversation)
    }
  }, [activeConversation, loadConversation, user])

  // Set initial recipient if provided
  useEffect(() => {
    if (initialRecipientId && isOpen) {
      setActiveConversation(initialRecipientId)
      setShowNewChat(false)
    }
  }, [initialRecipientId, isOpen])

  // Search users
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || !user) return

    try {
      setSearching(true)
      const results = await searchUsers(query, user.id)
      setSearchResults(results)
    } catch (error) {
      console.error('Failed to search users:', error)
    } finally {
      setSearching(false)
    }
  }, [user])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        handleSearch(searchQuery)
      } else {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !user) return

    try {
      await sendMessage(activeConversation, newMessage.trim())
      setNewMessage('')
    } catch (error) {
      console.error('Failed to send message:', error)
    }
  }

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Start new conversation
  const startConversation = (userId: string) => {
    setActiveConversation(userId)
    setShowNewChat(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!isOpen) return null

  const activeConversationData = conversations.find(
    conv => conv.otherUser.id === activeConversation
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6" />
            <div>
              <h2 className="text-xl font-semibold">Messages</h2>
              {totalUnreadCount > 0 && (
                <p className="text-primary-100 text-sm">
                  {totalUnreadCount} unread message{totalUnreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex h-[calc(100%-80px)]">
          {/* Conversations List */}
          <div className="w-1/3 border-r border-gray-200 flex flex-col">
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={() => setShowNewChat(!showNewChat)}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                New Chat
              </button>
            </div>

            {/* Search Users (shown when starting new chat) */}
            {showNewChat && (
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {/* Search Results */}
                {searching && (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                )}

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => startConversation(user.id)}
                        className="w-full p-2 text-left hover:bg-gray-50 rounded-lg flex items-center gap-3"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">@{user.username}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {loading && conversations.length === 0 ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner size="lg" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                  <p className="text-sm">Start a new chat to begin messaging</p>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.otherUser.id}
                    onClick={() => setActiveConversation(conversation.otherUser.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 border-b border-gray-100 ${
                      activeConversation === conversation.otherUser.id ? 'bg-primary-50 border-primary-200' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-white" />
                        </div>
                        {conversation.otherUser.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 truncate">
                            {conversation.otherUser.full_name}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="px-2 py-1 bg-primary-600 text-white text-xs rounded-full">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                        {conversation.lastMessage && (
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500 truncate">
                              {conversation.lastMessage.message}
                            </p>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      {activeConversationData?.otherUser.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {activeConversationData?.otherUser.full_name || 'User'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {activeConversationData?.otherUser.is_online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentConversation.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words overflow-hidden ${
                          message.sender_id === user?.id
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm break-words">{message.message}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.sender_id === user?.id ? 'text-primary-100' : 'text-gray-500'
                          }`}
                        >
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  {error && (
                    <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      rows={2}
                      disabled={sending}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No conversation selected</h3>
                  <p>Select a conversation or start a new chat to begin messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivateMessageModal
