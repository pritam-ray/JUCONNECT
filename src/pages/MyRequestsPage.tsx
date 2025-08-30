import React, { useState, useEffect, useCallback } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Clock, CheckCircle, XCircle, FileText, MessageSquare, AlertTriangle, Lightbulb, Edit, Trash2, HelpCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getUserUpdateRequests, 
  createUpdateRequest,
  UpdateRequestWithProfile 
} from '../services/updateRequestService'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

const MyRequestsPage: React.FC = () => {
  const { user, loading: authLoading, isGuest } = useAuth()
  const [requests, setRequests] = useState<UpdateRequestWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newRequest, setNewRequest] = useState({
    contentType: 'general_query' as 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'content_update' | 'content_removal' | 'bug_report' | 'feature_request' | 'general_query',
    contentId: '',
    issueDescription: '',
    suggestedChanges: '',
  })

  const fetchData = useCallback(async () => {
    try {
      const requestsData = await getUserUpdateRequests(user!.id)
      setRequests(requestsData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user && !isGuest) {
      fetchData()
    }
  }, [user, isGuest, fetchData])

  const handleNewRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || submitting) return

    setSubmitting(true)
    try {
      // Map request types to database-compatible values
      let dbContentType = newRequest.contentType
      if (['general_query', 'content_update', 'content_removal', 'bug_report', 'feature_request'].includes(newRequest.contentType)) {
        dbContentType = 'notes' // Use 'notes' as fallback for new request types
      }

      await createUpdateRequest({
        user_id: user.id,
        content_type: dbContentType as any,
        content_id: newRequest.contentId || null,
        issue_description: newRequest.issueDescription.trim(),
        suggested_changes: newRequest.suggestedChanges.trim() || null,
      })

      // Reset form and close modal
      setNewRequest({
        contentType: 'general_query',
        contentId: '',
        issueDescription: '',
        suggestedChanges: '',
      })
      setShowNewRequestModal(false)
      
      // Refresh requests
      await fetchData()
    } catch (error: any) {
      alert(error.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'rejected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      default:
        return 'neutral'
    }
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'question_paper':
        return 'Question Paper'
      case 'notes':
        return 'Study Notes'
      case 'syllabus':
        return 'Syllabus'
      case 'educational_link':
        return 'Educational Link'
      case 'assignments':
        return 'Assignments'
      case 'content_update':
        return 'Content Update'
      case 'content_removal':
        return 'Content Removal'
      case 'bug_report':
        return 'Bug Report'
      case 'feature_request':
        return 'Feature Request'
      case 'general_query':
        return 'General Query'
      default:
        return type
    }
  }

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'question_paper':
        return <FileText className="h-4 w-4" />
      case 'notes':
        return <FileText className="h-4 w-4" />
      case 'content_update':
        return <Edit className="h-4 w-4" />
      case 'content_removal':
        return <Trash2 className="h-4 w-4" />
      case 'bug_report':
        return <AlertTriangle className="h-4 w-4" />
      case 'feature_request':
        return <Lightbulb className="h-4 w-4" />
      case 'general_query':
        return <HelpCircle className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || isGuest) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 px-4 pb-20 sm:pb-4 lg:pb-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
            <div className="w-full lg:w-auto">
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Support & Requests</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1 mb-3">
                Submit your queries, report issues, or request content updates
              </p>
              
              {/* Request Types Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  What can you request?
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-blue-800">
                  <div className="flex items-center">
                    <HelpCircle className="h-3 w-3 mr-2 text-blue-600" />
                    General queries & questions
                  </div>
                  <div className="flex items-center">
                    <Edit className="h-3 w-3 mr-2 text-blue-600" />
                    Content updates & corrections
                  </div>
                  <div className="flex items-center">
                    <Trash2 className="h-3 w-3 mr-2 text-blue-600" />
                    Content removal requests
                  </div>
                  <div className="flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-2 text-blue-600" />
                    Bug reports & technical issues
                  </div>
                  <div className="flex items-center">
                    <Lightbulb className="h-3 w-3 mr-2 text-blue-600" />
                    Feature suggestions
                  </div>
                  <div className="flex items-center">
                    <FileText className="h-3 w-3 mr-2 text-blue-600" />
                    Material-specific issues
                  </div>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowNewRequestModal(true)}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </Button>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <MessageSquare className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                No requests yet
              </h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 px-4">
                You haven't submitted any requests yet. Feel free to ask questions, report issues, or suggest improvements!
              </p>
              <Button onClick={() => setShowNewRequestModal(true)} size="sm">
                Submit Your First Request
              </Button>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center space-x-1">
                          {getStatusIcon(request.status)}
                          <Badge variant={getStatusBadgeVariant(request.status) as any} size="sm">
                            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                          </Badge>
                        </div>
                        <Badge variant="neutral" size="sm" className="flex items-center gap-1">
                          {getContentTypeIcon(request.content_type)}
                          {getContentTypeLabel(request.content_type)}
                        </Badge>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                        Issue Description
                      </h3>
                      <p className="text-gray-700 mb-3 text-sm sm:text-base leading-relaxed">
                        {request.issue_description}
                      </p>
                      
                      {request.suggested_changes && (
                        <>
                          <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">
                            Suggested Changes
                          </h4>
                          <p className="text-gray-700 mb-3 text-sm sm:text-base leading-relaxed">
                            {request.suggested_changes}
                          </p>
                        </>
                      )}
                      
                      {request.admin_notes && (
                        <>
                          <h4 className="font-medium text-gray-900 mb-1 text-sm sm:text-base">
                            Admin Response
                          </h4>
                          <p className="text-gray-700 mb-3 text-sm sm:text-base leading-relaxed">
                            {request.admin_notes}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs sm:text-sm text-gray-500 pt-3 border-t border-gray-100 space-y-2 sm:space-y-0">
                    <span>
                      Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {request.reviewed_by && request.reviewer && (
                      <span className="truncate">
                        Reviewed by @{request.reviewer.username}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Request Modal */}
        <Modal
          isOpen={showNewRequestModal}
          onClose={() => setShowNewRequestModal(false)}
          title="Submit a Request"
          size="lg"
        >
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>Need help or have feedback?</strong> Use this form to ask questions, report issues, 
              request content updates, suggest new features, or get support with the platform.
            </p>
          </div>
          
          <form onSubmit={handleNewRequestSubmit} className="space-y-4 sm:space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Request Type *
              </label>
              <select
                value={newRequest.contentType}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  contentType: e.target.value as any 
                }))}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none bg-white"
                disabled={submitting}
              >
                <option value="general_query">General Query - Ask questions or get help</option>
                <option value="content_update">Content Update - Report errors or request corrections</option>
                <option value="content_removal">Content Removal - Request content to be removed</option>
                <option value="bug_report">Bug Report - Report technical issues or glitches</option>
                <option value="feature_request">Feature Request - Suggest new features or improvements</option>
                <option value="notes">Study Notes - Issues with study notes</option>
                <option value="question_paper">Question Paper - Issues with question papers</option>
                <option value="syllabus">Syllabus - Issues with syllabus content</option>
                <option value="educational_link">Educational Link - Issues with educational links</option>
                <option value="assignments">Assignments - Issues with assignments</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Choose the category that best describes your request
              </p>
            </div>

            <Input
              label="Content ID (Optional)"
              value={newRequest.contentId}
              onChange={(e) => setNewRequest(prev => ({ 
                ...prev, 
                contentId: e.target.value 
              }))}
              placeholder="Enter content ID if you know it"
              helpText="If your request is about specific content, you can provide the content ID here"
              disabled={submitting}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Describe your request *
              </label>
              <textarea
                value={newRequest.issueDescription}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  issueDescription: e.target.value 
                }))}
                placeholder="Please describe your query, issue, or request in detail..."
                rows={4}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                disabled={submitting}
              />
              <p className="text-xs text-gray-500 mt-1">
                Be as specific as possible to help us understand and address your request
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details / Suggestions (Optional)
              </label>
              <textarea
                value={newRequest.suggestedChanges}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  suggestedChanges: e.target.value 
                }))}
                placeholder="Any additional information, suggestions, or proposed solutions..."
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                disabled={submitting}
              />
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewRequestModal(false)}
                disabled={submitting}
                className="w-full sm:w-auto order-2 sm:order-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !newRequest.issueDescription.trim()}
                className="w-full sm:w-auto order-1 sm:order-2"
                size="sm"
              >
                Submit Request
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}

export default MyRequestsPage