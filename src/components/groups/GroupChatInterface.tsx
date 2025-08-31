import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Send, 
  Paperclip, 
  Users, 
  ArrowLeft,
  Crown,
  Download,
  FileText,
  Image,
  File,
  LogOut,
  X
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
import { useRealtimeGroupMessages } from '../../hooks/useRealtime'
import { useAuth } from '../../contexts/AuthContext'
import { logDatabaseDiagnostic } from '../../utils/databaseDiagnostic'
import { downloadFileSecurely } from '../../services/secureFileService'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import GroupAdminPanel from './GroupAdminPanel'

interface OptimisticGroupMessage extends GroupMessageWithProfile {
  isOptimistic?: boolean
  message_type?: string
  file_url?: string
  file_name?: string
  file_size?: number
  file_type?: string
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
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Real-time message handlers
  const handleNewMessage = useCallback((message: any) => {
    setMessages(prev => {
      // Check if this message replaces an optimistic one
      let optimisticIndex = -1
      
      // For file messages, match by file name and user
      if (message.message_type === 'file') {
        optimisticIndex = prev.findIndex(msg => 
          msg.isOptimistic && 
          msg.user_id === message.user_id &&
          msg.message_type === 'file' &&
          msg.file_name === message.file_name &&
          Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 30000 // Within 30 seconds for file uploads
        )
      } else {
        // For text messages, match by content and user
        optimisticIndex = prev.findIndex(msg => 
          msg.isOptimistic && 
          msg.user_id === message.user_id &&
          msg.message === message.message &&
          Math.abs(new Date(msg.created_at).getTime() - new Date(message.created_at).getTime()) < 5000 // Within 5 seconds
        )
      }
      
      if (optimisticIndex !== -1) {
        // Replace optimistic message with real one
        const newMessages = [...prev]
        newMessages[optimisticIndex] = message
        console.log('🔄 Replaced optimistic message with real one:', message.id)
        return newMessages
      } else {
        // Add new message if it's not replacing an optimistic one
        const isDuplicate = prev.some(msg => msg.id === message.id)
        if (!isDuplicate) {
          console.log('📨 Added new real-time message:', message.id)
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

  // Real-time member handlers (disabled to reduce API load)
  // const handleMemberJoin = useCallback((member: any) => {
  //   setMembers(prev => [...prev, member])
  // }, [])

  // const handleMemberLeave = useCallback((userId: string) => {
  //   setMembers(prev => prev.filter(member => member.user_id !== userId))
  // }, [])

  // const handleMemberUpdate = useCallback((updatedMember: any) => {
  //   setMembers(prev => 
  //     prev.map(member => 
  //       member.user_id === updatedMember.user_id ? { ...member, ...updatedMember } : member
  //     )
  //   )
  // }, [])

        // ESSENTIAL: Keep only real-time messages for active chat
  console.log('🔌 Setting up real-time messages for group:', group?.id, 'user:', user?.id)
  useRealtimeGroupMessages(
    group?.id || null,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    {
      enabled: !!group?.id && !!user,
      onError: (error) => console.error('❌ Real-time messages error:', error),
      onConnected: () => {
        console.log('✅ Real-time messages connected for group:', group?.id)
        setRealtimeConnected(true)
      },
      onDisconnected: () => {
        console.log('⚠️ Real-time messages disconnected for group:', group?.id)
        setRealtimeConnected(false)
      }
    }
  )

  // DISABLED: Real-time member updates (reduce API load)
  // Members can be refreshed manually when needed
  /*
  useRealtimeGroupMembers(
    group?.id || null,
    {
      onMemberJoin: handleMemberJoin,
      onMemberLeave: handleMemberLeave,
      onMemberUpdate: handleMemberUpdate,
      enabled: !!group?.id && !!user && !isGuest,
      onError: (error) => console.error('Real-time members error:', error)
    }
  )
  */

  // Auto-cleanup optimistic messages that are stuck
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        const now = Date.now()
        let hasChanges = false
        
        const cleanedMessages = prev.map(msg => {
          if (msg.isOptimistic) {
            const messageAge = now - new Date(msg.created_at).getTime()
            if (messageAge > 10000) { // 10 seconds old
              console.log('🧹 Auto-cleaning stuck optimistic message:', msg.id)
              hasChanges = true
              return { ...msg, isOptimistic: false }
            }
          }
          return msg
        })
        
        return hasChanges ? cleanedMessages : prev
      })
    }, 5000) // Check every 5 seconds
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // Main useEffect for initialization
  useEffect(() => {
    if (group.id && user) {
      console.log('Loading group chat for:', group.name)
      console.log('Group ID:', group.id, 'User ID:', user.id)
      
      // Run database diagnostic in development
      if (process.env.NODE_ENV === 'development') {
        logDatabaseDiagnostic()
      }
      
      // Initialize all data inline to avoid dependency issues
      const initializeData = async () => {
        try {
          setChatLoading(true)
          setError(null)
          
          // Load messages
          const messagesData = await getGroupMessages(group.id)
          setMessages(messagesData)
          
          // Load members  
          const membersData = await getGroupMembers(group.id)
          setMembers(membersData)
          
          // Check admin status
          const adminStatus = await isGroupAdmin(group.id, user.id)
          setIsUserAdmin(adminStatus || group.creator_id === user.id)
          
          // Mark messages as read
          markGroupMessagesAsRead(group.id, user.id)
          
          // Scroll to bottom after messages are loaded
          setTimeout(() => {
            scrollToBottom()
          }, 100) // Small delay to ensure DOM is updated
          
        } catch (error) {
          console.error('Error initializing group data:', error)
          setError('Failed to load group data. Please try again.')
        } finally {
          setChatLoading(false)
        }
      }
      
      initializeData()
    }
  }, [group.id, group.creator_id, group.name, user?.id, user]) // Include all used properties

  useEffect(() => {
    // Only auto-scroll when not loading and we have messages
    if (!chatLoading && messages.length > 0) {
      // Use setTimeout to ensure DOM is fully rendered
      setTimeout(() => {
        scrollToBottom()
      }, 50)
    }
  }, [messages, chatLoading])

  // Additional effect to scroll when loading finishes
  useEffect(() => {
    if (!chatLoading && messages.length > 0) {
      console.log('Chat loading finished, scrolling to bottom with', messages.length, 'messages')
      setTimeout(() => {
        scrollToBottom()
      }, 200) // Longer delay to ensure all messages are rendered
    }
  }, [chatLoading, messages.length])

  const checkAdminStatus = async () => {
    if (!user) return
    
    try {
      const adminStatus = await isGroupAdmin(group.id, user.id)
      setIsUserAdmin(adminStatus || group.creator_id === user.id)
    } catch (error) {
      console.error('Error checking admin status:', error)
      setIsUserAdmin(group.creator_id === user.id)
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
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      console.log('Scrolling to bottom - ScrollHeight:', container.scrollHeight, 'ClientHeight:', container.clientHeight)
      
      // Use requestAnimationFrame to ensure smooth scrolling after render
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        })
      })
    } else {
      console.warn('Messages container ref not available for scrolling')
    }
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
      created_at: new Date().toISOString(),
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

    // Immediate fallback: Remove optimistic state after 5 seconds if no real-time update
    const fallbackTimeout = setTimeout(() => {
      console.log('🔄 Fallback: Removing optimistic state for message:', tempId)
      setMessages(prev => 
        prev.map(msg => 
          msg.id === tempId 
            ? { ...msg, isOptimistic: false }
            : msg
        )
      )
    }, 5000)

    try {
      const sentMessage = await sendGroupMessage(
        group.id,
        user.id,
        newMessage.trim(),
        'text',
        undefined,
        replyTo?.id
      )
      
      console.log('✅ Message sent successfully:', sentMessage.id)
      
      // Clear the fallback timeout since message was sent successfully
      clearTimeout(fallbackTimeout)
      
      // Immediate manual replacement if realtime doesn't work within 2 seconds
      setTimeout(() => {
        setMessages(prev => {
          const stillOptimistic = prev.find(msg => msg.id === tempId && msg.isOptimistic)
          if (stillOptimistic) {
            console.log('🔄 Manually replacing optimistic message (realtime delayed)')
            return prev.map(msg => 
              msg.id === tempId 
                ? { 
                    ...sentMessage, 
                    profiles: optimisticMessage.profiles,
                    isOptimistic: false 
                  }
                : msg
            )
          }
          return prev
        })
      }, 2000)
      
    } catch (error: any) {
      console.error('❌ Error sending message:', error)
      clearTimeout(fallbackTimeout)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setError('Could not send your message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user || uploadingFile) return

    setUploadingFile(true)

    // Create optimistic file message immediately
    const tempId = `temp-file-${Date.now()}`
    const optimisticFileMessage: OptimisticGroupMessage = {
      id: tempId,
      group_id: group.id,
      user_id: user.id,
      message: `📎 ${file.name}`,
      message_type: 'file',
      file_url: 'uploading', // Placeholder to indicate uploading
      file_name: file.name,
      file_size: file.size,
      created_at: new Date().toISOString(),
      profiles: {
        id: user.id,
        username: user.email?.split('@')[0] || 'user',
        full_name: user.user_metadata?.full_name || 'Unknown User',
        avatar_url: user.user_metadata?.avatar_url
      },
      isOptimistic: true
    }

    // Add optimistic file message immediately
    setMessages(prev => [...prev, optimisticFileMessage])
    setReplyTo(null)
    scrollToBottom()

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
        `📎 ${file.name}`,
        'file',
        uploadResult,
        replyTo?.id
      )
      
      console.log('File message sent:', fileMessage)
      
      // The real-time subscription will replace the optimistic message
    } catch (error: any) {
      console.error('Error uploading file:', error)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      setError('Could not upload your file. Please try again.')
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
      setError('Could not leave the group. Please try again.')
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

  // Helper function to get file icon
  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch (extension) {
      case 'pdf':
        return <FileText className="h-4 w-4 text-red-500" />
      case 'doc':
      case 'docx':
        return <FileText className="h-4 w-4 text-blue-500" />
      case 'txt':
        return <FileText className="h-4 w-4 text-gray-500" />
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <Image className="h-4 w-4 text-green-500" />
      default:
        return <File className="h-4 w-4 text-gray-500" />
    }
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Helper function to handle secure file download
  const handleFileDownload = async (fileUrl: string, fileName: string) => {
    if (!user) {
      console.error('❌ User not authenticated for download')
      setError('Please log in to download files')
      return
    }
    
    if (!group.id) {
      console.error('❌ Group ID not available for download')
      setError('Unable to download file: Group not found')
      return
    }
    
    try {
      console.log('🔒 Initiating secure download for:', fileName)
      console.log('📁 File URL:', fileUrl)
      console.log('👤 User ID:', user.id)
      console.log('👥 Group ID:', group.id)
      
      // Use secure download service to hide Supabase URLs
      await downloadFileSecurely({
        fileUrl,
        fileName,
        userId: user.id,
        groupId: group.id
      })
      
      console.log('✅ Download process completed for:', fileName)
    } catch (error: any) {
      console.error('❌ Download failed:', error.message)
      setError(`Failed to download ${fileName}: ${error.message}`)
    }
  }

  const renderMessage = (message: OptimisticGroupMessage) => {
    const isOwn = message.user_id === user?.id
    const isOptimistic = message.isOptimistic
    const isFileMessage = message.message_type === 'file' && message.file_url
    const isUploading = isFileMessage && message.file_url === 'uploading'

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
          
          {isFileMessage ? (
            <div className="space-y-2">
              <div className={`flex items-center space-x-2 p-2 rounded-md ${
                isOwn ? 'bg-white bg-opacity-10' : 'bg-gray-100'
              }`}>
                {getFileIcon(message.file_name || '')}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{message.file_name}</p>
                  <p className="text-xs opacity-75">
                    {message.file_size ? formatFileSize(message.file_size) : 'Unknown size'}
                  </p>
                  {isUploading && (
                    <p className="text-xs opacity-75 animate-pulse">Uploading...</p>
                  )}
                </div>
                {!isUploading && (
                  <button
                    onClick={() => handleFileDownload(message.file_url!, message.file_name!)}
                    className={`p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors ${
                      isOwn ? 'text-white' : 'text-gray-600'
                    }`}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
              {message.message && message.message !== `📎 ${message.file_name}` && (
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
            {isOptimistic && (
              <span className="text-orange-400">
                {isUploading ? ' (uploading...)' : ' (sending...)'}
                <button 
                  onClick={() => {
                    console.log('👆 Manually confirming message:', message.id)
                    setMessages(prev => 
                      prev.map(msg => 
                        msg.id === message.id 
                          ? { ...msg, isOptimistic: false }
                          : msg
                      )
                    )
                  }}
                  className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  confirm
                </button>
              </span>
            )}
          </p>
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
              {group.year ? `Year ${group.year} - ${group.semester}` : ''}
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
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center">
              <p className="text-lg font-medium">Error Loading Messages</p>
              <p className="text-sm mb-4">{error}</p>
              <Button 
                onClick={() => {
                  setError(null)
                  setChatLoading(true)
                  // Trigger a reload by changing a dependency
                  window.location.reload()
                }}
                className="text-sm"
              >
                Try Again
              </Button>
            </div>
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
