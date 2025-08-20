import { supabase } from '../lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

interface RealtimeConnection {
  channel: RealtimeChannel
  isConnected: boolean
  reconnectAttempts: number
  lastHeartbeat: number
}

interface MessageEvent {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: 'chat_messages' | 'private_messages'
  new?: any
  old?: any
  eventType: string
}

class RealtimeService {
  private connections: Map<string, RealtimeConnection> = new Map()
  private messageHandlers: Map<string, Function[]> = new Map()
  private connectionListeners: Function[] = []
  private heartbeatInterval: NodeJS.Timeout | null = null
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map()
  
  // Connection management
  private readonly MAX_RECONNECT_ATTEMPTS = 5
  private readonly RECONNECT_DELAY = 1000 // Start with 1 second
  private readonly HEARTBEAT_INTERVAL = 30000 // 30 seconds
  private readonly MESSAGE_BUFFER_SIZE = 1000

  constructor() {
    this.startHeartbeat()
    this.setupVisibilityHandlers()
  }

  /**
   * Subscribe to global chat messages with real-time updates
   */
  subscribeToGlobalChat(
    onMessage: (message: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = 'global-chat'
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: 'is_reported=eq.false'
          },
          async (payload) => {
            try {
              // Fetch complete message with profile data
              const { data: messageWithProfile } = await supabase
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

              if (messageWithProfile && !messageWithProfile.is_reported) {
                onMessage(messageWithProfile)
              }
            } catch (error) {
              console.error('Error fetching message details:', error)
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
            // Handle message updates (e.g., reported messages)
            if (payload.new.is_reported) {
              this.notifyHandlers(`${channelName}:delete`, payload.old.id)
            }
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
            this.notifyHandlers(`${channelName}:delete`, payload.old.id)
          }
        )

      // Subscribe with connection tracking
      this.subscribeWithTracking(channelName, channel, onError)

      // Return unsubscribe function
      return () => this.unsubscribe(channelName)
    } catch (error) {
      console.error('Failed to subscribe to global chat:', error)
      onError?.(error as Error)
      return () => {}
    }
  }

  /**
   * Subscribe to private messages for a specific user
   */
  subscribeToPrivateMessages(
    userId: string,
    onMessage: (message: any) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = `private-messages-${userId}`
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'private_messages',
            filter: `recipient_id=eq.${userId}`
          },
          async (payload) => {
            try {
              // Fetch complete message with sender profile
              const { data: messageWithProfile } = await supabase
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

              if (messageWithProfile) {
                onMessage(messageWithProfile)
              }
            } catch (error) {
              console.error('Error fetching private message details:', error)
              onError?.(error as Error)
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
          (payload) => {
            // Handle message updates (read status, etc.)
            this.notifyHandlers(`${channelName}:update`, payload.new)
          }
        )

      this.subscribeWithTracking(channelName, channel, onError)

      return () => this.unsubscribe(channelName)
    } catch (error) {
      console.error('Failed to subscribe to private messages:', error)
      onError?.(error as Error)
      return () => {}
    }
  }

  /**
   * Subscribe to user online status changes
   */
  subscribeToUserStatus(
    onStatusChange: (userId: string, isOnline: boolean) => void,
    onError?: (error: Error) => void
  ): () => void {
    const channelName = 'user-status'
    
    try {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: 'is_online=neq.null'
          },
          (payload) => {
            onStatusChange(payload.new.id, payload.new.is_online)
          }
        )

      this.subscribeWithTracking(channelName, channel, onError)

      return () => this.unsubscribe(channelName)
    } catch (error) {
      console.error('Failed to subscribe to user status:', error)
      onError?.(error as Error)
      return () => {}
    }
  }

  /**
   * Send a global chat message with optimistic updates
   */
  async sendGlobalMessage(
    userId: string,
    message: string,
    optimisticCallback?: (tempMessage: any) => void
  ): Promise<any> {
    try {
      // Create optimistic message for immediate UI update
      const tempMessage = {
        id: `temp-${Date.now()}`,
        user_id: userId,
        message: message.trim(),
        created_at: new Date().toISOString(),
        is_reported: false,
        profiles: null // Will be populated by real message
      }

      // Show optimistic update
      optimisticCallback?.(tempMessage)

      // Send actual message
      const { data, error } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: userId,
          message: message.trim()
        }])
        .select(`
          *,
          profiles (
            id,
            username,
            full_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to send global message:', error)
      throw error
    }
  }

  /**
   * Send a private message with optimistic updates
   */
  async sendPrivateMessage(
    senderId: string,
    recipientId: string,
    message: string,
    optimisticCallback?: (tempMessage: any) => void
  ): Promise<any> {
    try {
      // Create optimistic message
      const tempMessage = {
        id: `temp-${Date.now()}`,
        sender_id: senderId,
        recipient_id: recipientId,
        message: message.trim(),
        created_at: new Date().toISOString(),
        is_read: false,
        sender: null,
        recipient: null
      }

      optimisticCallback?.(tempMessage)

      // Send actual message
      const { data, error } = await supabase
        .from('private_messages')
        .insert([{
          sender_id: senderId,
          recipient_id: recipientId,
          message: message.trim()
        }])
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
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Failed to send private message:', error)
      throw error
    }
  }

  /**
   * Get connection status for a specific channel
   */
  getConnectionStatus(channelName: string): boolean {
    const connection = this.connections.get(channelName)
    return connection?.isConnected || false
  }

  /**
   * Get all connection statuses
   */
  getAllConnectionStatuses(): Record<string, boolean> {
    const statuses: Record<string, boolean> = {}
    this.connections.forEach((connection, channelName) => {
      statuses[channelName] = connection.isConnected
    })
    return statuses
  }

  /**
   * Manually reconnect a specific channel
   */
  async reconnectChannel(channelName: string): Promise<void> {
    const connection = this.connections.get(channelName)
    if (connection) {
      await this.handleReconnection(channelName, connection)
    }
  }

  /**
   * Cleanup all connections
   */
  cleanup(): void {
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }

    // Clear reconnect timeouts
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout))
    this.reconnectTimeouts.clear()

    // Unsubscribe from all channels
    this.connections.forEach((_, channelName) => {
      this.unsubscribe(channelName)
    })

    // Clear handlers
    this.messageHandlers.clear()
    this.connectionListeners = []
  }

  // Private methods

  private async subscribeWithTracking(
    channelName: string,
    channel: RealtimeChannel,
    onError?: (error: Error) => void
  ): Promise<void> {
    try {
      // Subscribe to channel
      const status = await channel.subscribe((status, err) => {
        const connection = this.connections.get(channelName)
        
        if (status === 'SUBSCRIBED') {
          if (connection) {
            connection.isConnected = true
            connection.reconnectAttempts = 0
            connection.lastHeartbeat = Date.now()
          }
          this.notifyConnectionListeners(channelName, true)
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          if (connection) {
            connection.isConnected = false
          }
          this.notifyConnectionListeners(channelName, false)
          
          if (err) {
            console.error(`Channel ${channelName} error:`, err)
            onError?.(new Error(`Channel error: ${err.message || 'Unknown error'}`))
          }
          
          // Attempt reconnection
          this.scheduleReconnection(channelName)
        } else if (status === 'CLOSED') {
          if (connection) {
            connection.isConnected = false
          }
          this.notifyConnectionListeners(channelName, false)
          this.scheduleReconnection(channelName)
        }
      })

      // Store connection
      this.connections.set(channelName, {
        channel,
        isConnected: false,
        reconnectAttempts: 0,
        lastHeartbeat: Date.now()
      })

    } catch (error) {
      console.error(`Failed to subscribe to ${channelName}:`, error)
      onError?.(error as Error)
    }
  }

  private scheduleReconnection(channelName: string): void {
    const connection = this.connections.get(channelName)
    if (!connection || connection.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      return
    }

    // Clear existing timeout
    const existingTimeout = this.reconnectTimeouts.get(channelName)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Calculate exponential backoff delay
    const delay = this.RECONNECT_DELAY * Math.pow(2, connection.reconnectAttempts)
    
    const timeout = setTimeout(() => {
      this.handleReconnection(channelName, connection)
    }, delay)

    this.reconnectTimeouts.set(channelName, timeout)
  }

  private async handleReconnection(channelName: string, connection: RealtimeConnection): Promise<void> {
    try {
      connection.reconnectAttempts++
      
      // Unsubscribe from old channel
      await connection.channel.unsubscribe()
      
      // Create new channel with same configuration
      // Note: This would need to be implemented based on the original subscription
      console.log(`Attempting to reconnect ${channelName} (attempt ${connection.reconnectAttempts})`)
      
      // The actual reconnection logic would depend on the specific channel type
      // For now, we'll mark it as disconnected and let the application handle it
      connection.isConnected = false
      this.notifyConnectionListeners(channelName, false)
      
    } catch (error) {
      console.error(`Failed to reconnect ${channelName}:`, error)
      
      if (connection.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
        this.scheduleReconnection(channelName)
      }
    }
  }

  private unsubscribe(channelName: string): void {
    const connection = this.connections.get(channelName)
    if (connection) {
      connection.channel.unsubscribe()
      this.connections.delete(channelName)
      this.messageHandlers.delete(channelName)
      
      // Clear reconnect timeout
      const timeout = this.reconnectTimeouts.get(channelName)
      if (timeout) {
        clearTimeout(timeout)
        this.reconnectTimeouts.delete(channelName)
      }
    }
  }

  private notifyHandlers(eventKey: string, data: any): void {
    const handlers = this.messageHandlers.get(eventKey) || []
    handlers.forEach(handler => {
      try {
        handler(data)
      } catch (error) {
        console.error('Error in message handler:', error)
      }
    })
  }

  private notifyConnectionListeners(channelName: string, isConnected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(channelName, isConnected)
      } catch (error) {
        console.error('Error in connection listener:', error)
      }
    })
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now()
      
      this.connections.forEach((connection, channelName) => {
        if (connection.isConnected && (now - connection.lastHeartbeat) > this.HEARTBEAT_INTERVAL * 2) {
          // Connection seems stale, mark as disconnected
          connection.isConnected = false
          this.notifyConnectionListeners(channelName, false)
          this.scheduleReconnection(channelName)
        }
      })
    }, this.HEARTBEAT_INTERVAL)
  }

  private setupVisibilityHandlers(): void {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, check connections
        this.connections.forEach((connection, channelName) => {
          if (!connection.isConnected) {
            this.scheduleReconnection(channelName)
          }
        })
      }
    })

    // Handle online/offline events
    window.addEventListener('online', () => {
      // Network came back, reconnect all channels
      this.connections.forEach((connection, channelName) => {
        if (!connection.isConnected) {
          connection.reconnectAttempts = 0 // Reset attempts
          this.scheduleReconnection(channelName)
        }
      })
    })

    window.addEventListener('offline', () => {
      // Network lost, mark all as disconnected
      this.connections.forEach((connection, channelName) => {
        connection.isConnected = false
        this.notifyConnectionListeners(channelName, false)
      })
    })
  }

  // Public API for connection listeners
  onConnectionChange(listener: (channelName: string, isConnected: boolean) => void): () => void {
    this.connectionListeners.push(listener)
    
    return () => {
      const index = this.connectionListeners.indexOf(listener)
      if (index > -1) {
        this.connectionListeners.splice(index, 1)
      }
    }
  }
}

// Export singleton instance
export const realtimeService = new RealtimeService()

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  realtimeService.cleanup()
})