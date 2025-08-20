import { useEffect, useRef, useState, useCallback } from 'react'
import { realtimeService } from '../services/realtimeService'
import { useAuth } from '../contexts/AuthContext'

interface UseRealtimeOptions {
  onError?: (error: Error) => void
  autoConnect?: boolean
  bufferMessages?: boolean
}

interface ConnectionStatus {
  isConnected: boolean
  reconnectAttempts: number
  lastError?: Error
}

/**
 * Hook for managing real-time global chat messages
 */
export function useGlobalChat(options: UseRealtimeOptions = {}) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  })
  const [loading, setLoading] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const messageBufferRef = useRef<any[]>([])

  const handleNewMessage = useCallback((message: any) => {
    setMessages(prev => {
      // Remove any temporary/optimistic messages with the same content
      const filtered = prev.filter(msg => 
        !msg.id.startsWith('temp-') || msg.message !== message.message
      )
      
      // Add new message if it doesn't already exist
      const exists = filtered.some(msg => msg.id === message.id)
      if (!exists) {
        return [...filtered, message].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      return filtered
    })
  }, [])

  const handleOptimisticMessage = useCallback((tempMessage: any) => {
    if (options.bufferMessages) {
      messageBufferRef.current.push(tempMessage)
    } else {
      setMessages(prev => [...prev, tempMessage])
    }
  }, [options.bufferMessages])

  const handleError = useCallback((error: Error) => {
    setConnectionStatus(prev => ({ ...prev, lastError: error }))
    options.onError?.(error)
  }, [options.onError])

  const connect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    setLoading(true)
    
    const unsubscribe = realtimeService.subscribeToGlobalChat(
      handleNewMessage,
      handleError
    )
    
    unsubscribeRef.current = unsubscribe
    setLoading(false)
  }, [handleNewMessage, handleError])

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setConnectionStatus({ isConnected: false, reconnectAttempts: 0 })
  }, [])

  const sendMessage = useCallback(async (message: string) => {
    if (!user) throw new Error('User not authenticated')
    
    try {
      await realtimeService.sendGlobalMessage(
        user.id,
        message,
        handleOptimisticMessage
      )
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp-')))
      throw error
    }
  }, [user, handleOptimisticMessage])

  const clearMessages = useCallback(() => {
    setMessages([])
    messageBufferRef.current = []
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect, options.autoConnect])

  // Connection status monitoring
  useEffect(() => {
    const unsubscribe = realtimeService.onConnectionChange((channelName, isConnected) => {
      if (channelName === 'global-chat') {
        setConnectionStatus(prev => ({ ...prev, isConnected }))
      }
    })

    return unsubscribe
  }, [])

  return {
    messages,
    connectionStatus,
    loading,
    sendMessage,
    connect,
    disconnect,
    clearMessages
  }
}

/**
 * Hook for managing real-time private messages
 */
export function usePrivateMessages(options: UseRealtimeOptions = {}) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Map<string, any[]>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  })
  const [loading, setLoading] = useState(false)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handleNewMessage = useCallback((message: any) => {
    const otherUserId = message.sender_id === user?.id ? message.recipient_id : message.sender_id
    
    setConversations(prev => {
      const newConversations = new Map(prev)
      const existingMessages = newConversations.get(otherUserId) || []
      
      // Remove any temporary messages and add the real one
      const filtered = existingMessages.filter(msg => 
        !msg.id.startsWith('temp-') || msg.message !== message.message
      )
      
      const exists = filtered.some(msg => msg.id === message.id)
      if (!exists) {
        const updated = [...filtered, message].sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        newConversations.set(otherUserId, updated)
      }
      
      return newConversations
    })
  }, [user?.id])

  const handleOptimisticMessage = useCallback((tempMessage: any, otherUserId: string) => {
    setConversations(prev => {
      const newConversations = new Map(prev)
      const existingMessages = newConversations.get(otherUserId) || []
      newConversations.set(otherUserId, [...existingMessages, tempMessage])
      return newConversations
    })
  }, [])

  const handleError = useCallback((error: Error) => {
    setConnectionStatus(prev => ({ ...prev, lastError: error }))
    options.onError?.(error)
  }, [options.onError])

  const connect = useCallback(() => {
    if (!user) return

    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    setLoading(true)
    
    const unsubscribe = realtimeService.subscribeToPrivateMessages(
      user.id,
      handleNewMessage,
      handleError
    )
    
    unsubscribeRef.current = unsubscribe
    setLoading(false)
  }, [user, handleNewMessage, handleError])

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setConnectionStatus({ isConnected: false, reconnectAttempts: 0 })
  }, [])

  const sendMessage = useCallback(async (recipientId: string, message: string) => {
    if (!user) throw new Error('User not authenticated')
    
    try {
      await realtimeService.sendPrivateMessage(
        user.id,
        recipientId,
        message,
        (tempMessage) => handleOptimisticMessage(tempMessage, recipientId)
      )
    } catch (error) {
      // Remove optimistic message on error
      setConversations(prev => {
        const newConversations = new Map(prev)
        const messages = newConversations.get(recipientId) || []
        const filtered = messages.filter(msg => !msg.id.startsWith('temp-'))
        newConversations.set(recipientId, filtered)
        return newConversations
      })
      throw error
    }
  }, [user, handleOptimisticMessage])

  const getConversation = useCallback((otherUserId: string) => {
    return conversations.get(otherUserId) || []
  }, [conversations])

  const clearConversation = useCallback((otherUserId: string) => {
    setConversations(prev => {
      const newConversations = new Map(prev)
      newConversations.delete(otherUserId)
      return newConversations
    })
  }, [])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false && user) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect, options.autoConnect, user])

  // Connection status monitoring
  useEffect(() => {
    if (!user) return

    const unsubscribe = realtimeService.onConnectionChange((channelName, isConnected) => {
      if (channelName === `private-messages-${user.id}`) {
        setConnectionStatus(prev => ({ ...prev, isConnected }))
      }
    })

    return unsubscribe
  }, [user])

  return {
    conversations,
    connectionStatus,
    loading,
    sendMessage,
    getConversation,
    connect,
    disconnect,
    clearConversation
  }
}

/**
 * Hook for monitoring user online status
 */
export function useUserStatus(options: UseRealtimeOptions = {}) {
  const [userStatuses, setUserStatuses] = useState<Map<string, boolean>>(new Map())
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isConnected: false,
    reconnectAttempts: 0
  })
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const handleStatusChange = useCallback((userId: string, isOnline: boolean) => {
    setUserStatuses(prev => {
      const newStatuses = new Map(prev)
      newStatuses.set(userId, isOnline)
      return newStatuses
    })
  }, [])

  const handleError = useCallback((error: Error) => {
    setConnectionStatus(prev => ({ ...prev, lastError: error }))
    options.onError?.(error)
  }, [options.onError])

  const connect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }
    
    const unsubscribe = realtimeService.subscribeToUserStatus(
      handleStatusChange,
      handleError
    )
    
    unsubscribeRef.current = unsubscribe
  }, [handleStatusChange, handleError])

  const disconnect = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }
    setConnectionStatus({ isConnected: false, reconnectAttempts: 0 })
  }, [])

  const getUserStatus = useCallback((userId: string) => {
    return userStatuses.get(userId) || false
  }, [userStatuses])

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [connect, disconnect, options.autoConnect])

  // Connection status monitoring
  useEffect(() => {
    const unsubscribe = realtimeService.onConnectionChange((channelName, isConnected) => {
      if (channelName === 'user-status') {
        setConnectionStatus(prev => ({ ...prev, isConnected }))
      }
    })

    return unsubscribe
  }, [])

  return {
    userStatuses,
    connectionStatus,
    getUserStatus,
    connect,
    disconnect
  }
}