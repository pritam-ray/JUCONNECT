import React, { useState, useEffect, useRef } from 'react'
import { Send, Search, ArrowLeft, Phone, Video, MoreVertical, Smile, Paperclip, Mic, Check, CheckCheck } from 'lucide-react'
import { usePrivateMessages, useUserStatus } from '../../hooks/useRealtime'
import { searchUsers, getUserConversations, markMessagesAsRead } from '../../services/privateMessageService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

interface WhatsAppStyleMessagingProps {
  isOpen: boolean
  onClose: () => void
  initialRecipientId?: string
}

const WhatsAppStyleMessaging: React.FC<WhatsAppStyleMessagingProps> = ({
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
  } = usePrivateMessages({
    onError: (error) => console.error('WhatsApp messaging error:', error),
    autoConnect: true
  })

  const { getUserStatus } = useUserStatus({
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
  const [view, setView] = useState<'conversations' | 'chat'>('conversations')

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
    setView('chat')
    
    try {
      // Mark messages as read
      if (conversation.unreadCount > 0) {
        await markMessagesAsRead(user!.id, conversation.otherUser.id)
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
      loadConversations()
    } catch (error: any) {
      console.error('Failed to send message:', error)
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
    setView('chat')
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return format(date, 'HH:mm')
    } else if (isYesterday(date)) {
      return 'Yesterday'
    } else {
      return format(date, 'dd/MM/yyyy')
    }
  }

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp)
    if (isToday(date)) {
      return `today at ${format(date, 'HH:mm')}`
    } else if (isYesterday(date)) {
      return `yesterday at ${format(date, 'HH:mm')}`
    } else {
      return format(date, 'dd/MM/yyyy')
    }
  }

  if (!user || !profile) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex flex-col h-[500px] md:h-[600px] bg-gray-50">
        {/* Conversations List View */}
        {view === 'conversations' && (
          <>
            {/* Header */}
            <div className="bg-green-600 text-white p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold">{profile.username.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h2 className="font-semibold">Chats</h2>
                  <p className="text-sm text-green-100">
                    {messageConnectionStatus.isConnected ? 'Online' : 'Connecting...'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            {showSearch && (
              <div className="p-4 bg-white border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-green-500"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleStartNewConversation(user)}
                        className="w-full text-left p-3 hover:bg-gray-50 rounded-lg flex items-center space-x-3"
                      >
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium">{user.full_name}</div>
                          <div className="text-sm text-gray-500">@{user.username}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto bg-white">
              {messagesLoading ? (
                <div className="p-4 flex justify-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : conversationsList.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium mb-2">No conversations yet</p>
                  <p className="text-sm">Search for users to start chatting</p>
                </div>
              ) : (
                conversationsList.map(conversation => (
                  <button
                    key={conversation.otherUser.id}
                    onClick={() => handleSelectConversation(conversation)}
                    className="w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 flex items-center space-x-3"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="font-semibold">{conversation.otherUser.username.charAt(0).toUpperCase()}</span>
                      </div>
                      {getUserStatus(conversation.otherUser.id) && (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-gray-900 truncate">{conversation.otherUser.full_name}</h3>
                        <div className="flex items-center space-x-2">
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatMessageTime(conversation.lastMessage.created_at)}
                            </span>
                          )}
                          {conversation.unreadCount > 0 && (
                            <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {conversation.lastMessage?.message || 'No messages yet'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}

        {/* Chat View */}
        {view === 'chat' && selectedConversation && (
          <>
            {/* Chat Header */}
            <div className="bg-green-600 text-white p-4 flex items-center space-x-3">
              <button
                onClick={() => setView('conversations')}
                className="p-1 hover:bg-white/10 rounded-full transition-colors md:hidden"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="font-semibold">{selectedConversation.otherUser.username.charAt(0).toUpperCase()}</span>
                </div>
                {getUserStatus(selectedConversation.otherUser.id) && (
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-green-600" />
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="font-semibold">{selectedConversation.otherUser.full_name}</h3>
                <p className="text-sm text-green-100">
                  {getUserStatus(selectedConversation.otherUser.id) ? (
                    'Online'
                  ) : (
                    selectedConversation.otherUser.last_seen && (
                      `Last seen ${formatLastSeen(selectedConversation.otherUser.last_seen)}`
                    )
                  )}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <Video className="h-5 w-5" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {currentMessages.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">{selectedConversation.otherUser.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <p className="text-gray-600">Start your conversation with {selectedConversation.otherUser.full_name}</p>
                </div>
              ) : (
                currentMessages.map(message => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl relative ${
                        message.sender_id === user.id
                          ? 'bg-green-500 text-white rounded-br-md'
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                      } ${
                        message.id.startsWith('temp-') ? 'opacity-70' : 'opacity-100'
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.message}</p>
                      <div className={`flex items-center justify-end mt-1 space-x-1 ${
                        message.sender_id === user.id ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        <span className="text-xs">
                          {format(new Date(message.created_at), 'HH:mm')}
                        </span>
                        {message.sender_id === user.id && (
                          <div className="flex">
                            {message.is_read ? (
                              <CheckCheck className="h-3 w-3 text-blue-200" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white border-t p-4">
              <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Smile className="h-5 w-5" />
                </button>
                
                <button
                  type="button"
                  className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <Paperclip className="h-5 w-5" />
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 pr-12"
                    disabled={sending || !messageConnectionStatus.isConnected}
                    maxLength={500}
                  />
                  {!newMessage.trim() && (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <Mic className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {newMessage.trim() && (
                  <button
                    type="submit"
                    disabled={sending || !messageConnectionStatus.isConnected}
                    className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {sending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default WhatsAppStyleMessaging