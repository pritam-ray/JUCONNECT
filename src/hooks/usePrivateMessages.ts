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

  // Load conversations with rate limiting
  const loadConversations = useCallback(async () => {
    if (!userId) return

    // Rate limiting - only allow loading conversations once every 5 seconds
    const now = Date.now()
    const lastLoad = parseInt(sessionStorage.getItem(`last-conversations-load-${userId}`) || '0')
    if (now - lastLoad < 5000) {
      console.log('Conversations load rate limited')
      return
    }
    sessionStorage.setItem(`last-conversations-load-${userId}`, now.toString())

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

  // Helper to get current conversation user ID
  const getCurrentConversationUserId = useCallback(() => {
    if (currentConversation.length === 0) return null
    const firstMessage = currentConversation[0]
    return firstMessage.sender_id === userId ? firstMessage.recipient_id : firstMessage.sender_id
  }, [currentConversation, userId])

  // Set up minimal real-time subscription for this user's messages
  // ONLY subscribe when user is actively viewing messages
  useEffect(() => {
    if (!userId || !supabase) return

    // SIMPLIFIED: Only minimal real-time subscription
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
    }

    // Only subscribe if we have active conversations loaded
    if (conversations.length === 0) {
      console.log('No conversations loaded, skipping real-time subscription')
      return
    }

    // Create simplified subscription for new messages only
    const channel = supabase
      .channel(`private_messages_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `recipient_id.eq.${userId}` // Only listen for messages TO this user
        },
        async (payload) => {
          const newMessage = payload.new as PrivateMessage
          
          // Simple notification without immediate reload
          console.log('New private message received from:', newMessage.sender_id)
          
          // Only refresh if this is for an active conversation
          const isActiveConversation = conversations.some(conv => 
            conv.otherUser.id === newMessage.sender_id
          )
          
          if (isActiveConversation) {
            // Debounced refresh - only once every 5 seconds
            const now = Date.now()
            const lastUpdate = parseInt(sessionStorage.getItem(`last-rt-update-${userId}`) || '0')
            if (now - lastUpdate > 5000) {
              sessionStorage.setItem(`last-rt-update-${userId}`, now.toString())
              await loadConversations()
            }
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current && supabase) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [userId, loadConversations, loadConversation, getCurrentConversationUserId])

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
