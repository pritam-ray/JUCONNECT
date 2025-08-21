import React, { useState, useEffect, useRef } from 'react'
import { 
  Send, 
  Paperclip, 
  Users, 
  Settings, 
  ArrowLeft, 
  Reply,
  Download
} from 'lucide-react'
import { 
  getGroupMessages, 
  sendGroupMessage, 
  markGroupMessagesAsRead,
  subscribeToGroupMessages,
  getGroupMembers,
  joinClassGroup,
  ClassGroupWithDetails,
  GroupMessageWithProfile,
  GroupMemberWithProfile
} from '../../services/classGroupService'
import { debugGroupAccess } from '../../services/debugGroupService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'

interface GroupChatInterfaceProps {
  group: ClassGroupWithDetails
  onBack: () => void
  onShowSettings: () => void
}

const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  group,
  onBack,
  onShowSettings
}) => {
  const { user } = useAuth()
  const [messages, setMessages] = useState<GroupMessageWithProfile[]>([])
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [replyTo, setReplyTo] = useState<GroupMessageWithProfile | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (group.id && user) {
      console.log('Loading group chat for:', group.name)
      console.log('Group ID:', group.id, 'User ID:', user.id)
      
      // Debug group access
      debugGroupAccess(group.id, user.id)
      
      loadMessages()
      loadMembers()
      
      // Subscribe to new messages
      const unsubscribe = subscribeToGroupMessages(group.id, (newMessage) => {
        setMessages(prev => [...prev, newMessage])
        scrollToBottom()
      })

      // Mark messages as read when component mounts
      markGroupMessagesAsRead(group.id, user.id)

      return unsubscribe
    }
  }, [group.id, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadMessages = async () => {
    if (!group.id) return
    
    try {
      setLoading(true)
      const messagesData = await getGroupMessages(group.id)
      setMessages(messagesData || [])
    } catch (error) {
      console.error('Failed to load messages:', error)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!group.id) return
    
    try {
      const membersData = await getGroupMembers(group.id)
      setMembers(membersData || [])
      
      // Check if current user is a member
      if (user && membersData) {
        const isUserMember = membersData.some(member => member.user_id === user.id)
        
        if (!isUserMember) {
          console.log('User is not a member, attempting to add...')
          try {
            await joinClassGroup(group.id, user.id)
            console.log('User added to group successfully')
            // Reload members after adding user
            const updatedMembers = await getGroupMembers(group.id)
            setMembers(updatedMembers || [])
          } catch (error) {
            console.error('Failed to add user to group:', error)
          }
        }
      }
    } catch (error) {
      console.error('Failed to load members:', error)
      setMembers([])
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    try {
      setSending(true)
      console.log('Attempting to send message...')
      
      await sendGroupMessage(
        group.id,
        user.id,
        newMessage.trim(),
        'text',
        undefined,
        replyTo?.id
      )
      
      setNewMessage('')
      setReplyTo(null)
      console.log('Message sent successfully')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      alert(`Failed to send message: ${error.message || 'Unknown error'}`)
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // TODO: Implement file upload functionality
    console.log('File upload:', file)
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    }
  }

  const isUserAdmin = group.user_role === 'admin'
  const onlineMembers = members.filter(m => m.profiles?.is_online).length

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-500">
              {group.member_count} members • {onlineMembers} online
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View members"
          >
            <Users className="h-5 w-5 text-gray-600" />
          </button>
          
          {isUserAdmin && (
            <button
              onClick={onShowSettings}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Group settings"
            >
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size="lg" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to {group.name}!
                </h3>
                <p className="text-gray-600">
                  Start the conversation by sending your first message
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.user_id === user?.id
                const showAvatar = index === 0 || messages[index - 1].user_id !== message.user_id
                
                return (
                  <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex space-x-2 max-w-xs md:max-w-md ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      {/* Avatar */}
                      <div className={`w-8 h-8 ${showAvatar ? 'visible' : 'invisible'}`}>
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-white">
                            {message.profiles?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>

                      {/* Message */}
                      <div className="flex flex-col">
                        {showAvatar && !isOwn && (
                          <span className="text-xs text-gray-500 mb-1 px-3">
                            {message.profiles?.full_name || 'Unknown User'}
                          </span>
                        )}
                        
                        {/* Reply indicator */}
                        {message.reply_to_message && (
                          <div className={`text-xs p-2 rounded-lg mb-1 ${
                            isOwn ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <div className="flex items-center space-x-1">
                              <Reply className="h-3 w-3" />
                              <span>@{message.reply_to_message.user_name}</span>
                            </div>
                            <p className="truncate">{message.reply_to_message.message}</p>
                          </div>
                        )}
                        
                        <div
                          className={`px-3 py-2 rounded-2xl ${
                            isOwn
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                          
                          {/* File attachment */}
                          {message.file_url && (
                            <div className="mt-2 p-2 bg-black/10 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <Paperclip className="h-4 w-4" />
                                <span className="text-sm">{message.file_name}</span>
                                <button className="p-1 hover:bg-black/10 rounded">
                                  <Download className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className={`flex items-center space-x-2 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-xs text-gray-500">
                            {formatMessageTime(message.created_at)}
                          </span>
                          
                          {!isOwn && (
                            <button
                              onClick={() => setReplyTo(message)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply indicator */}
          {replyTo && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Reply className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    Replying to @{replyTo.profiles?.username}
                  </span>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>
              <p className="text-sm text-gray-500 truncate mt-1">{replyTo.message}</p>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-end space-x-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={1}
                  disabled={sending}
                />
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                loading={sending}
                className="px-4 py-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.png"
          />
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                Members ({members.length})
              </h4>
              
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {member.profiles?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
                      {member.profiles?.is_online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.profiles?.full_name || 'Unknown User'}
                      </p>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs text-gray-500">
                          @{member.profiles?.username}
                        </p>
                        {member.role === 'admin' && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupChatInterface