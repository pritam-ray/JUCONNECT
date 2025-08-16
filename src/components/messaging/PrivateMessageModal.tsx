import React, { useState, useEffect, useRef } from 'react'
import { Send, Search, X, User, Circle } from 'lucide-react'
import { 
  getUserConversations, 
  getConversation, 
  sendPrivateMessage, 
  markMessagesAsRead,
  searchUsers,
  subscribeToMessages,
  Conversation,
  PrivateMessageWithProfile 
} from '../../services/privateMessageService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

interface PrivateMessageModalProps {
  isOpen: boolean
  onClose: () => void
  initialRecipientId?: string
}

const PrivateMessageModal: React.FC<PrivateMessageModalProps> = ({
  isOpen,
  onClose,
  initialRecipientId
}) => {
  const { user, profile } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<PrivateMessageWithProfile[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen && user) {
      fetchConversations()
      
      // Subscribe to new messages
      const unsubscribe = subscribeToMessages(user.id, (newMessage) => {
        // Add to conversations if it's from the selected conversation
        if (selectedConversation && 
            (newMessage.sender_id === selectedConversation.otherUser.id || 
             newMessage.recipient_id === selectedConversation.otherUser.id)) {
          setMessages(prev => [...prev, newMessage])
        }
        
        // Refresh conversations to update unread counts
        fetchConversations()
      })

      return unsubscribe
    }
  }, [isOpen, user])

  useEffect(() => {
    if (initialRecipientId && conversations.length > 0) {
      const conversation = conversations.find(c => c.otherUser.id === initialRecipientId)
      if (conversation) {
        handleSelectConversation(conversation)
      }
    }
  }, [initialRecipientId, conversations])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchConversations = async () => {
    if (!user) return
    
    try {
      const data = await getUserConversations(user.id)
      setConversations(data)
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    }
  }

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setLoading(true)
    setShowSearch(false)
    
    try {
      const conversationMessages = await getConversation(user!.id, conversation.otherUser.id)
      setMessages(conversationMessages)
      
      // Mark messages as read
      if (conversation.unreadCount > 0) {
        await markMessagesAsRead(user!.id, conversation.otherUser.id)
        fetchConversations() // Refresh to update unread count
      }
    } catch (error) {
      console.error('Failed to fetch conversation:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedConversation || !newMessage.trim() || sending) return

    setSending(true)
    try {
      const message = await sendPrivateMessage(
        user.id,
        selectedConversation.otherUser.id,
        newMessage.trim()
      )
      
      // Add message to current conversation
      setMessages(prev => [...prev, {
        ...message,
        sender: profile,
        recipient: selectedConversation.otherUser
      }])
      
      setNewMessage('')
      fetchConversations() // Refresh conversations
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
    const newConversation: Conversation = {
      otherUser,
      unreadCount: 0
    }
    
    setSelectedConversation(newConversation)
    setMessages([])
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!user || !profile) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="flex h-96">
        {/* Conversations Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Messages</h3>
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                New Chat
              </button>
            </div>
            
            {showSearch && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                {searchResults.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {searchResults.map(user => (
                      <button
                        key={user.id}
                        onClick={() => handleStartNewConversation(user)}
                        className="w-full text-left p-2 hover:bg-gray-50 rounded-lg flex items-center space-x-2"
                      >
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">@{user.username}</div>
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
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No conversations yet
              </div>
            ) : (
              conversations.map(conversation => (
                <button
                  key={conversation.otherUser.id}
                  onClick={() => handleSelectConversation(conversation)}
                  className={`w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 ${
                    selectedConversation?.otherUser.id === conversation.otherUser.id 
                      ? 'bg-blue-50 border-blue-200' 
                      : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="relative">
                        <User className="h-8 w-8 text-gray-400" />
                        {conversation.otherUser.is_online && (
                          <Circle className="absolute -bottom-1 -right-1 h-3 w-3 text-green-500 fill-current" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          @{conversation.otherUser.username}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage?.message || 'No messages yet'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-1">
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 min-w-[1.25rem] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-400">
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
        <div className="flex-1 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-6 w-6 text-gray-400" />
                  <div>
                    <div className="font-medium">@{selectedConversation.otherUser.username}</div>
                    <div className="text-sm text-gray-500">
                      {selectedConversation.otherUser.is_online ? (
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.sender_id === user.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm break-words">{message.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="border-t border-gray-200 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    disabled={sending}
                    maxLength={500}
                  />
                  <Button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    loading={sending}
                    size="sm"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>Select a conversation to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

export default PrivateMessageModal