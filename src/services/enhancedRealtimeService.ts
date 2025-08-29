/**
 * Enhanced Real-time Service for JU_CONNECT
 * 
 * Features:
 * - Automatic reconnection on disconnect
 * - Connection health monitoring
 * - User-friendly error messages
 * - Optimistic updates
 * - Connection status indicators
 */

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logger } from '../utils/logger'

export interface RealtimeConnectionStatus {
  isConnected: boolean
  isReconnecting: boolean
  lastError: string | null
  retryCount: number
}

export interface RealtimeMessage {
  id: string
  content: string
  sender_id: string
  group_id?: string
  recipient_id?: string
  created_at: string
  updated_at: string
  sender?: {
    id: string
    username: string
    full_name: string
  }
}

export interface RealtimeOptions {
  onConnectionChange?: (status: RealtimeConnectionStatus) => void
  onError?: (error: string) => void
  maxRetries?: number
  retryDelay?: number
  enableOptimistic?: boolean
}

class EnhancedRealtimeService {
  private channels: Map<string, any> = new Map()
  private connectionStatus: RealtimeConnectionStatus = {
    isConnected: false,
    isReconnecting: false,
    lastError: null,
    retryCount: 0
  }
  private statusCallbacks: ((status: RealtimeConnectionStatus) => void)[] = []
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map()
  private healthCheckInterval: NodeJS.Timeout | null = null
  private readonly maxRetries: number = 5
  private readonly retryDelay: number = 2000
  private isDestroyed = false

  constructor() {
    this.setupConnectionMonitoring()
  }

  /**
   * Setup connection monitoring and automatic reconnection
   */
  private setupConnectionMonitoring() {
    if (!isSupabaseConfigured() || !supabase) {
      this.updateConnectionStatus({
        isConnected: false,
        isReconnecting: false,
        lastError: 'Real-time features are not available in demo mode',
        retryCount: 0
      })
      return
    }

    // Monitor connection status with proper cleanup
    this.healthCheckInterval = setInterval(() => {
      if (!this.isDestroyed) {
        this.checkConnectionHealth()
      }
    }, 30000) // Check every 30 seconds
  }

  /**
   * Destroy the service and cleanup all resources
   */
  public destroy() {
    this.isDestroyed = true
    
    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
    
    // Clear all reconnection timeouts
    this.reconnectTimeouts.forEach((timeout) => {
      clearTimeout(timeout)
    })
    this.reconnectTimeouts.clear()
    
    // Unsubscribe from all channels
    this.unsubscribeAll()
    
    // Clear status callbacks
    this.statusCallbacks = []
  }

  /**
   * Check if the connection is healthy
   */
  private async checkConnectionHealth() {
    if (!supabase) return

    try {
      // Simple ping to check if connection is alive
      const { error } = await supabase.from('profiles').select('id').limit(1)
      
      if (error && this.connectionStatus.isConnected) {
        this.updateConnectionStatus({
          ...this.connectionStatus,
          isConnected: false,
          lastError: 'Connection lost. Trying to reconnect...'
        })
        this.attemptReconnection()
      } else if (!error && !this.connectionStatus.isConnected) {
        this.updateConnectionStatus({
          ...this.connectionStatus,
          isConnected: true,
          isReconnecting: false,
          lastError: null,
          retryCount: 0
        })
      }
    } catch (error) {
      console.warn('Connection health check failed:', error)
    }
  }

  /**
   * Attempt to reconnect all channels
   */
  private attemptReconnection() {
    if (this.connectionStatus.isReconnecting || this.connectionStatus.retryCount >= this.maxRetries) {
      return
    }

    this.updateConnectionStatus({
      ...this.connectionStatus,
      isReconnecting: true,
      retryCount: this.connectionStatus.retryCount + 1
    })

    const delay = this.retryDelay * Math.pow(2, this.connectionStatus.retryCount - 1) // Exponential backoff

    setTimeout(() => {
      this.reconnectAllChannels()
    }, delay)
  }

  /**
   * Reconnect all active channels
   */
  private reconnectAllChannels() {
    if (!supabase) return

    this.channels.forEach((channelData, channelId) => {
      try {
        // Remove old channel
        if (channelData.channel) {
          supabase.removeChannel(channelData.channel)
        }

        // Recreate channel with same configuration
        this.createChannel(channelId, channelData.config)
      } catch (error) {
        console.error(`Failed to reconnect channel ${channelId}:`, error)
      }
    })
  }

  /**
   * Update connection status and notify listeners
   */
  private updateConnectionStatus(status: RealtimeConnectionStatus) {
    this.connectionStatus = status
    this.statusCallbacks.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('Error in status callback:', error)
      }
    })
  }

  /**
   * Subscribe to connection status changes
   */
  public onConnectionChange(callback: (status: RealtimeConnectionStatus) => void) {
    this.statusCallbacks.push(callback)
    
    // Immediately call with current status
    callback(this.connectionStatus)

    // Return unsubscribe function
    return () => {
      const index = this.statusCallbacks.indexOf(callback)
      if (index > -1) {
        this.statusCallbacks.splice(index, 1)
      }
    }
  }

  /**
   * Subscribe to group messages with enhanced error handling
   */
  public subscribeToGroupMessages(
    groupId: string,
    onMessage: (message: RealtimeMessage) => void,
    onUpdate?: (message: RealtimeMessage) => void,
    onDelete?: (messageId: string) => void,
    options: RealtimeOptions = {}
  ) {
    if (!groupId || !isSupabaseConfigured() || !supabase) {
      options.onError?.('Real-time messaging is not available right now')
      return () => {}
    }

    const channelId = `group_messages_${groupId}`
    
    try {
      const channel = this.createGroupMessageChannel(
        channelId,
        groupId,
        onMessage,
        onUpdate,
        onDelete,
        options
      )

      this.channels.set(channelId, {
        channel,
        config: { groupId, onMessage, onUpdate, onDelete, options }
      })

      return () => {
        this.unsubscribe(channelId)
      }
    } catch (error) {
      const errorMessage = 'Failed to connect to real-time messaging'
      options.onError?.(errorMessage)
      logger.error('Group message subscription error:', error)
      return () => {}
    }
  }

  /**
   * Subscribe to private messages
   */
  public subscribeToPrivateMessages(
    userId: string,
    onMessage: (message: RealtimeMessage) => void,
    onUpdate?: (message: RealtimeMessage) => void,
    options: RealtimeOptions = {}
  ) {
    if (!userId || !isSupabaseConfigured() || !supabase) {
      options.onError?.('Real-time messaging is not available right now')
      return () => {}
    }

    const channelId = `private_messages_${userId}`
    
    try {
      const channel = this.createPrivateMessageChannel(
        channelId,
        userId,
        onMessage,
        onUpdate,
        options
      )

      this.channels.set(channelId, {
        channel,
        config: { userId, onMessage, onUpdate, options }
      })

      return () => {
        this.unsubscribe(channelId)
      }
    } catch (error) {
      const errorMessage = 'Failed to connect to real-time messaging'
      options.onError?.(errorMessage)
      logger.error('Private message subscription error:', error)
      return () => {}
    }
  }

  /**
   * Create group message channel
   */
  private createGroupMessageChannel(
    channelId: string,
    groupId: string,
    onMessage: (message: RealtimeMessage) => void,
    onUpdate?: (message: RealtimeMessage) => void,
    onDelete?: (messageId: string) => void,
    options: RealtimeOptions = {}
  ) {
    if (!supabase) throw new Error('Supabase not available')

    const channel = supabase
      .channel(channelId)
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
            const message = await this.fetchCompleteMessage('group_messages', payload.new.id)
            if (message) {
              onMessage(message)
            }
          } catch (error) {
            options.onError?.('Failed to receive new message')
            logger.error('Error processing new group message:', error)
          }
        }
      )

    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          try {
            const message = await this.fetchCompleteMessage('group_messages', payload.new.id)
            if (message) {
              onUpdate(message)
            }
          } catch (error) {
            options.onError?.('Failed to update message')
            logger.error('Error processing updated group message:', error)
          }
        }
      )
    }

    if (onDelete) {
      channel.on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        (payload) => {
          try {
            onDelete(payload.old.id)
          } catch (error) {
            options.onError?.('Failed to process deleted message')
            logger.error('Error processing deleted group message:', error)
          }
        }
      )
    }

    // Subscribe and handle connection events
    channel
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.updateConnectionStatus({
            ...this.connectionStatus,
            isConnected: true,
            isReconnecting: false,
            lastError: null,
            retryCount: 0
          })
          options.onConnectionChange?.(this.connectionStatus)
          logger.info(`Subscribed to ${channelId}`)
        } else if (status === 'CHANNEL_ERROR') {
          this.updateConnectionStatus({
            ...this.connectionStatus,
            isConnected: false,
            lastError: 'Connection interrupted. Attempting to reconnect...'
          })
          options.onConnectionChange?.(this.connectionStatus)
          this.attemptReconnection()
        }
      })

    return channel
  }

  /**
   * Create private message channel
   */
  private createPrivateMessageChannel(
    channelId: string,
    userId: string,
    onMessage: (message: RealtimeMessage) => void,
    onUpdate?: (message: RealtimeMessage) => void,
    options: RealtimeOptions = {}
  ) {
    if (!supabase) throw new Error('Supabase not available')

    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        },
        async (payload) => {
          try {
            const message = await this.fetchCompleteMessage('private_messages', payload.new.id)
            if (message) {
              onMessage(message)
            }
          } catch (error) {
            options.onError?.('Failed to receive new message')
            logger.error('Error processing new private message:', error)
          }
        }
      )

    if (onUpdate) {
      channel.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'private_messages',
          filter: `or(sender_id.eq.${userId},recipient_id.eq.${userId})`
        },
        async (payload) => {
          try {
            const message = await this.fetchCompleteMessage('private_messages', payload.new.id)
            if (message) {
              onUpdate(message)
            }
          } catch (error) {
            options.onError?.('Failed to update message')
            logger.error('Error processing updated private message:', error)
          }
        }
      )
    }

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        this.updateConnectionStatus({
          ...this.connectionStatus,
          isConnected: true,
          isReconnecting: false,
          lastError: null,
          retryCount: 0
        })
        options.onConnectionChange?.(this.connectionStatus)
      } else if (status === 'CHANNEL_ERROR') {
        this.updateConnectionStatus({
          ...this.connectionStatus,
          isConnected: false,
          lastError: 'Connection interrupted. Attempting to reconnect...'
        })
        options.onConnectionChange?.(this.connectionStatus)
        this.attemptReconnection()
      }
    })

    return channel
  }

  /**
   * Fetch complete message with sender details
   */
  private async fetchCompleteMessage(table: string, messageId: string): Promise<RealtimeMessage | null> {
    if (!supabase) return null

    try {
      const { data, error } = await supabase
        .from(table)
        .select(`
          *,
          sender:profiles!sender_id (
            id,
            username,
            full_name
          )
        `)
        .eq('id', messageId)
        .single()

      if (error) throw error
      return data as RealtimeMessage
    } catch (error) {
      logger.error(`Failed to fetch complete ${table} message:`, error)
      return null
    }
  }

  /**
   * Create a generic channel
   */
  private createChannel(channelId: string, config: any) {
    if (!supabase) return

    // Recreate channel based on stored configuration
    if (config.groupId) {
      return this.createGroupMessageChannel(
        channelId,
        config.groupId,
        config.onMessage,
        config.onUpdate,
        config.onDelete,
        config.options
      )
    } else if (config.userId) {
      return this.createPrivateMessageChannel(
        channelId,
        config.userId,
        config.onMessage,
        config.onUpdate,
        config.options
      )
    }
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channelId: string) {
    const channelData = this.channels.get(channelId)
    if (channelData && supabase) {
      supabase.removeChannel(channelData.channel)
      this.channels.delete(channelId)
      
      // Clear any pending reconnection
      const timeout = this.reconnectTimeouts.get(channelId)
      if (timeout) {
        clearTimeout(timeout)
        this.reconnectTimeouts.delete(channelId)
      }
    }
  }

  /**
   * Unsubscribe from all channels
   */
  public unsubscribeAll() {
    this.channels.forEach((_, channelId) => {
      this.unsubscribe(channelId)
    })
    
    this.reconnectTimeouts.forEach(timeout => clearTimeout(timeout))
    this.reconnectTimeouts.clear()
  }

  /**
   * Get current connection status
   */
  public getConnectionStatus(): RealtimeConnectionStatus {
    return { ...this.connectionStatus }
  }

  /**
   * Force reconnection of all channels
   */
  public forceReconnect() {
    this.updateConnectionStatus({
      ...this.connectionStatus,
      isReconnecting: true,
      retryCount: 0
    })
    
    this.reconnectAllChannels()
  }
}

// Export singleton instance
export const realtimeService = new EnhancedRealtimeService()

// React hook for easy integration
export const useEnhancedRealtime = (options: RealtimeOptions = {}) => {
  const [connectionStatus, setConnectionStatus] = React.useState<RealtimeConnectionStatus>(
    realtimeService.getConnectionStatus()
  )

  React.useEffect(() => {
    const unsubscribe = realtimeService.onConnectionChange(setConnectionStatus)
    return unsubscribe
  }, [])

  return {
    connectionStatus,
    subscribeToGroupMessages: realtimeService.subscribeToGroupMessages.bind(realtimeService),
    subscribeToPrivateMessages: realtimeService.subscribeToPrivateMessages.bind(realtimeService),
    forceReconnect: realtimeService.forceReconnect.bind(realtimeService)
  }
}

import React from 'react'
