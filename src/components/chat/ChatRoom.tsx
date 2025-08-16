import React, { useState, useEffect, useRef } from 'react'
import { Send, Flag, Trash2, User, MessageCircle } from 'lucide-react'
import { 
  getChatMessages, 
  sendChatMessage, 
  subscribeToChatMessages,
  deleteChatMessage,
  ChatMessageWithProfile 
} from '../../services/chatService'
import { reportChatMessage } from '../../services/reportingService'
import { useAuth } from '../../contexts/AuthContext'
import AuthModal from '../ui/AuthModal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

const ChatRoom: React.FC = () => {
  const { user, profile, isGuest } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [messages, setMessages] = useState<ChatMessageWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await getChatMessages(100)
        setMessages(data.reverse()) // Reverse to show newest at bottom
      } catch (error) {
        console.error('Failed to fetch messages:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()

    // Subscribe to new messages
    const unsubscribe = subscribeToChatMessages((newMessage) => {
      setMessages(prev => [...prev, newMessage])
    })

    return unsubscribe
  }, []) // Remove user dependency to allow guest viewing

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Show auth modal if user is not authenticated
    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }
    
    if (!newMessage.trim() || sending) return

    setSending(true)
    try {
      await sendChatMessage(newMessage.trim(), user.id)
      setNewMessage('')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(error.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleReportMessage = async (messageId: string) => {
    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }
    
    if (!confirm('Are you sure you want to report this message?')) return

    const reason = prompt('Please specify the reason for reporting this message:')
    if (!reason) return

    try {
      await reportChatMessage(messageId, user.id, reason.trim())
      alert('Message reported successfully. Our moderators will review it.')
    } catch (error: any) {
      console.error('Failed to report message:', error)
      alert(error.message || 'Failed to report message')
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }
    
    if (!confirm('Are you sure you want to delete this message?')) return

    try {
      await deleteChatMessage(messageId)
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
    } catch (error: any) {
      console.error('Failed to delete message:', error)
      alert(error.message || 'Failed to delete message')
    }
  }

  const canDeleteMessage = (message: ChatMessageWithProfile) => {
    return user && profile && (
      message.user_id === user?.id || 
      profile.is_admin
    )
  }


  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <MessageCircle className="h-5 w-5" />
                  <span>Global Chat</span>
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Connect with fellow students, ask questions, and share knowledge
                </p>
              </div>
              {(!user || isGuest) && (
                <Button
                  size="sm"
                  onClick={() => setShowAuthModal(true)}
                >
                  Sign In to Chat
                </Button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="flex justify-center">
                <LoadingSpinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <MessageCircle className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${user && message.user_id === user.id ? 'justify-end' : 'justify-start'} group`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative ${
                      user && message.user_id === user.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {/* Username and timestamp */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span className="text-xs font-medium opacity-75">
                          {message.profiles?.username || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs opacity-75">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </span>
                        
                        {/* Action buttons - only show for authenticated users */}
                        {user && !isGuest && (
                          <div className="flex space-x-1">
                            {message.user_id !== user.id && (
                              <button
                                onClick={() => handleReportMessage(message.id)}
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                                title="Report message"
                              >
                                <Flag className="h-3 w-3" />
                              </button>
                            )}
                            
                            {canDeleteMessage(message) && (
                              <button
                                onClick={() => handleDeleteMessage(message.id)}
                                className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity text-red-400 hover:text-red-500"
                                title="Delete message"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Message content */}
                    <p className="text-sm break-words">{message.message}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="border-t border-gray-200 p-4">
            {user && !isGuest ? (
              <>
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
                    className="flex items-center space-x-2"
                  >
                    <Send className="h-4 w-4" />
                    <span>Send</span>
                  </Button>
                </form>
                <p className="text-xs text-gray-500 mt-2">
                  Be respectful and follow community guidelines. Inappropriate messages will be removed.
                </p>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-600 mb-3">
                  You're viewing the chat as a guest. Sign in to participate in the conversation.
                </p>
                <Button onClick={() => setShowAuthModal(true)}>
                  Sign In to Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </>
  )
}

export default ChatRoom