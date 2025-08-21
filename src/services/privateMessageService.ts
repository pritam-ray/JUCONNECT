import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type PrivateMessage = Database['public']['Tables']['private_messages']['Row']
type PrivateMessageInsert = Database['public']['Tables']['private_messages']['Insert']

// Helper function to ensure supabase is available
const getSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase client not initialized')
  }
  return supabase
}

interface PrivateMessageWithProfile extends PrivateMessage {
  sender?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_online?: boolean
  } | null
  recipient?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_online?: boolean
  } | null
}

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

// Send a private message
export const sendPrivateMessage = async (
  senderId: string,
  recipientId: string,
  message: string
): Promise<PrivateMessage> => {
  if (senderId === recipientId) {
    throw new Error('Cannot send message to yourself')
  }

  // Check if recipient exists and is not blocked
  if (!supabase) throw new Error('Supabase client not initialized')
  
  const { data: recipient } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', recipientId)
    .single()

  if (!recipient) {
    throw new Error('Recipient not found')
  }

  // Check if sender is blocked by recipient
  const { data: blockCheck } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', recipientId)
    .eq('blocked_id', senderId)
    .maybeSingle()

  if (blockCheck) {
    throw new Error('Cannot send message to this user')
  }

  const messageData: PrivateMessageInsert = {
    sender_id: senderId,
    recipient_id: recipientId,
    message: message.trim()
  }

  const { data, error } = await supabase
    .from('private_messages')
    .insert([messageData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get conversation between two users
export const getConversation = async (
  userId: string,
  otherUserId: string,
  limit: number = 50,
  offset: number = 0
): Promise<PrivateMessageWithProfile[]> => {
  const { data, error } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        is_online
      ),
      recipient:profiles!private_messages_recipient_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        is_online
      )
    `)
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .eq('is_deleted_by_sender', false)
    .eq('is_deleted_by_recipient', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return (data || []).reverse() // Reverse to show oldest first
}

// Get all conversations for a user
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  // Get all messages where user is sender or recipient
  const { data: messages, error } = await supabase
    .from('private_messages')
    .select(`
      *,
      sender:profiles!private_messages_sender_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        is_online,
        last_seen
      ),
      recipient:profiles!private_messages_recipient_id_fkey (
        id,
        username,
        full_name,
        avatar_url,
        is_online,
        last_seen
      )
    `)
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Group messages by conversation partner
  const conversationMap = new Map<string, {
    otherUser: any
    messages: PrivateMessageWithProfile[]
    unreadCount: number
  }>()

  messages?.forEach(message => {
    const isFromUser = message.sender_id === userId
    const otherUserId = isFromUser ? message.recipient_id : message.sender_id
    const otherUser = isFromUser ? message.recipient : message.sender

    if (!conversationMap.has(otherUserId)) {
      conversationMap.set(otherUserId, {
        otherUser,
        messages: [],
        unreadCount: 0
      })
    }

    const conversation = conversationMap.get(otherUserId)!
    conversation.messages.push(message)

    // Count unread messages (messages sent to current user that are unread)
    if (!isFromUser && !message.is_read) {
      conversation.unreadCount++
    }
  })

  // Convert to array and sort by last message time
  const conversations: Conversation[] = Array.from(conversationMap.values())
    .map(conv => ({
      otherUser: conv.otherUser,
      lastMessage: conv.messages[0], // First message is the most recent due to DESC order
      unreadCount: conv.unreadCount
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at || '0'
      const bTime = b.lastMessage?.created_at || '0'
      return bTime.localeCompare(aTime)
    })

  return conversations
}

// Mark messages as read
export const markMessagesAsRead = async (
  userId: string,
  otherUserId: string
): Promise<void> => {
  const { error } = await supabase
    .from('private_messages')
    .update({ is_read: true })
    .eq('sender_id', otherUserId)
    .eq('recipient_id', userId)
    .eq('is_read', false)

  if (error) throw error
}

// Delete message for current user
const deleteMessageForUser = async (
  messageId: string,
  userId: string
): Promise<void> => {
  // Get the message to check if user is sender or recipient
  const { data: message, error: fetchError } = await supabase
    .from('private_messages')
    .select('sender_id, recipient_id, is_deleted_by_sender, is_deleted_by_recipient')
    .eq('id', messageId)
    .single()

  if (fetchError) throw fetchError

  const updateData: any = {}

  if (message.sender_id === userId) {
    updateData.is_deleted_by_sender = true
  } else if (message.recipient_id === userId) {
    updateData.is_deleted_by_recipient = true
  } else {
    throw new Error('You can only delete your own messages')
  }

  const { error } = await supabase
    .from('private_messages')
    .update(updateData)
    .eq('id', messageId)

  if (error) throw error

  // If both users have deleted the message, remove it completely
  if (message.is_deleted_by_sender && updateData.is_deleted_by_recipient) {
    await supabase
      .from('private_messages')
      .delete()
      .eq('id', messageId)
  } else if (message.is_deleted_by_recipient && updateData.is_deleted_by_sender) {
    await supabase
      .from('private_messages')
      .delete()
      .eq('id', messageId)
  }
}

// Search users for messaging
export const searchUsers = async (
  query: string,
  currentUserId: string,
  limit: number = 20
): Promise<Array<{
  id: string
  username: string
  full_name: string
  avatar_url?: string
  is_online?: boolean
}>> => {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_online')
    .neq('id', currentUserId)
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit)

  if (error) throw error
  return data || []
}

// Block a user
const blockUser = async (
  blockerId: string,
  blockedId: string
): Promise<void> => {
  if (blockerId === blockedId) {
    throw new Error('Cannot block yourself')
  }

  const { error } = await supabase
    .from('user_blocks')
    .insert([{
      blocker_id: blockerId,
      blocked_id: blockedId
    }])

  if (error) {
    if (error.code === '23505') { // Unique constraint violation
      throw new Error('User is already blocked')
    }
    throw error
  }
}

// Unblock a user
const unblockUser = async (
  blockerId: string,
  blockedId: string
): Promise<void> => {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)

  if (error) throw error
}

// Get blocked users
const getBlockedUsers = async (userId: string): Promise<Array<{
  id: string
  username: string
  full_name: string
  avatar_url?: string
  blocked_at: string
}>> => {
  const { data, error } = await supabase
    .from('user_blocks')
    .select(`
      created_at,
      blocked:profiles!user_blocks_blocked_id_fkey (
        id,
        username,
        full_name,
        avatar_url
      )
    `)
    .eq('blocker_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(block => ({
    ...block.blocked,
    blocked_at: block.created_at
  }))
}

// Subscribe to new messages for a user
const subscribeToMessages = (
  userId: string,
  callback: (message: PrivateMessageWithProfile) => void
) => {
  const channel = supabase
    .channel('private_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'private_messages',
        filter: `recipient_id=eq.${userId}`
      },
      async (payload) => {
        // Fetch the complete message with profile data
        const { data } = await supabase
          .from('private_messages')
          .select(`
            *,
            sender:profiles!private_messages_sender_id_fkey (
              id,
              username,
              full_name,
              avatar_url,
              is_online
            ),
            recipient:profiles!private_messages_recipient_id_fkey (
              id,
              username,
              full_name,
              avatar_url,
              is_online
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// Update user online status
const updateOnlineStatus = async (
  userId: string,
  isOnline: boolean
): Promise<void> => {
  const { error } = await supabase.rpc('update_user_online_status', {
    user_id: userId,
    is_online: isOnline
  })

  if (error) {
    console.error('Failed to update online status:', error)
  }
}