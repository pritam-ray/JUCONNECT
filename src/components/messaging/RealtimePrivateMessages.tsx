import React, { useState, useEffect, useRef } from 'react'
import { Send, Search, X, User, Circle, Wifi, WifiOff, MessageSquare, ArrowLeft } from 'lucide-react'
import { usePrivateMessages, useUserStatus } from '../../hooks/useRealtime'
import { searchUsers, getUserConversations, markMessagesAsRead } from '../../services/privateMessageService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow, format, isToday } from 'date-fns'

interface RealtimePrivateMessagesProps {
  isOpen: boolean
  onClose: () => void
  initialRecipientId?: string
}

const RealtimePrivateMessages: React.FC<RealtimePrivateMessagesProps> = ({
  isOpen,
  onClose,
  initialRecipientId
}) => {
  const { user, profile } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Real-time hooks
  const {
    conversations,
    connectionStatus: messageConnectionStatus,
    loading: messagesLoading,
    sendMessage,
    getConversation,
    connect: connectMessages,
    disconnect: disconnectMessages
  } = usePrivateMessages({
    onError: (error) => console.error('Private messages error:', error),
    autoConnect: true
  })

  const {
    userStatuses,
    connectionStatus: statusConnectionStatus,
    getUserStatus
  } = useUserStatus({
    onError: (error) => console.error('User status error:', error),
    autoConnect: true
  })

  // Local state
  const [conversationsList, setConversationsList] = useState<any[]>([])
  const [selectedConversation, setSelectedConversation] = useState<any | null>(null)
  const [currentMessages, setCurrentMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [sending, setSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [view, setView] = useState<'conversations' | 'chat'>('conversations')

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Load conversations on mount
  useEffect(() => {
    if (isOpen && user) {
      loadConversations()
    }
  }, [isOpen, user])

  // Update current messages when conversation changes or new messages arrive
  useEffect(() => {
    if (selectedConversation) {
      const messages = getConversation(selectedConversation.otherUser.id)
      setCurrentMessages(messages)
    }
  }, [selectedConversation, conversations, getConversation])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [currentMessages])

  // Handle initial recipient
  useEffect(() => {
    if (initialRecipientId && conversationsList.length > 0) {
      const conversation = conversationsList.find(c => c.otherUser.id === initialRecipientId)
      if (conversation) {
        handleSelectConversation(conversation)
      }
    }
  }, [initialRecipientId, conversationsList])

  const loadConversations = async () => {
    if (!user) return
    
    try {
      const data = await getUserConversations(user.id)
      setConversationsList(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  const handleSelectConversation = async (conversation: any) => {
    setSelectedConversation(conversation)
    setShowSearch(false)
    if (isMobile) {
      setView('chat')
    }
    
    try {
      // Mark messages as read
      if (conversation.unreadCount > 0) {
        await markMessagesAsRead(user!.id, conversation.otherUser.id)
        // Refresh conversations to update unread count
        loadConversations()
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedConversation || !newMessage.trim() || sending) return

    setSending(true)
    try {
      await sendMessage(selectedConversation.otherUser.id, newMessage.trim())
      setNewMessage('')
      loadConversations() // Refresh conversations
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (!query.trim() || !user) {
      setSearchResults([])
      return
    }

    try {
      const results = await searchUsers(query.trim(), user.id)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults([])
    }
  }

  const handleStartNewConversation = (otherUser: any) => {
    const newConversation = {
      otherUser,
      unreadCount: 0
    }
    
    setSelectedConversation(newConversation)
    setCurrentMessages([])
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    if (isMobile) {
      setView('chat')
    }
  }

  const handleBackToConversations = () => {
    setView('conversations')
    setSelectedConversation(null)
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return isToday(date) ? format(date, 'HH:mm') : format(date, 'dd/MM')
  }

  const isConnected = messageConnectionStatus.isConnected && statusConnectionStatus.isConnected

  if (!user || !profile) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" premium={false}>
      <div className="flex flex-col md:flex-row h-96 md:h-[500px] bg-white rounded-lg overflow-hidden">
        {/* Conversations Sidebar */}
        <div className={`${
          isMobile ? (view === 'conversations' ? 'w-full' : 'hidden') : 'w-1/3'
        } border-b md:border-b-0 md:border-r border-gray-200 flex flex-col`}>
          <div className="p-3 md:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 text-base md:text-lg">Messages</h3>
                {/* Connection Status */}
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            
            {showSearch && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2 md:top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleStartNewConversation(user)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                      >
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.full_name}</div>
                          <div className="text-xs text-gray-500">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {messagesLoading ? (
              <div className="p-6 flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : conversationsList.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-base font-medium mb-1">No conversations yet</p>
                <p className="text-sm">Search for users to start chatting</p>
              </div>
            ) : (
              conversationsList.map(conversation => (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                    selectedConversation?.otherUser.id === conversation.otherUser.id 
                      ? 'bg-blue-50' 
                      : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="font-semibold text-gray-600">
                          {conversation.otherUser.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {getUserStatus(conversation.otherUser.id) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {conversation.otherUser.full_name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(conversation.lastMessage.created_at)}
                            </span>
                          )}
                          {conversation.unreadCount > 0 && (
                            <div className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500 truncate flex-1">
                          {conversation.lastMessage?.message || 'No messages yet'}
                        </p>
                        <span className="text-xs text-gray-400 ml-2">@{conversation.otherUser.username}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`${
          isMobile ? (view === 'chat' ? 'w-full' : 'hidden') : 'flex-1'
        } flex flex-col min-h-0`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center space-x-3 bg-gray-50">
                {isMobile && (
                  <button
                    onClick={handleBackToConversations}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="font-semibold text-gray-600">
                        {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    {getUserStatus(selectedConversation.otherUser.id) && (
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-base">{selectedConversation.otherUser.full_name}</div>
                    <div className="text-sm text-gray-500">
                      {getUserStatus(selectedConversation.otherUser.id) ? (
                        <span className="text-green-600">Online</span>
                      ) : (
                        selectedConversation.otherUser.last_seen && (
                          <span>
                            Last seen {formatDistanceToNow(new Date(selectedConversation.otherUser.last_seen), { addSuffix: true })}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 bg-gray-50">
                {currentMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-semibold text-gray-400">
                        {selectedConversation.otherUser.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-lg font-medium mb-1">Start your conversation</p>
                    <p className="text-sm">with {selectedConversation.otherUser.full_name}</p>
                  </div>
                ) : (
                  currentMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative transition-all duration-200 ${
                          message.sender_id === user.id
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                        } ${
                          message.id.startsWith('temp-') ? 'opacity-70' : 'opacity-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed break-words">{message.message}</p>
                        <div className={`flex items-center justify-end mt-1 space-x-1 ${
                          message.sender_id === user.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          <span className="text-xs">
                            {format(new Date(message.created_at), 'HH:mm')}
                          </span>
                          {message.id.startsWith('temp-') && (
                            <span className="text-xs opacity-50">•••</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4 bg-white">
                <form onSubmit={handleSendMessage} className="flex space-x-2 md:space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isConnected ? "Type your message..." : "Connecting..."}
                    className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 disabled:bg-gray-100"
                    disabled={sending || !isConnected}
                    maxLength={500}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !isConnected}
                    loading={sending}
                    size="sm"
                    className="flex-shrink-0 rounded-full"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-20 w-20 text-gray-300 mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">Select a conversation</p>
                <p className="text-sm">Choose from your existing conversations or start a new one</p>
                {!isConnected && (
                  <p className="text-red-500 text-xs mt-3">
                    • Connecting...
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default RealtimePrivateMessages