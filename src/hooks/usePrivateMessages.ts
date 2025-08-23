import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { sendPrivateMessage, getConversation, getUserConversations } from '../services/privateMessageService'
import { Database } from '../types/database.types'

type PrivateMessage = Database['public']['Tables']['private_messages']['Row']

interface Conversation {
  otherUser: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_online?: boolean
    last_seen?: string
  }
  lastMessage?: PrivateMessage
  unreadCount: number
}

export const usePrivateMessages = (userId: string | null) => {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<PrivateMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const subscriptionRef = useRef<any>(null)

  // Get total unread message count
  const totalUnreadCount = conversations.reduce((total, conv) => total + conv.unreadCount, 0)

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return

    try {
      setLoading(true)
      const convs = await getUserConversations(userId)
      setConversations(convs)
    } catch (error) {
      console.error('Failed to load conversations:', error)
      setError('Failed to load conversations')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Load specific conversation messages
  const loadConversation = useCallback(async (otherUserId: string) => {
    if (!userId) return

    try {
      setLoading(true)
      const messages = await getConversation(userId, otherUserId)
      setCurrentConversation(messages as PrivateMessage[])
    } catch (error) {
      console.error('Failed to load conversation:', error)
      setError('Failed to load conversation')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Send message
  const sendMessage = useCallback(async (recipientId: string, message: string) => {
    if (!userId || !message.trim()) return

    try {
      setSending(true)
      setError(null)
      
      // Send the message
      const newMessage = await sendPrivateMessage(userId, recipientId, message.trim())
      
      // Add to current conversation if it's the active one
      setCurrentConversation(prev => [...prev, newMessage as PrivateMessage])
      
      // Refresh conversations to update unread counts and last message
      await loadConversations()
      
      return newMessage
    } catch (error) {
      console.error('Failed to send message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message')
      throw error
    } finally {
      setSending(false)
    }
  }, [userId, loadConversations])

  // Set up real-time subscription for this user's messages
  useEffect(() => {
    if (!userId || !supabase) return

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    // Create new subscription for private messages
    const channel = supabase
      .channel(`private_messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        },
        async (payload) => {
          const newMessage = payload.new as PrivateMessage
          
          // Refresh conversations to show new message
          await loadConversations()
          
          // If this message is for the current conversation, add it
          const currentOtherUserId = getCurrentConversationUserId()
          if (currentOtherUserId) {
            const isCurrentConversation = 
              (newMessage.sender_id === userId && newMessage.recipient_id === currentOtherUserId) ||
              (newMessage.sender_id === currentOtherUserId && newMessage.recipient_id === userId)
            
            if (isCurrentConversation) {
              // Reload the current conversation to get the full message with profiles
              await loadConversation(currentOtherUserId)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        },
        async () => {
          // Refresh conversations when messages are updated (e.g., marked as read)
          await loadConversations()
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current && supabase) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [userId, loadConversations, loadConversation])

  // Helper to get current conversation user ID
  const getCurrentConversationUserId = useCallback(() => {
    if (currentConversation.length === 0) return null
    const firstMessage = currentConversation[0]
    return firstMessage.sender_id === userId ? firstMessage.recipient_id : firstMessage.sender_id
  }, [currentConversation, userId])

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Start new conversation
  const startNewConversation = useCallback(async (otherUserId: string) => {
    if (!userId) return
    
    // Load the conversation (even if empty) to set up the chat
    await loadConversation(otherUserId)
    
    // Add to conversations if not already there
    const existingConv = conversations.find(c => c.otherUser.id === otherUserId)
    if (!existingConv) {
      // Fetch the other user's profile to create a conversation entry
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, is_online, last_seen')
          .eq('id', otherUserId)
          .single()
        
        if (profile) {
          const newConversation = {
            otherUser: profile,
            lastMessage: undefined,
            unreadCount: 0
          }
          setConversations(prev => [newConversation, ...prev])
        }
      } catch (error) {
        console.error('Error fetching user profile:', error)
      }
    }
  }, [userId, loadConversation, conversations])

  return {
    conversations,
    currentConversation,
    totalUnreadCount,
    loading,
    sending,
    error,
    loadConversations,
    loadConversation,
    sendMessage,
    startNewConversation,
    setCurrentConversation
  }
}
