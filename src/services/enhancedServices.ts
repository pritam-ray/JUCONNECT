/**
 * Enhanced Services for JU_CONNECT
 * 
 * This file provides services to interact with the new enhanced schema features:
 * - Activity logging
 * - Error logging  
 * - File upload tracking
 * - User engagement metrics
 * - Real-time connection management
 */

import { supabase } from '../lib/supabase'
import { logger } from '../utils/logger'
import { errorRateLimiter } from '../utils/performance'
import { 
  UserActivityLog, 
  ErrorLog, 
  FileUploadSession, 
  UserEngagementMetrics
} from '../types/enhanced-schema.types'

// Activity Logging Service
export const activityService = {
  async logActivity(
    userId: string,
    activityType: UserActivityLog['activity_type'],
    activityData: Record<string, any> = {},
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      if (!supabase) {
        logger.warn('Supabase not available, activity not logged')
        return null
      }

      const { data, error } = await supabase.rpc('log_user_activity', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_activity_data: activityData,
        p_ip_address: ipAddress || undefined,
        p_user_agent: userAgent || undefined
      })

      if (error) {
        logger.error('Failed to log activity:', error)
        return null
      }

      return data
    } catch (error) {
      logger.error('Error in activity logging:', error)
      return null
    }
  },

  async getUserActivity(userId: string, limit: number = 50): Promise<UserActivityLog[]> {
    try {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('user_activity_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      
      // Filter out any entries with null user_id and cast to proper type
      return (data || [])
        .filter(item => item.user_id != null)
        .map(item => ({
          ...item,
          user_id: item.user_id!,
          activity_data: item.activity_data || {}
        })) as UserActivityLog[]
    } catch (error) {
      logger.error('Error fetching user activity:', error)
      return []
    }
  }
}

// Error Logging Service
export const errorLoggingService = {
  async logError(
    userId?: string,
    errorType: ErrorLog['error_type'] = 'unknown',
    errorMessage: string = '',
    errorStack?: string,
    context: Record<string, any> = {},
    severity: ErrorLog['severity'] = 'error'
  ): Promise<string | null> {
    try {
      if (!supabase) {
        console.error('Supabase not available for error logging:', errorMessage)
        return null
      }

      const { data, error } = await supabase.rpc('log_error', {
        p_user_id: userId || undefined,
        p_error_type: errorType,
        p_error_message: errorMessage,
        p_error_stack: errorStack || undefined,
        p_context: context,
        p_severity: severity
      })

      if (error) {
        console.error('Failed to log error to database:', error)
        return null
      }

      return data
    } catch (error) {
      console.error('Error in error logging service:', error)
      return null
    }
  },

  async getErrorLogs(userId: string, limit: number = 20): Promise<ErrorLog[]> {
    try {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('error_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      
      // Filter and map to ensure proper types
      return (data || [])
        .filter(item => item.user_id != null)
        .map(item => ({
          ...item,
          user_id: item.user_id!,
          error_type: item.error_type as ErrorLog['error_type'],
          severity: (item.severity || 'error') as ErrorLog['severity'],
          resolved: item.resolved || false,
          context: item.context || {}
        })) as ErrorLog[]
    } catch (error) {
      logger.error('Error fetching error logs:', error)
      return []
    }
  },

  async markErrorResolved(errorId: string): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase
        .from('error_logs')
        .update({ resolved: true })
        .eq('id', errorId)

      return !error
    } catch (error) {
      logger.error('Error marking error as resolved:', error)
      return false
    }
  }
}

// File Upload Tracking Service
export const fileUploadTrackingService = {
  async createUploadSession(
    userId: string,
    fileName: string,
    fileSize: number,
    fileType: string
  ): Promise<FileUploadSession | null> {
    try {
      if (!supabase) return null

      // Enforce 5MB limit (5,242,880 bytes)
      if (fileSize > 5242880) {
        throw new Error('Please upload a file or PDF smaller than 5MB')
      }

      const { data, error } = await supabase
        .from('file_upload_sessions')
        .insert({
          user_id: userId,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          upload_status: 'pending'
        })
        .select()
        .single()

      if (error) throw error
      
      // Ensure proper type safety
      if (data && data.user_id) {
        return {
          ...data,
          user_id: data.user_id,
          upload_status: data.upload_status as FileUploadSession['upload_status'],
          upload_progress: data.upload_progress || 0,
          error_message: data.error_message || null,
          storage_path: data.storage_path || null,
          completed_at: data.completed_at || null
        } as FileUploadSession
      }
      
      return null
    } catch (error) {
      logger.error('Error creating upload session:', error)
      await errorLoggingService.logError(
        userId,
        'file_upload',
        error instanceof Error ? error.message : 'Unknown upload error',
        error instanceof Error ? error.stack : undefined,
        { fileName, fileSize, fileType },
        'error'
      )
      return null
    }
  },

  async updateUploadProgress(
    sessionId: string,
    progress: number,
    status?: FileUploadSession['upload_status']
  ): Promise<boolean> {
    try {
      if (!supabase) return false

      const updateData: any = { upload_progress: Math.max(0, Math.min(100, progress)) }
      
      if (status) {
        updateData.upload_status = status
        if (status === 'completed') {
          updateData.completed_at = new Date().toISOString()
        }
      }

      const { error } = await supabase
        .from('file_upload_sessions')
        .update(updateData)
        .eq('id', sessionId)

      return !error
    } catch (error) {
      logger.error('Error updating upload progress:', error)
      return false
    }
  },

  async markUploadFailed(sessionId: string, errorMessage: string): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase
        .from('file_upload_sessions')
        .update({
          upload_status: 'failed',
          error_message: errorMessage
        })
        .eq('id', sessionId)

      return !error
    } catch (error) {
      logger.error('Error marking upload as failed:', error)
      return false
    }
  }
}

// User Engagement Tracking Service
export const engagementService = {
  async updateEngagement(
    userId: string,
    metrics: {
      pageViews?: number
      messagesSent?: number
      filesUploaded?: number
      filesDownloaded?: number
      groupsJoined?: number
      sessionDuration?: number
    }
  ): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase.rpc('update_user_engagement', {
        p_user_id: userId,
        p_page_views: metrics.pageViews || 0,
        p_messages_sent: metrics.messagesSent || 0,
        p_files_uploaded: metrics.filesUploaded || 0,
        p_files_downloaded: metrics.filesDownloaded || 0,
        p_groups_joined: metrics.groupsJoined || 0,
        p_session_duration: metrics.sessionDuration || 0
      })

      if (error) {
        logger.error('Error updating engagement:', error)
        return false
      }

      return true
    } catch (error) {
      logger.error('Error in engagement service:', error)
      return false
    }
  },

  async getEngagementMetrics(userId: string, days: number = 30): Promise<UserEngagementMetrics[]> {
    try {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('user_engagement_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('metric_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('metric_date', { ascending: false })

      if (error) throw error
      
      // Filter and map to ensure proper types
      return (data || [])
        .filter(item => item.user_id != null && item.metric_date != null)
        .map(item => ({
          ...item,
          user_id: item.user_id!,
          metric_date: item.metric_date!,
          page_views: item.page_views || 0,
          messages_sent: item.messages_sent || 0,
          files_uploaded: item.files_uploaded || 0,
          files_downloaded: item.files_downloaded || 0,
          groups_joined: item.groups_joined || 0,
          session_duration_minutes: item.session_duration_minutes || 0
        })) as UserEngagementMetrics[]
    } catch (error) {
      logger.error('Error fetching engagement metrics:', error)
      return []
    }
  }
}

// Real-time Connection Management Service
export const realtimeConnectionService = {
  async registerConnection(
    userId: string,
    connectionId: string,
    channelName: string
  ): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase
        .from('realtime_connections')
        .upsert({
          user_id: userId,
          connection_id: connectionId,
          channel_name: channelName,
          status: 'connected',
          last_activity: new Date().toISOString()
        })

      return !error
    } catch (error) {
      logger.error('Error registering connection:', error)
      return false
    }
  },

  async updateConnectionActivity(connectionId: string): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase
        .from('realtime_connections')
        .update({
          last_activity: new Date().toISOString(),
          status: 'connected'
        })
        .eq('connection_id', connectionId)

      return !error
    } catch (error) {
      logger.error('Error updating connection activity:', error)
      return false
    }
  },

  async disconnectConnection(connectionId: string): Promise<boolean> {
    try {
      if (!supabase) return false

      const { error } = await supabase
        .from('realtime_connections')
        .update({ status: 'disconnected' })
        .eq('connection_id', connectionId)

      return !error
    } catch (error) {
      logger.error('Error disconnecting connection:', error)
      return false
    }
  }
}

// Enhanced error reporting that integrates with the new error logging
export const enhancedErrorReporting = {
  reportError: async (
    error: any,
    context: {
      userId?: string
      operation?: string
      component?: string
      metadata?: Record<string, any>
    } = {}
  ) => {
    const errorMessage = error?.message || 'Unknown error'
    const errorStack = error?.stack
    
    // Create error key for rate limiting
    const errorKey = `${context.component || 'unknown'}:${context.operation || 'unknown'}:${errorMessage}`
    
    // Check rate limit to prevent spam
    if (!errorRateLimiter.shouldLogError(errorKey)) {
      console.warn('Error logging rate limit exceeded for:', errorKey)
      return
    }
    
    // Determine error type
    let errorType: ErrorLog['error_type'] = 'unknown'
    if (errorMessage.includes('infinite recursion')) errorType = 'infinite_recursion'
    else if (errorMessage.includes('auth') || errorMessage.includes('login')) errorType = 'authentication'
    else if (errorMessage.includes('database') || errorMessage.includes('supabase')) errorType = 'database'
    else if (errorMessage.includes('upload') || errorMessage.includes('file')) errorType = 'file_upload'
    else if (errorMessage.includes('network') || errorMessage.includes('fetch')) errorType = 'network'
    else if (errorMessage.includes('memory') || errorMessage.includes('leak')) errorType = 'memory_leak'

    // Determine severity
    let severity: ErrorLog['severity'] = 'error'
    if (errorMessage.includes('critical') || errorMessage.includes('crash')) severity = 'critical'
    else if (errorMessage.includes('warn')) severity = 'warning'

    // Log to database
    await errorLoggingService.logError(
      context.userId,
      errorType,
      errorMessage,
      errorStack,
      {
        operation: context.operation,
        component: context.component,
        ...context.metadata
      },
      severity
    )

    // Also log to console for development
    logger.error('Enhanced error reported:', {
      errorType,
      errorMessage,
      context,
      severity
    })
  }
}
