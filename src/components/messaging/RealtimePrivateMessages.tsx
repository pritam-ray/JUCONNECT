import React, { useState, useEffect, useRef } from 'react'
import { Send, Search, X, User, Circle, Wifi, WifiOff, MessageSquare } from 'lucide-react'
import { usePrivateMessages, useUserStatus } from '../../hooks/useRealtime'
import { searchUsers, getUserConversations, markMessagesAsRead } from '../../services/privateMessageService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

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
  }

  const isConnected = messageConnectionStatus.isConnected && statusConnectionStatus.isConnected

  if (!user || !profile) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col md:flex-row h-80 md:h-96">
        {/* Conversations Sidebar */}
        <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col max-h-40 md:max-h-none">
          <div className="p-3 md:p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-gray-900 text-sm md:text-base">Messages</h3>
                {/* Connection Status */}
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <Wifi className="h-3 w-3 text-green-500" title="Connected" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-red-500" title="Disconnected" />
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-blue-600 hover:text-blue-700 text-xs md:text-sm font-medium"
              >
                New Chat
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
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="max-h-24 md:max-h-32 overflow-y-auto space-y-1">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleStartNewConversation(user)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                      >
                        <div className="relative">
                          <User className="h-4 w-4 text-gray-400" />
                          {getUserStatus(user.id) && (
                            <Circle className="absolute -bottom-1 -right-1 h-2 w-2 text-green-500 fill-current" />
                          )}
                        </div>
                        <div>
                          <div className="text-xs md:text-sm font-medium">@{user.username}</div>
                          <div className="text-xs text-gray-500">{user.full_name}</div>
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
              <div className="p-4 flex justify-center">
                <LoadingSpinner size="sm" />
              </div>
            ) : conversationsList.length === 0 ? (
              <div className="p-3 md:p-4 text-center text-gray-500 text-xs md:text-sm">
                No conversations yet
              </div>
            ) : (
              conversationsList.map(conversation => (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
                    selectedConversation?.otherUser.id === conversation.otherUser.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <User className="h-6 w-6 md:h-8 md:w-8 text-gray-400" />
                        {getUserStatus(conversation.otherUser.id) && (
                          <Circle className="absolute -bottom-1 -right-1 h-2 w-2 md:h-3 md:w-3 text-green-500 fill-current" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs md:text-sm font-medium text-gray-900 truncate">
                          @{conversation.otherUser.username}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage?.message || 'No messages yet'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1rem] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-400 hidden md:block">
                          {formatDistanceToNow(new Date(conversation.lastMessage.created_at), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-3 md:p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <User className="h-5 w-5 md:h-6 md:w-6 text-gray-400" />
                    {getUserStatus(selectedConversation.otherUser.id) && (
                      <Circle className="absolute -bottom-1 -right-1 h-2 w-2 text-green-500 fill-current" />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm md:text-base">@{selectedConversation.otherUser.username}</div>
                    <div className="text-xs md:text-sm text-gray-500">
                      {getUserStatus(selectedConversation.otherUser.id) ? (
                        <span className="text-green-600 flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span>Online</span>
                        </span>
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
                
                {/* Connection Status */}
                <div className="flex items-center space-x-1">
                  {isConnected ? (
                    <div className="flex items-center space-x-1 text-green-600">
                      <Wifi className="h-4 w-4" />
                      <span className="text-xs font-medium hidden sm:inline">Live</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600">
                      <WifiOff className="h-4 w-4" />
                      <span className="text-xs font-medium hidden sm:inline">Offline</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 min-h-0">
                {currentMessages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  currentMessages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'} px-1`}
                    >
                      <div
                        className={`max-w-xs px-3 md:px-4 py-2 rounded-lg transition-all duration-200 ${
                          message.sender_id === user.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        } ${
                          message.id.startsWith('temp-') ? 'opacity-70' : 'opacity-100'
                        }`}
                      >
                        <p className="text-sm break-words">{message.message}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs opacity-75 hidden sm:block">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                          </p>
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
              <div className="border-t border-gray-200 p-3 md:p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-2 md:space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={isConnected ? "Type your message..." : "Connecting..."}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 disabled:bg-gray-100"
                    disabled={sending || !isConnected}
                    maxLength={500}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending || !isConnected}
                    loading={sending}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>Select a conversation to start messaging</p>
                {!isConnected && (
                  <p className="text-red-500 text-sm mt-2">
                    Waiting for connection...
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