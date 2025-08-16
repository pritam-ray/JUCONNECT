import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type ChatMessage = Database['public']['Tables']['chat_messages']['Row']
type ChatMessageInsert = Database['public']['Tables']['chat_messages']['Insert']

export interface ChatMessageWithProfile extends ChatMessage {
  profiles?: {
    id: string
    username: string
    full_name: string
  } | null
}

export const getChatMessages = async (
  limit: number = 50,
  offset: number = 0
): Promise<ChatMessageWithProfile[]> => {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      profiles (
        id,
        username,
        full_name
      )
    `)
    .eq('is_reported', false)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}

export const sendChatMessage = async (message: string, userId: string): Promise<ChatMessage> => {
  const messageData: ChatMessageInsert = {
    user_id: userId,
    message: message.trim(),
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert([messageData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const reportChatMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_reported: true })
    .eq('id', messageId)

  if (error) throw error
}

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)

  if (error) throw error
}

export const subscribeToChatMessages = (
  callback: (message: ChatMessageWithProfile) => void
) => {
  const channel = supabase
    .channel('chat_messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
      },
      async (payload) => {
        // Fetch the complete message with profile data
        const { data } = await supabase
          .from('chat_messages')
          .select(`
            *,
            profiles (
              id,
              username,
              full_name
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data && !data.is_reported) {
          callback(data)
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export const cleanupOldMessages = async (): Promise<void> => {
  const { error } = await supabase.rpc('delete_old_chat_messages')
  if (error) throw error
}