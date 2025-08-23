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
  leaveClassGroup,
  isGroupAdmin,
  ClassGroupWithDetails,
  GroupMessageWithProfile,
  GroupMemberWithProfile
} from '../../services/classGroupService'
import { uploadGroupFile } from '../../services/groupFileService'
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
  const { user, loading } = useAuth()
  const [messages, setMessages] = useState<OptimisticGroupMessage[]>([])
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatLoading, setChatLoading] = useState(true)
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
      enabled: !!group.id && !!user,
      onError: (error) => console.error('Real-time messages error:', error)
    }
  )

  useRealtimeGroupMembers(
    group.id,
    handleMemberJoin,
    handleMemberLeave,
    handleMemberUpdate,
    {
      enabled: !!group.id && !!user,
      onError: (error) => console.error('Real-time members error:', error)
    }
  )

  // Main useEffect for initialization
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
      console.log('Loading messages for group:', group.id)
      const groupMessages = await getGroupMessages(group.id)
      console.log('Loaded messages:', groupMessages.length)
      setMessages(groupMessages)
    } catch (error: any) {
      console.error('Error loading messages:', error)
      setError('Failed to load messages')
    } finally {
      setChatLoading(false)
    }
  }

  const loadMembers = async () => {
    if (!group.id) return
    
    try {
      console.log('Loading members for group:', group.id)
      const groupMembers = await getGroupMembers(group.id)
      console.log('Loaded members:', groupMembers.length)
      setMembers(groupMembers)
    } catch (error: any) {
      console.error('Error loading members:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || sending) return

    setSending(true)
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: OptimisticGroupMessage = {
      id: tempId,
      group_id: group.id,
      user_id: user.id,
      message: newMessage.trim(),
      message_type: 'text',
      file_url: null,
      file_name: null,
      file_size: null,
      reply_to: replyTo?.id || null,
      is_edited: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        full_name: user.user_metadata?.full_name || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url
      },
      isOptimistic: true
    }

    // Add optimistic message immediately
    setMessages(prev => [...prev, optimisticMessage])
    setNewMessage('')
    setReplyTo(null)
    scrollToBottom()

    try {
      const sentMessage = await sendGroupMessage(
        group.id,
        user.id,
        newMessage.trim(),
        'text',
        undefined,
        replyTo?.id
      )
      
      // The real-time subscription will handle updating the message
      console.log('Message sent successfully:', sentMessage.id)
    } catch (error: any) {
      console.error('Error sending message:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || uploadingFile) return

    setUploadingFile(true)

    try {
      console.log('Uploading file:', file.name)
      const uploadResult = await uploadGroupFile({
        file,
        groupId: group.id,
        userId: user.id
      })
      console.log('File uploaded:', uploadResult)

      const fileMessage = await sendGroupMessage(
        group.id,
        user.id,
        `Shared a file: ${file.name}`,
        'file',
        uploadResult,
        replyTo?.id
      )
      
      console.log('File message sent:', fileMessage)
      setReplyTo(null)
    } catch (error: any) {
      console.error('Error uploading file:', error)
      setError('Failed to upload file')
    } finally {
      setUploadingFile(false)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleLeaveGroup = async () => {
    if (!user || leavingGroup) return

    setLeavingGroup(true)
    try {
      await leaveClassGroup(group.id, user.id)
      onLeaveGroup?.()
    } catch (error: any) {
      console.error('Error leaving group:', error)
      setError('Failed to leave group')
    } finally {
      setLeavingGroup(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
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
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="w-4 h-4" />
      default:
        return <File className="w-4 h-4" />
    }
  }

  const handleFileDownload = async (message: GroupMessageWithProfile) => {
    if (!message.file_url) return
    
    try {
      const response = await fetch(message.file_url)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = message.file_name || 'download'
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      setError('Failed to download file')
    }
  }

  const renderMessage = (message: OptimisticGroupMessage) => {
    const isOwn = message.user_id === user?.id
    const isOptimistic = message.isOptimistic

    return (
      <div
        key={message.id}
        className={`flex mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isOwn 
            ? `bg-blue-600 text-white ${isOptimistic ? 'opacity-70' : ''}` 
            : 'bg-gray-200 text-gray-800'
        }`}>
          {!isOwn && (
            <p className="text-xs font-semibold mb-1">
              {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
            </p>
          )}
          
          {message.reply_to && (
            <div className="text-xs opacity-75 mb-2 p-2 bg-black bg-opacity-20 rounded">
              Replying to a message...
            </div>
          )}
          
          {message.message_type === 'file' && message.file_url ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {getFileIcon(message.file_name || '')}
                <span className="text-sm font-medium">
                  {message.file_name}
                </span>
              </div>
              {message.file_size && (
                <p className="text-xs opacity-75">
                  {formatFileSize(message.file_size)}
                </p>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={() => handleFileDownload(message)}
                  className="text-xs bg-black bg-opacity-20 hover:bg-opacity-30 px-2 py-1 rounded flex items-center space-x-1"
                >
                  <Download className="w-3 h-3" />
                  <span>Download</span>
                </button>
              </div>
              {message.message !== `Shared a file: ${message.file_name}` && (
                <p className="text-sm">{message.message}</p>
              )}
            </div>
          ) : (
            <p className="text-sm">{message.message}</p>
          )}
          
          <p className="text-xs opacity-75 mt-1">
            {new Date(message.created_at).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
            {isOptimistic && ' (sending...)'}
          </p>
          
          {!isOwn && (
            <button
              onClick={() => setReplyTo(message)}
              className="text-xs opacity-75 hover:opacity-100 mt-1 flex items-center space-x-1"
            >
              <Reply className="w-3 h-3" />
              <span>Reply</span>
            </button>
          )}
        </div>
      </div>
    )
  }

  // Show loading while auth is loading or user is not available
  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{group.name}</h2>
            <p className="text-sm text-gray-500">
              {group.year && group.section ? `Year ${group.year} - Section ${group.section}` : ''}
              {group.subject ? ` • ${group.subject}` : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMembers(!showMembers)}
            className="p-2"
          >
            <Users className="w-5 h-5" />
            <span className="ml-1 text-sm">{members.length}</span>
          </Button>
          
          {isUserAdmin && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdminPanel(!showAdminPanel)}
              className="p-2 text-yellow-600 hover:text-yellow-700"
            >
              <Crown className="w-5 h-5" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLeaveGroup}
            disabled={leavingGroup}
            className="p-2 text-red-600 hover:text-red-700"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex justify-between items-center">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Admin Panel */}
      {showAdminPanel && isUserAdmin && (
        <div className="border-b border-gray-200">
          <GroupAdminPanel
            group={group}
            isOpen={true}
            onClose={() => setShowAdminPanel(false)}
            onGroupUpdated={() => {
              loadMembers()
              checkAdminStatus()
            }}
          />
        </div>
      )}

      {/* Members Panel */}
      {showMembers && (
        <div className="border-b border-gray-200 bg-gray-50 p-4 max-h-48 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Members ({members.length})
          </h3>
          <div className="space-y-2">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      {member.profiles?.full_name?.charAt(0) || 'U'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.profiles?.full_name || member.profiles?.username || 'Unknown User'}
                    </p>
                    {member.role === 'admin' && (
                      <span className="text-xs text-yellow-600 flex items-center">
                        <Crown className="w-3 h-3 mr-1" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <p className="text-lg font-medium">No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages.map((message) => renderMessage(message))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyTo && (
        <div className="p-3 bg-gray-100 border-t border-gray-200 flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs text-gray-500">
              Replying to {replyTo.profiles?.full_name || 'Unknown User'}
            </p>
            <p className="text-sm text-gray-700 truncate">
              {replyTo.message}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white mb-16 md:mb-0">
        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingFile}
            className="p-2"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={sending}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
        
        {uploadingFile && (
          <div className="mt-2 text-sm text-gray-500 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Uploading file...
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupChatInterface
