import React, { useState, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Clock, CheckCircle, XCircle, FileText } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { 
  getUserUpdateRequests, 
  createUpdateRequest,
  UpdateRequestWithProfile 
} from '../services/updateRequestService'
import { getAllCategories, CategoryWithChildren } from '../services/categoryService'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

const MyRequestsPage: React.FC = () => {
  const { user, loading: authLoading, isGuest } = useAuth()
  const [requests, setRequests] = useState<UpdateRequestWithProfile[]>([])
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewRequestModal, setShowNewRequestModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [newRequest, setNewRequest] = useState({
    contentType: 'notes' as 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'other',
    contentId: '',
    issueDescription: '',
    suggestedChanges: '',
  })

  useEffect(() => {
    if (user && !isGuest) {
      fetchData()
    }
  }, [user, isGuest])

  const fetchData = async () => {
    try {
      const [requestsData, categoriesData] = await Promise.all([
        getUserUpdateRequests(user!.id),
        getAllCategories()
      ])
      setRequests(requestsData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleNewRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || submitting) return

    setSubmitting(true)
    try {
      await createUpdateRequest({
        user_id: user.id,
        content_type: newRequest.contentType,
        content_id: newRequest.contentId || null,
        issue_description: newRequest.issueDescription.trim(),
        suggested_changes: newRequest.suggestedChanges.trim() || null,
      })

      // Reset form and close modal
      setNewRequest({
        contentType: 'notes',
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
        return 'Notes'
      case 'syllabus':
        return 'Syllabus'
      case 'educational_link':
        return 'Educational Link'
      case 'assignments':
        return 'Assignments'
      case 'other':
        return 'Other'
      default:
        return type
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
    <div className="min-h-screen bg-gray-50 py-6 md:py-12 px-4 md:px-0">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">My Update Requests</h1>
              <p className="text-gray-600 mt-1">
                Submit requests to update or correct existing content
              </p>
            </div>
            <Button
              onClick={() => setShowNewRequestModal(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Request</span>
            </Button>
          </div>

          {/* Requests List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No requests yet
              </h3>
              <p className="text-gray-600 mb-4">
                You haven't submitted any update requests
              </p>
              <Button onClick={() => setShowNewRequestModal(true)}>
                Submit Your First Request
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {getStatusIcon(request.status)}
                        <Badge variant={getStatusBadgeVariant(request.status) as any}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                        <Badge variant="neutral">
                          {getContentTypeLabel(request.content_type)}
                        </Badge>
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-2">
                        Issue Description
                      </h3>
                      <p className="text-gray-700 mb-3">
                        {request.issue_description}
                      </p>
                      
                      {request.suggested_changes && (
                        <>
                          <h4 className="font-medium text-gray-900 mb-1">
                            Suggested Changes
                          </h4>
                          <p className="text-gray-700 mb-3">
                            {request.suggested_changes}
                          </p>
                        </>
                      )}
                      
                      {request.admin_notes && (
                        <>
                          <h4 className="font-medium text-gray-900 mb-1">
                            Admin Response
                          </h4>
                          <p className="text-gray-700 mb-3">
                            {request.admin_notes}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 pt-3 border-t border-gray-100">
                    <span>
                      Submitted {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                    </span>
                    {request.reviewed_by && request.reviewer && (
                      <span>
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
          title="Submit Update Request"
          size="lg"
        >
          <form onSubmit={handleNewRequestSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type *
              </label>
              <select
                value={newRequest.contentType}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  contentType: e.target.value as any 
                }))}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={submitting}
              >
                <option value="notes">Study Notes</option>
                <option value="question_paper">Question Paper</option>
                <option value="syllabus">Syllabus</option>
                <option value="educational_link">Educational Link</option>
               <option value="assignments">Assignments</option>
               <option value="other">Other</option>
              </select>
            </div>

            <Input
              label="Content ID (Optional)"
              value={newRequest.contentId}
              onChange={(e) => setNewRequest(prev => ({ 
                ...prev, 
                contentId: e.target.value 
              }))}
              placeholder="Enter content ID if you know it"
              helpText="Leave blank if you don't know the specific content ID"
              disabled={submitting}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Description *
              </label>
              <textarea
                value={newRequest.issueDescription}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  issueDescription: e.target.value 
                }))}
                placeholder="Describe the issue or problem you found..."
                rows={4}
                required
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Suggested Changes (Optional)
              </label>
              <textarea
                value={newRequest.suggestedChanges}
                onChange={(e) => setNewRequest(prev => ({ 
                  ...prev, 
                  suggestedChanges: e.target.value 
                }))}
                placeholder="Suggest how the issue should be resolved..."
                rows={3}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={submitting}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewRequestModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={submitting}
                disabled={submitting || !newRequest.issueDescription.trim()}
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