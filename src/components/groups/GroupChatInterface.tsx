import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  Send, 
  Paperclip, 
  Users, 
  ArrowLeft, 
  Crown, 
  LogOut, 
  X, 
  File, 
  FileText, 
  Image, 
  Download,
  MoreVertical,
  MessageCircle
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
import { downloadFileSecurely } from '../../services/secureFileService'
import Button from '../ui/Button'
import LoadingSpinner from '../ui/LoadingSpinner'
import GroupAdminPanel from './GroupAdminPanel'
import { circuitBreaker } from '../../utils/circuitBreaker'

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
  useRealtimeGroupMessages(
    group?.id || null,
    handleNewMessage,
    handleMessageUpdate,
    handleMessageDelete,
    {
      enabled: !!group?.id && !!user && !chatLoading,
      onError: (error) => {
        console.error('Real-time messages error:', error)
      },
      onConnected: () => {
        setRealtimeConnected(true)
      },
      onDisconnected: () => {
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

  // Auto-cleanup optimistic messages that are stuck - REDUCED frequency to prevent API spam
  useEffect(() => {
    // Significantly longer intervals to reduce resource usage
    const cleanupInterval = setInterval(() => {
      setMessages(prev => {
        const now = Date.now()
        let hasChanges = false
        
        const cleanedMessages = prev.map(msg => {
          if (msg.isOptimistic) {
            const messageAge = now - new Date(msg.created_at).getTime()
            if (messageAge > 30000) { // Increased to 30 seconds
              console.log('🧹 Auto-cleaning stuck optimistic message:', msg.id)
              hasChanges = true
              return { ...msg, isOptimistic: false }
            }
          }
          return msg
        })
        
        return hasChanges ? cleanedMessages : prev
      })
    }, 60000) // Increased from 5-10 seconds to 60 seconds - 80% reduction
    
    return () => clearInterval(cleanupInterval)
  }, [])

  // Main useEffect for initialization
  useEffect(() => {
    if (group.id && user) {
      // Initialize all data inline to avoid dependency issues
      const initializeData = async () => {
        try {
          setChatLoading(true)
          setError(null)
          
          // Immediately scroll to bottom to prevent flash of old messages
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
          }
          
          // Try to load messages
          try {
            const messagesData = await getGroupMessages(group.id)
            setMessages(messagesData)
          } catch (messagesError) {
            console.error('Failed to load messages:', messagesError)
            setMessages([])
          }
          
          // Skip members and admin status for now
          setMembers([])
          setIsUserAdmin(false)
          
          // Instant scroll to bottom after messages are loaded (no animation to prevent flash)
          setTimeout(() => {
            scrollToBottom('instant')
          }, 50)
          
        } catch (error) {
          console.error('Error initializing group data:', error)
          setError(`Failed to load group data. ${error instanceof Error ? error.message : 'Please try again.'}`)
        } finally {
          setChatLoading(false)
        }
      }
      
      initializeData()
    }
  }, [group.id, group.creator_id, group.name, user?.id, user])

  useEffect(() => {
    // Only auto-scroll when not loading and we have messages
    if (!chatLoading && messages.length > 0) {
      // Use setTimeout to ensure DOM is fully rendered, but use instant scroll to prevent flash
      setTimeout(() => {
        scrollToBottom('instant')
      }, 50)
    }
  }, [messages, chatLoading])

  // Additional effect to scroll when loading finishes
  useEffect(() => {
    if (!chatLoading && messages.length > 0) {
      console.log('Chat loading finished, scrolling to bottom with', messages.length, 'messages')
      setTimeout(() => {
        scrollToBottom('instant')
      }, 100) // Still instant to prevent jarring experience
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
      const groupMembers = await getGroupMembers(group.id)
      setMembers(groupMembers)
    } catch (error: any) {
      console.error('Error loading members:', error)
    }
  }

  const scrollToBottom = (behavior: 'smooth' | 'instant' = 'smooth') => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current
      console.log('Scrolling to bottom - ScrollHeight:', container.scrollHeight, 'ClientHeight:', container.clientHeight)
      
      // Use requestAnimationFrame to ensure smooth scrolling after render
      requestAnimationFrame(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: behavior
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
      
      // Mobile-optimized manual replacement if realtime doesn't work
      const isMobile = window.innerWidth < 768
      const replacementDelay = isMobile ? 3000 : 2000 // Longer delay on mobile
      
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
      }, replacementDelay)
      
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
      setError('Unable to download file: Group not found')
      return
    }
    
    try {
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
        className={`flex mb-3 sm:mb-4 ${isOwn ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`max-w-[85%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 sm:py-3 rounded-2xl break-words overflow-hidden shadow-sm ${
          isOwn 
            ? `bg-blue-500 text-white ${isOptimistic ? 'opacity-70' : ''}` 
            : 'bg-white text-gray-800 border border-gray-200'
        }`}>
          {!isOwn && (
            <p className="text-xs font-semibold mb-1 opacity-75">
              {message.profiles?.full_name || message.profiles?.username || 'Unknown User'}
            </p>
          )}
          
          {isFileMessage ? (
            <div className="space-y-2">
              <div className={`flex items-center space-x-2 p-2 sm:p-3 rounded-lg ${
                isOwn ? 'bg-white bg-opacity-10' : 'bg-gray-50'
              }`}>
                {getFileIcon(message.file_name || '')}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium break-words">{message.file_name}</p>
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
                    className={`p-2 rounded-full hover:bg-white hover:bg-opacity-20 transition-colors touch-manipulation ${
                      isOwn ? 'text-white' : 'text-gray-600'
                    }`}
                    title="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                )}
              </div>
              {message.message && message.message !== `📎 ${message.file_name}` && (
                <p className="text-sm break-words">{message.message}</p>
              )}
            </div>
          ) : (
            <p className="text-sm sm:text-base break-words leading-relaxed">{message.message}</p>
          )}
          
          <p className="text-xs opacity-75 mt-2 flex items-center justify-between">
            <span>
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {isOptimistic && (
              <span className="text-orange-400 ml-2">
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
                  className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline touch-manipulation"
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
      {/* Mobile-First Header */}
      <div className="mobile-group-header sticky top-0 z-20 backdrop-blur-xl bg-white/90 border-b border-gray-200/50 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{group.name}</h2>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {group.year ? `Year ${group.year} - ${group.semester}` : ''}
                {group.subject ? ` • ${group.subject}` : ''}
              </p>
            </div>
          </div>
          
          {/* Mobile-optimized action buttons */}
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMembers(!showMembers)}
              className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
              title="Members"
            >
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="ml-1 text-xs sm:text-sm">{members.length}</span>
            </Button>
            
            {/* Dropdown menu for admin/leave actions on mobile */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdminPanel(!showAdminPanel)}
                className="p-2 hover:bg-gray-100 rounded-full flex-shrink-0"
                title="More options"
              >
                <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
              
              {showAdminPanel && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 min-w-[160px]">
                  {isUserAdmin && (
                    <button
                      onClick={() => {
                        setShowAdminPanel(false)
                        // Handle admin panel toggle
                      }}
                      className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center space-x-2"
                    >
                      <Crown className="w-4 h-4 text-yellow-600" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowAdminPanel(false)
                      handleLeaveGroup()
                    }}
                    disabled={leavingGroup}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center space-x-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Group</span>
                  </button>
                </div>
              )}
            </div>
          </div>
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

      {/* Mobile-Optimized Members Panel */}
      {showMembers && (
        <div className="border-b border-gray-200 bg-gray-50/50 backdrop-blur-sm p-3 sm:p-4 max-h-48 sm:max-h-60 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Members ({members.length})
            </h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-1 hover:bg-gray-200 rounded-full"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          <div className="space-y-3">
            {members.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-white/60">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs sm:text-sm font-medium text-white">
                    {member.profiles?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
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
            ))}
          </div>
        </div>
      )}

      {/* Mobile-Optimized Messages Area */}
      <div ref={messagesContainerRef} className="mobile-group-messages flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 bg-gray-50/30">
        {chatLoading ? (
          <div className="flex items-center justify-center h-full">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-500">
            <div className="text-center p-4">
              <p className="text-base sm:text-lg font-medium mb-2">Error Loading Messages</p>
              <p className="text-sm mb-4 text-gray-600">{error}</p>
              <Button 
                onClick={() => {
                  setError(null)
                  setChatLoading(true)
                  // Trigger a reload by changing a dependency
                  window.location.reload()
                }}
                className="text-sm px-4 py-2"
              >
                Try Again
              </Button>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center p-4">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-base sm:text-lg font-medium mb-2">No messages yet</p>
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
        <div className="p-3 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-blue-600 font-medium">
              Replying to {replyTo.profiles?.full_name || 'Unknown User'}
            </p>
            <p className="text-sm text-gray-700 truncate">
              {replyTo.message}
            </p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-blue-400 hover:text-blue-600 ml-2 p-1 rounded-full hover:bg-blue-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Mobile-First Message Input */}
      <div className="mobile-group-input sticky bottom-0 backdrop-blur-xl bg-white/90 border-t border-gray-200/50 p-3 sm:p-4 pb-safe">
        <div className="flex items-end space-x-2 sm:space-x-3">
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
            className="p-2 sm:p-3 hover:bg-gray-100 rounded-full flex-shrink-0"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          
          <div className="flex-1 relative">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm sm:text-base leading-relaxed bg-white/80 backdrop-blur-sm"
              rows={1}
              disabled={sending}
              style={{
                minHeight: '40px',
                maxHeight: '120px',
                scrollbarWidth: 'thin'
              }}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="p-2 sm:p-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 rounded-full flex-shrink-0 transition-all touch-manipulation"
            title="Send message"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            )}
          </Button>
        </div>
        
        {uploadingFile && (
          <div className="mt-3 text-sm text-blue-600 flex items-center bg-blue-50 p-2 rounded-lg">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Uploading file...
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupChatInterface
