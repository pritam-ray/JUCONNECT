import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Flag, Trash2, User, MessageCircle, AlertCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { reportChatMessage } from '../../services/reportingService'
import { deleteChatMessage, getChatMessages, sendChatMessage } from '../../services/chatService'
import { useRealtimeChatMessages } from '../../hooks/useRealtime'
import AuthModal from '../ui/AuthModal'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

const ChatRoom: React.FC = () => {
  const { user, profile, isGuest } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true)
        const initialMessages = await getChatMessages()
        // Reverse to show oldest first (newest at bottom)
        setMessages(initialMessages ? initialMessages.reverse() : [])
      } catch (error) {
        console.error('Failed to load messages:', error)
        setError('Failed to load chat messages')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()
  }, [])

  // Real-time message subscription
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prevMessages => [...prevMessages, message])
  }, [])

  const handleMessageUpdate = useCallback((updatedMessage: any) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => 
        msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
      )
    )
  }, [])

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prevMessages => 
      prevMessages.filter(msg => msg.id !== messageId)
    )
  }, [])

  useRealtimeChatMessages(
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    {
      enabled: true,
      onError: (error) => {
        console.error('Real-time subscription error:', error)
        setError('Real-time updates unavailable')
      }
    }
  )

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }

    try {
      setSending(true)
      setError(null)

      // Send message to server - real-time subscription will handle adding it to the UI
      await sendChatMessage(newMessage.trim(), user.id)
      setNewMessage('')

    } catch (error) {
      console.error('Failed to send message:', error)
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleReport = async (messageId: string) => {
    if (!user || isGuest) {
      setShowAuthModal(true)
      return
    }

    const reason = prompt('Please provide a reason for reporting this message:')
    if (!reason) return

    try {
      await reportChatMessage(messageId, user.id, reason)
      alert('Message reported successfully')
    } catch (error) {
      console.error('Failed to report message:', error)
      alert('Failed to report message')
    }
  }

  const handleDelete = async (messageId: string) => {
    if (!user || !profile?.is_admin) return

    if (confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteChatMessage(messageId)
        setMessages(prev => prev.filter(msg => msg.id !== messageId))
      } catch (error) {
        console.error('Failed to delete message:', error)
        alert('Failed to delete message')
      }
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
            <h1 className="text-2xl font-bold text-white">JU Connect Chat</h1>
            <p className="text-primary-100">Loading chat messages...</p>
          </div>
          <div className="p-8 flex justify-center">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-primary-500 to-primary-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <MessageCircle className="h-6 w-6" />
                JU Connect Chat
              </h1>
              <p className="text-primary-100">
                Chat disabled real-time for better app performance
              </p>
            </div>
            <div className="text-white text-sm">
              {messages.length} messages
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
        <div className="h-96 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No messages yet. Be the first to start the conversation!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 p-3 rounded-lg transition-all duration-200 ${
                  message.is_flagged
                    ? 'bg-red-50 border border-red-200'
                    : 'hover:bg-gray-50'
                }`}
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
                  <p className={`text-gray-700 ${message.is_flagged ? 'line-through opacity-60' : ''}`}>
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

        {/* Message input */}
        <div className="p-4 border-t bg-gray-50">
          {user && !isGuest ? (
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send)"
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={2}
                  disabled={sending}
                />
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {sending ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">Sign in to join the conversation</p>
              <Button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  )
}

export default ChatRoom
