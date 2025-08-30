import { useEffect, useRef } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface RealtimeHookOptions {
  enabled?: boolean
  onError?: (error: Error) => void
  onConnected?: () => void
  onDisconnected?: () => void
}

/**
 * Hook for real-time group messages
 */
export const useRealtimeGroupMessages = (
  groupId: string | null,
  onMessage: (message: any) => void,
  onUpdate?: (message: any) => void,
  onDelete?: (messageId: string) => void,
  options: RealtimeHookOptions = {}
) => {
  const channelRef = useRef<any>(null)
  const { enabled = true, onError, onConnected, onDisconnected } = options

  useEffect(() => {
    if (!enabled || !groupId || !isSupabaseConfigured() || !supabase) return

    logger.debug('Setting up real-time updates for group messages:', groupId)

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`group_messages_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          try {
            logger.debug('New message received:', payload.new.id)
            if (!supabase) return
            
            // Rate limiting - prevent excessive message fetching
            const now = Date.now()
            const lastFetch = parseInt(sessionStorage.getItem(`last-msg-fetch-${groupId}`) || '0')
            if (now - lastFetch < 1000) { // 1 second between message fetches
              console.log('Message fetch rate limited')
              return
            }
            sessionStorage.setItem(`last-msg-fetch-${groupId}`, now.toString())
            
            // Fetch complete message with profile data
            const { data, error } = await supabase
              .from('group_messages')
              .select(`
                *,
                profiles (
                  id,
                  username,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) {
              logger.error('Error loading new message:', error)
              onError?.(new Error('Could not load new message'))
              return
            }
            if (data) onMessage(data)
          } catch (error: any) {
            logger.error('Error loading new message:', error)
            onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          logger.debug('Message updated:', payload.new.id)
          onUpdate?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          logger.debug('Message deleted:', payload.old.id)
          onDelete?.(payload.old.id)
        }
      )
      .subscribe((status) => {
        logger.debug('Real-time connection status:', status)
        if (status === 'SUBSCRIBED') {
          logger.info('Real-time updates connected')
          onConnected?.()
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Real-time updates failed')
          onError?.(new Error('Live updates are not working right now'))
        } else if (status === 'CLOSED') {
          logger.warn('Real-time updates disconnected')
          onDisconnected?.()
        }
      })

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        logger.debug('Disconnecting real-time updates')
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [groupId, enabled, onMessage, onUpdate, onDelete, onError, onConnected, onDisconnected])

  return () => {
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current)
    }
  }
}

/**
 * Hook for real-time group member updates
 */
export const useRealtimeGroupMembers = (
  groupId: string | null,
  onMemberJoin: (member: any) => void,
  onMemberLeave?: (userId: string) => void,
  onMemberUpdate?: (member: any) => void,
  options: RealtimeHookOptions = {}
) => {
  const channelRef = useRef<any>(null)
  const { enabled = true, onError } = options

  useEffect(() => {
    if (!enabled || !groupId || !isSupabaseConfigured() || !supabase) return

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`group_members_${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          try {
            if (!supabase) return
            // Fetch complete member data with profile
            const { data, error } = await supabase
              .from('group_members')
              .select(`
                *,
                profiles (
                  id,
                  username,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) throw error
            if (data) onMemberJoin(data)
          } catch (error: any) {
            logger.error('Error loading new member:', error)
            onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          onMemberLeave?.(payload.old.user_id)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_members',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          onMemberUpdate?.(payload.new)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [groupId, enabled, onMemberJoin, onMemberLeave, onMemberUpdate, onError])
}

/**
 * Hook for real-time group list updates
 */
export const useRealtimeGroups = (
  onGroupCreate: (group: any) => void,
  onGroupUpdate?: (group: any) => void,
  onGroupDelete?: (groupId: string) => void,
  options: RealtimeHookOptions = {}
) => {
  const channelRef = useRef<any>(null)
  const { enabled = true, onError } = options
  const isSubscribedRef = useRef(false) // Prevent multiple subscriptions
  const lastCallRef = useRef<number>(0) // Rate limiting

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase || isSubscribedRef.current) return

    // Rate limiting: only allow one subscription every 5 seconds
    const now = Date.now()
    if (now - lastCallRef.current < 5000) {
      return
    }
    lastCallRef.current = now

    logger.debug('Setting up real-time updates for groups')

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    isSubscribedRef.current = true

    const channel = supabase
      .channel('groups_updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'class_groups'
        },
        async (payload) => {
          try {
            if (!supabase) return
            // Fetch complete group data with member count
            const { data, error } = await supabase
              .from('class_groups')
              .select(`
                *,
                group_members (count)
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) throw error
            if (data) onGroupCreate(data)
          } catch (error) {
            console.error('Error fetching new group:', error)
            onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'class_groups'
        },
        (payload) => {
          onGroupUpdate?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'class_groups'
        },
        (payload) => {
          onGroupDelete?.(payload.old.id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      isSubscribedRef.current = false
    }
  }, [enabled, onError, onGroupCreate, onGroupDelete, onGroupUpdate]) // Include all callback dependencies
}

/**
 * Hook for real-time global chat messages
 */
export const useRealtimeChatMessages = (
  onMessage: (message: any) => void,
  onUpdate?: (message: any) => void,
  onDelete?: (messageId: string) => void,
  options: RealtimeHookOptions = {}
) => {
  const channelRef = useRef<any>(null)
  const { enabled = true, onError } = options

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('chat_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          try {
            if (!supabase) return
            // Fetch complete message with profile data
            const { data, error } = await supabase
              .from('chat_messages')
              .select(`
                *,
                profiles (
                  id,
                  username,
                  full_name,
                  avatar_url
                )
              `)
              .eq('id', payload.new.id)
              .single()

            if (error) throw error
            if (data) onMessage(data)
          } catch (error) {
            console.error('Error fetching new chat message:', error)
            onError?.(error as Error)
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          onUpdate?.(payload.new)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chat_messages'
        },
        (payload) => {
          onDelete?.(payload.old.id)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [enabled, onMessage, onUpdate, onDelete, onError])
}

/**
 * Hook for real-time user status updates
 */
export const useRealtimeUserStatus = (
  onUserOnline: (userId: string) => void,
  onUserOffline: (userId: string) => void,
  options: RealtimeHookOptions = {}
) => {
  const channelRef = useRef<any>(null)
  const { enabled = true, onError } = options

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured() || !supabase) return

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel('user_presence')
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState()
        Object.keys(newState).forEach(userId => {
          onUserOnline(userId)
        })
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        onUserOnline(key)
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        onUserOffline(key)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [enabled, onUserOnline, onUserOffline, onError])
}
