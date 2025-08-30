/**
 * Admin Page - Enhanced Monitoring
 * 
 * Provides access to the enhanced monitoring dashboard for administrators
 * and power users to track system health and user activity.
 */

import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import EnhancedMonitoringDashboard from '../components/admin/EnhancedMonitoringDashboard'

const AdminPage: React.FC = () => {
  const { user, isGuest } = useAuth()

  if (isGuest || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="mb-4">
            <svg className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 0h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">
            Please log in with your account to access the monitoring dashboard.
          </p>
          <p className="text-sm text-gray-500">
            This page requires authentication to view system metrics and activity logs.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔧</span>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">System Administration</h1>
                <p className="text-sm text-gray-500">Enhanced monitoring and analytics</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Logged in as <span className="font-medium">{user.email}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <EnhancedMonitoringDashboard />
      </main>
    </div>
  )
}

export default AdminPage
