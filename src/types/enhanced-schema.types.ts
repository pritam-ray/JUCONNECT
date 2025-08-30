// Enhanced schema types for the new migration
export interface UserActivityLog {
  id: string
  user_id: string
  activity_type: 'login' | 'logout' | 'upload' | 'download' | 'message' | 'group_join' | 'group_leave' | 'profile_update' | 'error'
  activity_data: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ErrorLog {
  id: string
  user_id: string | null
  error_type: 'authentication' | 'database' | 'file_upload' | 'network' | 'infinite_recursion' | 'memory_leak' | 'unknown'
  error_message: string
  error_stack: string | null
  context: Record<string, any>
  severity: 'info' | 'warning' | 'error' | 'critical'
  resolved: boolean
  created_at: string
}

export interface FileUploadSession {
  id: string
  user_id: string
  file_name: string
  file_size: number
  file_type: string
  upload_status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  upload_progress: number
  error_message: string | null
  storage_path: string | null
  created_at: string
  completed_at: string | null
}

export interface RealtimeConnection {
  id: string
  user_id: string
  connection_id: string
  channel_name: string
  connected_at: string
  last_activity: string
  status: 'connected' | 'disconnected' | 'reconnecting'
}

export interface UserEngagementMetrics {
  id: string
  user_id: string
  metric_date: string
  page_views: number
  messages_sent: number
  files_uploaded: number
  files_downloaded: number
  groups_joined: number
  session_duration_minutes: number
  last_updated: string
}

// Function types
export interface ActivityLogger {
  logActivity: (
    userId: string,
    activityType: UserActivityLog['activity_type'],
    activityData?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ) => Promise<string>
}

export interface ErrorLogger {
  logError: (
    userId?: string,
    errorType?: ErrorLog['error_type'],
    errorMessage?: string,
    errorStack?: string,
    context?: Record<string, any>,
    severity?: ErrorLog['severity']
  ) => Promise<string>
}

export interface EngagementTracker {
  updateEngagement: (
    userId: string,
    metrics: {
      pageViews?: number
      messagesSent?: number
      filesUploaded?: number
      filesDownloaded?: number
      groupsJoined?: number
      sessionDuration?: number
    }
  ) => Promise<void>
}
