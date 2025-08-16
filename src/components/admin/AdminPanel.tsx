import React, { useState, useEffect } from 'react'
import { Shield, AlertTriangle, FileText, MessageCircle, Users, BarChart3 } from 'lucide-react'
import { 
  getAllContentReports, 
  getAllChatReports, 
  updateContentReportStatus,
  updateChatReportStatus,
  removeReportedContent,
  removeReportedChatMessage,
  getReportStatistics,
  ContentReportWithDetails,
  ChatReportWithDetails
} from '../../services/reportingService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Modal from '../ui/Modal'
import LoadingSpinner from '../ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

interface AdminPanelProps {
  isOpen: boolean
  onClose: () => void
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const { user, profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'chat'>('overview')
  const [contentReports, setContentReports] = useState<ContentReportWithDetails[]>([])
  const [chatReports, setChatReports] = useState<ChatReportWithDetails[]>([])
  const [statistics, setStatistics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (isOpen && profile?.is_admin) {
      fetchData()
    }
  }, [isOpen, profile])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [contentReportsData, chatReportsData, statsData] = await Promise.all([
        getAllContentReports(),
        getAllChatReports(),
        getReportStatistics()
      ])
      
      setContentReports(contentReportsData)
      setChatReports(chatReportsData)
      setStatistics(statsData)
    } catch (error) {
      console.error('Failed to fetch admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleContentReportAction = async (
    reportId: string,
    action: 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string,
    removeContent?: boolean
  ) => {
    if (!user) return
    
    setActionLoading(true)
    try {
      if (removeContent) {
        const report = contentReports.find(r => r.id === reportId)
        if (report) {
          await removeReportedContent(
            report.content_id,
            reportId,
            user.id,
            adminNotes || 'Content removed due to policy violation'
          )
        }
      } else {
        await updateContentReportStatus(reportId, action, user.id, adminNotes)
      }
      
      await fetchData()
      setSelectedReport(null)
    } catch (error: any) {
      console.error('Failed to update report:', error)
      alert(error.message || 'Failed to update report')
    } finally {
      setActionLoading(false)
    }
  }

  const handleChatReportAction = async (
    reportId: string,
    action: 'reviewed' | 'resolved' | 'dismissed',
    adminNotes?: string,
    removeMessage?: boolean
  ) => {
    if (!user) return
    
    setActionLoading(true)
    try {
      if (removeMessage) {
        const report = chatReports.find(r => r.id === reportId)
        if (report) {
          await removeReportedChatMessage(
            report.message_id,
            reportId,
            user.id,
            adminNotes || 'Message removed due to policy violation'
          )
        }
      } else {
        await updateChatReportStatus(reportId, action, user.id, adminNotes)
      }
      
      await fetchData()
      setSelectedReport(null)
    } catch (error: any) {
      console.error('Failed to update report:', error)
      alert(error.message || 'Failed to update report')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'reviewed': return 'primary'
      case 'resolved': return 'success'
      case 'dismissed': return 'neutral'
      default: return 'neutral'
    }
  }

  if (!profile?.is_admin) {
    return null
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <div className="p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Shield className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        </div>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-1 font-medium text-sm ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="h-4 w-4 inline mr-1" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`pb-2 px-1 font-medium text-sm ${
              activeTab === 'content'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="h-4 w-4 inline mr-1" />
            Content Reports ({contentReports.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`pb-2 px-1 font-medium text-sm ${
              activeTab === 'chat'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="h-4 w-4 inline mr-1" />
            Chat Reports ({chatReports.filter(r => r.status === 'pending').length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {activeTab === 'overview' && statistics && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-orange-900">Content Reports</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="text-2xl font-bold text-orange-900">
                        {statistics.contentReports.pending}
                      </div>
                      <div className="text-sm text-orange-700">
                        Pending ({statistics.contentReports.total} total)
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-900">Chat Reports</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="text-2xl font-bold text-red-900">
                        {statistics.chatReports.pending}
                      </div>
                      <div className="text-sm text-red-700">
                        Pending ({statistics.chatReports.total} total)
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Review and moderate reported content to maintain community standards.</p>
                </div>
              </div>
            )}

            {activeTab === 'content' && (
              <div className="space-y-4">
                {contentReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No content reports found
                  </div>
                ) : (
                  contentReports.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={getStatusBadgeVariant(report.status) as any}>
                              {report.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {report.reason}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 mb-1">
                            {report.content?.title || 'Content Title'}
                          </h4>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {report.description}
                          </p>
                          
                          <div className="text-xs text-gray-500">
                            Reported by @{report.reporter?.username} • {' '}
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReport(report)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="space-y-4">
                {chatReports.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No chat reports found
                  </div>
                ) : (
                  chatReports.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant={getStatusBadgeVariant(report.status) as any}>
                              {report.status}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              {report.reason}
                            </span>
                          </div>
                          
                          <div className="bg-gray-50 p-3 rounded mb-2">
                            <p className="text-sm text-gray-900">
                              "{report.chat_messages?.message}"
                            </p>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-2">
                            {report.description}
                          </p>
                          
                          <div className="text-xs text-gray-500">
                            Reported by @{report.reporter?.username} • {' '}
                            {formatDistanceToNow(new Date(report.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedReport(report)}
                        >
                          Review
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Report Review Modal */}
        {selectedReport && (
          <Modal
            isOpen={!!selectedReport}
            onClose={() => setSelectedReport(null)}
            title="Review Report"
            size="md"
          >
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Report Details</h4>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm"><strong>Reason:</strong> {selectedReport.reason}</p>
                  {selectedReport.description && (
                    <p className="text-sm mt-1"><strong>Description:</strong> {selectedReport.description}</p>
                  )}
                  <p className="text-sm mt-1">
                    <strong>Reported by:</strong> @{selectedReport.reporter?.username}
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (selectedReport.content_id) {
                      handleContentReportAction(selectedReport.id, 'reviewed')
                    } else {
                      handleChatReportAction(selectedReport.id, 'reviewed')
                    }
                  }}
                  loading={actionLoading}
                >
                  Mark Reviewed
                </Button>
                
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    if (selectedReport.content_id) {
                      handleContentReportAction(selectedReport.id, 'resolved', 'Content removed', true)
                    } else {
                      handleChatReportAction(selectedReport.id, 'resolved', 'Message removed', true)
                    }
                  }}
                  loading={actionLoading}
                >
                  Remove Content
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (selectedReport.content_id) {
                      handleContentReportAction(selectedReport.id, 'dismissed', 'No action needed')
                    } else {
                      handleChatReportAction(selectedReport.id, 'dismissed', 'No action needed')
                    }
                  }}
                  loading={actionLoading}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </Modal>
  )
}

export default AdminPanel