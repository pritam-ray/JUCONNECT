import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Send, 
  Paperclip, 
  Users, 
  ArrowLeft, 
  Reply,
  Download,
  File,
  Image,
  X,
  LogOut,
  Crown
} from 'lucide-react'
import { 
  getGroupMessages, 
  sendGroupMessage, 
  markGroupMessagesAsRead,
  getGroupMembers,
  joinClassGroup,
  leaveClassGroup,
  isGroupAdmin,
  ClassGroupWithDetails,
  GroupMessageWithProfile,
  GroupMemberWithProfile
} from '../../services/classGroupService'
import { uploadGroupFile, deleteGroupFile } from '../../services/groupFileService'
import { debugGroupAccess } from '../../services/debugGroupService'
import { useRealtimeGroupMessages, useRealtimeGroupMembers } from '../../hooks/useRealtime'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import GroupAdminPanel from './GroupAdminPanel'

interface OptimisticGroupMessage extends GroupMessageWithProfile {
  isOptimistic?: boolean
}

interface GroupChatInterfaceProps {
  group: ClassGroupWithDetails
  onBack: () => void
  onLeaveGroup?: () => void
}

const GroupChatInterface: React.FC<GroupChatInterfaceProps> = ({
  group,
  onBack,
  onLeaveGroup
}) => {
  const { user, loading: authLoading } = useAuth()
  const [messages, setMessages] = useState<OptimisticGroupMessage[]>([])
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [leavingGroup, setLeavingGroup] = useState(false)
  const [replyTo, setReplyTo] = useState<GroupMessageWithProfile | null>(null)
  const [showMembers, setShowMembers] = useState(false)
  const [showAdminPanel, setShowAdminPanel] = useState(false)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Show error if user is not available after loading
  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-600">Authentication required</div>
      </div>
    )
  }

  useEffect(() => {
    if (group.id && user) {
      console.log('Loading group chat for:', group.name)
      console.log('Group ID:', group.id, 'User ID:', user.id)
      
      // Debug group access
      debugGroupAccess(group.id, user.id)
      
      loadMessages()
      loadMembers()
      checkAdminStatus()

      // Mark messages as read when component mounts
      markGroupMessagesAsRead(group.id, user.id)
    }
  }, [group.id, user])

  // Real-time message handlers
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prev => {
      // Check if this message replaces an optimistic one
      const optimisticIndex = prev.findIndex(msg => 
        msg.isOptimistic && 
        msg.user_id === message.user_id &&
        msg.message === message.message &&
        Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000 // Within 5 seconds
      )
      
      if (optimisticIndex !== -1) {
        // Replace optimistic message with real one
        const newMessages = [...prev]
        newMessages[optimisticIndex] = message
        return newMessages
      } else {
        // Add new message if it's not replacing an optimistic one
        const isDuplicate = prev.some(msg => msg.id === message.id)
        if (!isDuplicate) {
          return [...prev, message]
        }
        return prev
      }
    })
    scrollToBottom()
  }, [])

  const handleMessageUpdate = useCallback((updatedMessage: any) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === updatedMessage.id ? { ...msg, ...updatedMessage } : msg
      )
    )
  }, [])

  const handleMessageDelete = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId))
  }, [])

  // Real-time member handlers
  const handleMemberJoin = useCallback((member: any) => {
    setMembers(prev => [...prev, member])
  }, [])

  const handleMemberLeave = useCallback((userId: string) => {
    setMembers(prev => prev.filter(member => member.user_id !== userId))
  }, [])

  const handleMemberUpdate = useCallback((updatedMember: any) => {
    setMembers(prev => 
      prev.map(member => 
        member.user_id === updatedMember.user_id ? { ...member, ...updatedMember } : member
      )
    )
  }, [])

  // Set up real-time subscriptions
  useRealtimeGroupMessages(
    group.id,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    {
      enabled: !!group.id,
      onError: (error) => console.error('Real-time messages error:', error)
    }
  )

  useRealtimeGroupMembers(
    group.id,
    handleMemberJoin,
    handleMemberLeave,
    handleMemberUpdate,
    {
      enabled: !!group.id,
      onError: (error) => console.error('Real-time members error:', error)
    }
  )

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const checkAdminStatus = async () => {
    if (!user) return
    
    try {
      const adminStatus = await isGroupAdmin(group.id, user.id)
      setIsUserAdmin(adminStatus || group.created_by === user.id)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsUserAdmin(group.created_by === user.id)
    }
  }

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
          // Only auto-join if group is not password protected
          if (!group.is_password_protected) {
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
          } else {
            console.log('Group is password protected, user needs to join manually')
            setError('This group is password protected. Please join from the groups list.')
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

  const handleLeaveGroup = async () => {
    if (!user || !group.id) return

    const confirmLeave = window.confirm(
      `Are you sure you want to leave "${group.name}"? You'll need to rejoin to see messages and participate in the group.`
    )

    if (!confirmLeave) return

    try {
      setLeavingGroup(true)
      setError(null)
      
      await leaveClassGroup(group.id, user.id)
      
      // Call parent callback to handle navigation
      if (onLeaveGroup) {
        onLeaveGroup()
      } else {
        // Fallback to going back
        onBack()
      }
    } catch (error: any) {
      console.error('Failed to leave group:', error)
      setError(error.message || 'Failed to leave group. Please try again.')
    } finally {
      setLeavingGroup(false)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const optimisticMessage: OptimisticGroupMessage = {
      id: tempMessageId,
      group_id: group.id,
      user_id: user.id,
      message: newMessage.trim(),
      message_type: 'text',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      reply_to: replyTo?.id || null,
      file_url: null,
      file_name: null,
      file_size: null,
      is_edited: false,
      profiles: {
        id: user.id,
        username: user.user_metadata?.username || user.email?.split('@')[0] || 'Anonymous',
        full_name: user.user_metadata?.full_name || user.user_metadata?.username || 'Anonymous User',
        avatar_url: user.user_metadata?.avatar_url || null
      },
      isOptimistic: true
    }

    try {
      setSending(true)
      console.log('Attempting to send message...')
      
      // Optimistically add the message to UI immediately
      setMessages(prev => [...prev, optimisticMessage])
      setNewMessage('')
      setReplyTo(null)
      
      await sendGroupMessage(
        group.id,
        user.id,
        newMessage.trim(),
        'text',
        undefined,
        replyTo?.id
      )
      
      console.log('Message sent successfully')
    } catch (error: any) {
      console.error('Failed to send message:', error)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempMessageId))
      // Restore the message text and reply context
      setNewMessage(optimisticMessage.message)
      setReplyTo(replyTo)
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

    try {
      setUploadingFile(true)
      setError(null)
      console.log('📤 Uploading file:', file.name)

      // Upload file to group
      const fileRecord = await uploadGroupFile({
        file,
        groupId: group.id,
        userId: user.id
      })

      // Create message with file data for immediate UI update
      const fileMessage: GroupMessageWithProfile = {
        id: fileRecord.id,
        group_id: fileRecord.group_id,
        user_id: fileRecord.user_id,
        message: `📎 ${file.name}`,
        message_type: 'file',
        file_url: fileRecord.file_url,
        file_name: fileRecord.file_name,
        file_size: fileRecord.file_size,
        created_at: fileRecord.created_at,
        updated_at: fileRecord.created_at,
        reply_to: null,
        is_edited: false,
        profiles: {
          id: user.id,
          username: user.user_metadata?.username || user.email?.split('@')[0] || 'User',
          full_name: user.user_metadata?.full_name || user.user_metadata?.username || 'User',
          avatar_url: user.user_metadata?.avatar_url
        }
      }

      // Add to messages
      setMessages(prev => [...prev, fileMessage])
      scrollToBottom()

      console.log('✅ File uploaded successfully:', file.name)

      // Reload messages to ensure consistency
      setTimeout(() => {
        loadMessages()
      }, 1000)

    } catch (error: any) {
      console.error('❌ Failed to upload file:', error)
      setError(`Failed to upload file: ${error.message || 'Unknown error'}`)
      setTimeout(() => setError(null), 5000)
    } finally {
      setUploadingFile(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteFile = async (messageId: string) => {
    if (!user) return

    try {
      console.log('🗑️ Deleting file message:', messageId)
      
      await deleteGroupFile(messageId, user.id)
      
      // Remove from UI
      setMessages(prev => prev.filter(msg => msg.id !== messageId))
      
      console.log('✅ File deleted successfully')
      
    } catch (error: any) {
      console.error('❌ Failed to delete file:', error)
      setError(`Failed to delete file: ${error.message || 'Unknown error'}`)
      setTimeout(() => setError(null), 5000)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4" />
    }
    return <File className="h-4 w-4" />
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to groups"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{group.name}</h3>
            <p className="text-sm text-gray-500">
              {members.length} members
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {(isUserAdmin || group.created_by === user?.id) && (
            <button
              onClick={() => setShowAdminPanel(true)}
              className="p-2 hover:bg-yellow-50 rounded-lg transition-colors group"
              title="Group Administration"
            >
              <Crown className="h-5 w-5 text-yellow-600 group-hover:text-yellow-700" />
            </button>
          )}
          
          <button
            onClick={() => setShowMembers(!showMembers)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="View members"
          >
            <Users className="h-5 w-5 text-gray-600" />
          </button>
          
          <button
            onClick={handleLeaveGroup}
            disabled={leavingGroup}
            className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
            title="Leave group"
          >
            {leavingGroup ? (
              <div className="h-5 w-5 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
            ) : (
              <LogOut className="h-5 w-5 text-red-600 group-hover:text-red-700" />
            )}
          </button>
        </div>
      </div>

      {/* Data Retention Info Banner */}
      <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
        <p className="text-xs text-blue-700 text-center">
          📅 Messages and files in this group are automatically deleted after 2 weeks to manage storage space
        </p>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col">
          {/* Error Banner */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4 mb-0">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
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
                              ? `bg-primary-600 text-white ${message.isOptimistic ? 'opacity-70' : ''}`
                              : 'bg-gray-100 text-gray-900'
                          } ${message.isOptimistic ? 'animate-pulse' : ''}`}
                        >
                          {message.message_type === 'file' ? (
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                {getFileIcon(message.file_name || '')}
                                <span className="text-sm font-medium">
                                  {message.file_name}
                                </span>
                                {isOwn && (
                                  <button
                                    onClick={() => handleDeleteFile(message.id)}
                                    className="text-red-300 hover:text-red-100 p-1"
                                    title="Delete file"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              
                              <div className="text-xs opacity-75">
                                {formatFileSize(message.file_size || 0)}
                              </div>
                              
                              {message.file_url && (
                                <a
                                  href={message.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center space-x-1 text-xs ${
                                    isOwn ? 'text-blue-100 hover:text-white' : 'text-blue-600 hover:text-blue-800'
                                  }`}
                                >
                                  <Download className="h-3 w-3" />
                                  <span>Download</span>
                                </a>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{message.message}</p>
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
                disabled={uploadingFile}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Attach file"
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
                  disabled={sending || uploadingFile}
                />
              </div>
              
              <Button
                onClick={handleSendMessage}
                disabled={(!newMessage.trim() && !uploadingFile) || sending || uploadingFile}
                loading={sending || uploadingFile}
                className="px-4 py-3"
              >
                {sending || uploadingFile ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {uploadingFile && (
              <div className="mt-2 text-sm text-gray-600 flex items-center space-x-2">
                <LoadingSpinner size="sm" />
                <span>Uploading file...</span>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
        </div>

        {/* Members Sidebar */}
        {showMembers && (
          <div className="w-64 border-l border-gray-200 bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h4 className="font-medium text-gray-900 mb-4">
                Members ({members.length})
              </h4>
              
              {/* Leave Group Button */}
              <button
                onClick={handleLeaveGroup}
                disabled={leavingGroup}
                className="w-full mb-4 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
              >
                {leavingGroup ? (
                  <>
                    <div className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="h-4 w-4" />
                    <span>Leave Group</span>
                  </>
                )}
              </button>
              
              <div className="space-y-2">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100">
                    <div className="relative">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {member.profiles?.full_name?.charAt(0) || '?'}
                        </span>
                      </div>
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
      
      {/* Group Admin Panel */}
      <GroupAdminPanel
        group={group}
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        onGroupUpdated={() => {
          checkAdminStatus()
          loadMembers()
          // Optionally reload group data if needed
        }}
      />
    </div>
  )
}

export default GroupChatInterface