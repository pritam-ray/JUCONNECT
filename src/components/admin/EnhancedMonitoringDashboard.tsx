/**
 * Enhanced Monitoring Dashboard
 * 
 *   const loadDashboardData = useCallback(async () => {s real-time monitoring and analytics for:
 * - User activity logs
 * - Error tracking and resolution  
 * - File upload statistics
 * - User engagement metrics
 * - Real-time connection status
 */

import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  activityService,
  errorLoggingService,
  engagementService
} from '../../services/enhancedServices'
import { 
  UserActivityLog, 
  ErrorLog, 
  UserEngagementMetrics 
} from '../../types/enhanced-schema.types'

interface DashboardStats {
  totalActivities: number
  totalErrors: number
  totalUploads: number
  activeConnections: number
  avgEngagementScore: number
}

export const EnhancedMonitoringDashboard: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalActivities: 0,
    totalErrors: 0,
    totalUploads: 0,
    activeConnections: 0,
    avgEngagementScore: 0
  })
  const [recentActivities, setRecentActivities] = useState<UserActivityLog[]>([])
  const [recentErrors, setRecentErrors] = useState<ErrorLog[]>([])
  const [engagementData, setEngagementData] = useState<UserEngagementMetrics[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activities' | 'errors' | 'engagement'>('overview')

  const loadDashboardData = useCallback(async () => {
    if (!user) return

    try {
      setLoading(true)

      // Load user's activities
      const activities = await activityService.getUserActivity(user.id, 50)
      setRecentActivities(activities)

      // Load user's errors
      const errors = await errorLoggingService.getErrorLogs(user.id, 20)
      setRecentErrors(errors)

      // Load engagement metrics
      const engagement = await engagementService.getEngagementMetrics(user.id, 30)
      setEngagementData(engagement)

      // Calculate stats
      const avgEngagement = engagement.length > 0 
        ? engagement.reduce((sum, metric) => sum + (metric.page_views || 0), 0) / engagement.length
        : 0

      setStats({
        totalActivities: activities.length,
        totalErrors: errors.filter(e => !e.resolved).length,
        totalUploads: activities.filter(a => a.activity_type === 'upload').length,
        activeConnections: 1, // Placeholder - would need real-time data
        avgEngagementScore: Math.round(avgEngagement)
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user, loadDashboardData])

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getActivityIcon = (type: UserActivityLog['activity_type']) => {
    switch (type) {
      case 'login': return '🔑'
      case 'logout': return '🚪'
      case 'upload': return '📤'
      case 'download': return '📥'
      case 'message': return '💬'
      case 'group_join': return '👥'
      case 'group_leave': return '👋'
      case 'profile_update': return '📝'
      case 'error': return '⚠️'
      default: return '📊'
    }
  }

  const getErrorSeverityColor = (severity: ErrorLog['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'error': return 'text-orange-600 bg-orange-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-blue-600 bg-blue-100'
    }
  }

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Please log in to view monitoring dashboard</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-500">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Enhanced Monitoring Dashboard</h1>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Activities</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalActivities}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Open Errors</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalErrors}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">📤</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">File Uploads</p>
              <p className="text-xl font-semibold text-gray-900">{stats.totalUploads}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">🔗</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active Connections</p>
              <p className="text-xl font-semibold text-gray-900">{stats.activeConnections}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-2xl">💯</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Avg Engagement</p>
              <p className="text-xl font-semibold text-gray-900">{stats.avgEngagementScore}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: '📊' },
            { id: 'activities', name: 'Activities', icon: '📝' },
            { id: 'errors', name: 'Errors', icon: '⚠️' },
            { id: 'engagement', name: 'Engagement', icon: '💯' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activities */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activities</h3>
            <div className="space-y-3">
              {recentActivities.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <span className="text-xl">{getActivityIcon(activity.activity_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {activity.activity_type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-500">{formatTimestamp(activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Errors */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Errors</h3>
            <div className="space-y-3">
              {recentErrors.slice(0, 10).map((error) => (
                <div key={error.id} className="flex items-start space-x-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getErrorSeverityColor(error.severity)}`}>
                    {error.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{error.error_type}</p>
                    <p className="text-xs text-gray-500 truncate">{error.error_message}</p>
                    <p className="text-xs text-gray-400">{formatTimestamp(error.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Activity Log</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-2">{getActivityIcon(activity.activity_type)}</span>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {activity.activity_type.replace('_', ' ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {activity.activity_data && Object.keys(activity.activity_data).length > 0
                            ? JSON.stringify(activity.activity_data, null, 2)
                            : 'No additional data'
                          }
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatTimestamp(activity.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'errors' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Error Log</h3>
            <div className="space-y-4">
              {recentErrors.map((error) => (
                <div key={error.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getErrorSeverityColor(error.severity)}`}>
                          {error.severity}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{error.error_type}</span>
                        <span className="text-xs text-gray-500">{formatTimestamp(error.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{error.error_message}</p>
                      {error.error_stack && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer">Stack Trace</summary>
                          <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                            {error.error_stack}
                          </pre>
                        </details>
                      )}
                    </div>
                    {!error.resolved && (
                      <button
                        onClick={async () => {
                          const success = await errorLoggingService.markErrorResolved(error.id)
                          if (success) {
                            await loadDashboardData()
                          }
                        }}
                        className="ml-4 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Engagement Metrics (Last 30 Days)</h3>
            {engagementData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Page Views</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Groups</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {engagementData.map((metric) => (
                      <tr key={`${metric.user_id}-${metric.metric_date}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(metric.metric_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.page_views || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.messages_sent || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(metric.files_uploaded || 0) + (metric.files_downloaded || 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.groups_joined || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {metric.session_duration_minutes || 0}m
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No engagement data available yet</p>
            )}
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="mt-6 text-center">
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh Data'}
        </button>
      </div>
    </div>
  )
}

export default EnhancedMonitoringDashboard
