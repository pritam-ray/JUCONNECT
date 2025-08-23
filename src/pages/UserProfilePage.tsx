import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { User, Calendar, Eye, Upload, TrendingUp, Edit3, FileText, BarChart3 } from 'lucide-react'
import { getUserProfile, getUserStats, getUserContent, updateUserProfile, UserStats } from '../services/userService'
import { ContentWithCategory } from '../services/contentService'
import { useAuth } from '../contexts/AuthContext'
import ContentCard from '../components/content/ContentCard'
import ContentViewer from '../components/content/ContentViewer'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Modal from '../components/ui/Modal'
import Badge from '../components/ui/Badge'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatDistanceToNow } from 'date-fns'

const UserProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>()
  const { user: currentUser } = useAuth()
  
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [content, setContent] = useState<ContentWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentWithCategory | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  
  const [editForm, setEditForm] = useState({
    username: '',
    full_name: '',
    bio: ''
  })

  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    if (userId) {
      fetchUserData()
    }
  }, [userId])

  const fetchUserData = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const [profileData, statsData] = await Promise.all([
        getUserProfile(userId),
        getUserStats(userId)
      ])
      
      setProfile(profileData)
      setStats(statsData)
      
      if (profileData) {
        setEditForm({
          username: profileData.username,
          full_name: profileData.full_name,
          bio: profileData.bio || ''
        })
      }
      
      // Fetch user content
      fetchUserContent()
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserContent = async () => {
    if (!userId) return
    
    setContentLoading(true)
    try {
      const contentData = await getUserContent(userId, 20, 0)
      setContent(contentData)
    } catch (error) {
      console.error('Failed to fetch user content:', error)
    } finally {
      setContentLoading(false)
    }
  }

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUser || !isOwnProfile) return

    setEditLoading(true)
    setEditError('')

    try {
      await updateUserProfile(currentUser.id, {
        username: editForm.username.trim(),
        full_name: editForm.full_name.trim(),
        bio: editForm.bio.trim() || null
      })
      
      // Refresh profile data
      await fetchUserData()
      setShowEditModal(false)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update profile')
    } finally {
      setEditLoading(false)
    }
  }

  const handleContentClick = (contentItem: ContentWithCategory) => {
    setSelectedContent(contentItem)
    setShowViewer(true)
  }

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'question_paper': return 'Question Paper'
      case 'notes': return 'Notes'
      case 'syllabus': return 'Syllabus'
      case 'assignments': return 'Assignments'
      case 'other': return 'Other'
      default: return type
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading profile..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
          <p className="text-gray-600">The user profile you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-12 pb-20 sm:pb-4 lg:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="card-premium p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 lg:space-x-6 w-full lg:w-auto">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0 mx-auto sm:mx-0">
                <User className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              <div className="text-center sm:text-left w-full sm:w-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                  {profile.full_name}
                </h1>
                <p className="text-base sm:text-lg text-gray-600 mb-2">@{profile.username}</p>
                {profile.bio && (
                  <p className="text-sm sm:text-base text-gray-700 max-w-md leading-relaxed">{profile.bio}</p>
                )}
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 mt-3 text-xs sm:text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}</span>
                  </div>
                  {profile.is_admin && (
                    <Badge variant="premium" size="sm">Admin</Badge>
                  )}
                </div>
              </div>
            </div>
            
            {isOwnProfile && (
              <Button
                onClick={() => setShowEditModal(true)}
                variant="outline"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
                size="sm"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit Profile</span>
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <div className="card-premium p-3 sm:p-4 lg:p-6 text-center">
              <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mx-auto mb-2" />
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalUploads}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Uploads</div>
            </div>
            
            <div className="card-premium p-3 sm:p-4 lg:p-6 text-center">
              <Eye className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalViews}</div>
              <div className="text-xs sm:text-sm text-gray-600">Total Views</div>
            </div>
            
            <div className="card-premium p-3 sm:p-4 lg:p-6 text-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 mx-auto mb-2" />
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.recentUploads}</div>
              <div className="text-xs sm:text-sm text-gray-600">Recent Uploads</div>
            </div>
            
            <div className="card-premium p-3 sm:p-4 lg:p-6 text-center">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.categories.length}</div>
              <div className="text-xs sm:text-sm text-gray-600">Categories</div>
            </div>
          </div>
        )}

        {/* Content Breakdown */}
        {stats && (stats.contentTypes.length > 0 || stats.categories.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            {/* Content Types */}
            {stats.contentTypes.length > 0 && (
              <div className="card-premium p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Content Types</span>
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {stats.contentTypes.map((type, index) => (
                    <div key={type.type} className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-700 truncate">{getContentTypeLabel(type.type)}</span>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary-600 h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(type.count / stats.totalUploads) * 100}%`,
                              animationDelay: `${index * 0.1}s`
                            }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right">
                          {type.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Categories */}
            {stats.categories.length > 0 && (
              <div className="card-premium p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Top Categories</span>
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {stats.categories.slice(0, 5).map((category, index) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <span className="text-sm sm:text-base text-gray-700 truncate">{category.name}</span>
                      <div className="flex items-center space-x-2 ml-2">
                        <div className="w-16 sm:w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${(category.count / stats.totalUploads) * 100}%`,
                              animationDelay: `${index * 0.1}s`
                            }}
                          />
                        </div>
                        <span className="text-xs sm:text-sm font-medium text-gray-900 w-6 sm:w-8 text-right">
                          {category.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Content */}
        <div className="card-premium p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              {isOwnProfile ? 'Your Uploads' : `${profile.full_name}'s Uploads`}
            </h2>
            <span className="text-xs sm:text-sm text-gray-600">
              {content.length} items
            </span>
          </div>

          {contentLoading ? (
            <div className="flex justify-center py-8 sm:py-12">
              <LoadingSpinner />
            </div>
          ) : content.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                {isOwnProfile ? 'No uploads yet' : 'No public uploads'}
              </h3>
              <p className="text-sm sm:text-base text-gray-600 px-4">
                {isOwnProfile 
                  ? 'Start sharing your study materials with the community'
                  : 'This user hasn\'t shared any content yet'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {content.map((item, index) => (
                <div 
                  key={item.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ContentCard
                    content={item}
                    onClick={() => handleContentClick(item)}
                    showUploader={false}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content Viewer Modal */}
        <ContentViewer
          content={selectedContent}
          isOpen={showViewer}
          onClose={() => {
            setShowViewer(false)
            setSelectedContent(null)
          }}
        />

        {/* Edit Profile Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Profile"
          size="md"
        >
          <form onSubmit={handleEditProfile} className="space-y-4 sm:space-y-6">
            {editError && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
                {editError}
              </div>
            )}

            <Input
              name="username"
              label="Username"
              value={editForm.username}
              onChange={(e) => setEditForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username"
              required
              disabled={editLoading}
              premium
            />

            <Input
              name="full_name"
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter full name"
              required
              disabled={editLoading}
              premium
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio (Optional)
              </label>
              <textarea
                name="bio"
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                rows={3}
                className="input-premium resize-none"
                disabled={editLoading}
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">
                {editForm.bio.length}/500 characters
              </p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={editLoading}
                className="w-full sm:w-auto order-2 sm:order-1"
                size="sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={editLoading}
                disabled={editLoading}
                className="w-full sm:w-auto order-1 sm:order-2"
                size="sm"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  )
}

export default UserProfilePage