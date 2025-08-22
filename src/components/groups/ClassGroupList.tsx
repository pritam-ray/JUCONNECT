import React, { useState, useEffect } from 'react'
import { Plus, Users, BookOpen, Search, Filter, Star, Clock, Lock, Crown } from 'lucide-react'
import { getAllClassGroups, getUserGroups, joinClassGroup, isGroupAdmin, ClassGroupWithDetails } from '../../services/classGroupService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import LoadingSpinner from '../ui/LoadingSpinner'
import CreateGroupModal from './CreateGroupModal'
import GroupPasswordModal from './GroupPasswordModal'
import { formatDistanceToNow } from 'date-fns'

interface ClassGroupListProps {
  onGroupSelect: (group: ClassGroupWithDetails) => void
}

const ClassGroupList: React.FC<ClassGroupListProps> = ({ onGroupSelect }) => {
  const { user, isGuest } = useAuth()
  const [allGroups, setAllGroups] = useState<ClassGroupWithDetails[]>([])
  const [userGroups, setUserGroups] = useState<ClassGroupWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedGroupForPassword, setSelectedGroupForPassword] = useState<ClassGroupWithDetails | null>(null)
  const [passwordError, setPasswordError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'my-groups' | 'all-groups'>('my-groups')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGroups()
  }, [user])

  const fetchGroups = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // First, try to fetch all groups (this should work without authentication)
      let allGroupsData: ClassGroupWithDetails[] = []
      let userGroupsData: ClassGroupWithDetails[] = []
      
      try {
        allGroupsData = await getAllClassGroups()
        console.log('All groups fetched:', allGroupsData.length)
      } catch (error: any) {
        console.error('Failed to fetch all groups:', error)
        setError(`Failed to load groups: ${error.message}`)
        allGroupsData = []
      }
      
      // Only fetch user groups if user is authenticated and not a guest
      if (user && !isGuest) {
        try {
          userGroupsData = await getUserGroups(user.id)
          console.log('User groups fetched:', userGroupsData.length)
        } catch (error: any) {
          console.error('Failed to fetch user groups:', error)
          // Don't show error for user groups if we got all groups successfully
          if (allGroupsData.length === 0) {
            setError(`Failed to load user groups: ${error.message}`)
          }
          userGroupsData = []
        }
      }
      
      setAllGroups(allGroupsData)
      setUserGroups(userGroupsData)
    } catch (error: any) {
      console.error('Failed to fetch groups:', error)
      setError(`Failed to load groups: ${error.message || 'Unknown error'}`)
      // Set empty arrays as fallback
      setAllGroups([])
      setUserGroups([])
    } finally {
      setLoading(false)
    }
  }

  const handleJoinGroup = async (groupId: string, group?: ClassGroupWithDetails) => {
    if (!user || isGuest) return

    // Check if group is password protected
    const targetGroup = group || allGroups.find(g => g.id === groupId)
    if (targetGroup?.is_password_protected) {
      setSelectedGroupForPassword(targetGroup)
      setShowPasswordModal(true)
      setPasswordError('')
      return
    }

    // Join public group directly
    try {
      setJoining(groupId)
      await joinClassGroup(groupId, user.id)
      await fetchGroups()
    } catch (error: any) {
      console.error('Failed to join group:', error)
      alert(error.message || 'Failed to join group')
    } finally {
      setJoining(null)
    }
  }

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedGroupForPassword || !user) return

    try {
      setJoining(selectedGroupForPassword.id)
      setPasswordError('')
      
      await joinClassGroup(selectedGroupForPassword.id, user.id, password)
      
      // Close modal and refresh groups
      setShowPasswordModal(false)
      setSelectedGroupForPassword(null)
      await fetchGroups()
    } catch (error: any) {
      console.error('Failed to join protected group:', error)
      setPasswordError(error.message || 'Failed to join group')
    } finally {
      setJoining(null)
    }
  }

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false)
    setSelectedGroupForPassword(null)
    setPasswordError('')
    setJoining(null)
  }

  const filteredGroups = (groups: ClassGroupWithDetails[]) => {
    return groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           group.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           group.subject?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesYear = selectedYear === null || group.year === selectedYear
      return matchesSearch && matchesYear
    })
  }

  const years = Array.from(new Set(allGroups.map(g => g.year))).sort()

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" text="Loading groups..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="text-red-600 text-center">
          <h3 className="text-lg font-medium mb-2">Unable to load groups</h3>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchGroups} className="mt-4">
            Try Again
          </Button>
        </div>
        <div className="text-center text-sm text-gray-500 mt-4">
          <p>This might be because:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Database migrations haven't been applied</li>
            <li>Group tables don't exist yet</li>
            <li>Network connectivity issue</li>
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Class Groups</h2>
          <p className="text-gray-600">Join your class groups to collaborate and share resources</p>
        </div>
        
        {user && !isGuest && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : null)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('my-groups')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'my-groups'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          My Groups ({userGroups.length})
        </button>
        <button
          onClick={() => setActiveTab('all-groups')}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'all-groups'
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          All Groups ({allGroups.length})
        </button>
      </div>

      {/* Groups List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'my-groups' ? (
          filteredGroups(userGroups).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery || selectedYear ? 'No matching groups found' : 'No groups joined yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery || selectedYear 
                  ? 'Try adjusting your search criteria'
                  : 'Join your first class group to get started'
                }
              </p>
              {!searchQuery && !selectedYear && (
                <Button onClick={() => setActiveTab('all-groups')}>
                  Browse All Groups
                </Button>
              )}
            </div>
          ) : (
            filteredGroups(userGroups).map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onSelect={() => onGroupSelect(group)}
                onJoin={() => handleJoinGroup(group.id, group)}
                isJoining={joining === group.id}
                showJoinButton={false}
              />
            ))
          )
        ) : (
          filteredGroups(allGroups).length === 0 ? (
            <div className="col-span-full text-center py-12">
              <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredGroups(allGroups).map((group) => {
              const isJoined = userGroups.some(ug => ug.id === group.id)
              return (
                <GroupCard
                  key={group.id}
                  group={group}
                  onSelect={() => onGroupSelect(group)}
                  onJoin={() => handleJoinGroup(group.id, group)}
                  isJoining={joining === group.id}
                  showJoinButton={!isJoined && !!user && !isGuest}
                  isJoined={isJoined}
                />
              )
            })
          )
        )}
      </div>

      {/* Create Group Modal */}
      <CreateGroupModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false)
          fetchGroups()
        }}
      />

      {/* Password Modal */}
      <GroupPasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        onSubmit={handlePasswordSubmit}
        groupName={selectedGroupForPassword?.name || ''}
        loading={joining === selectedGroupForPassword?.id}
        error={passwordError}
      />
    </div>
  )
}

interface GroupCardProps {
  group: ClassGroupWithDetails
  onSelect: () => void
  onJoin: (group?: ClassGroupWithDetails) => void
  isJoining: boolean
  showJoinButton: boolean
  isJoined?: boolean
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  onSelect,
  onJoin,
  isJoining,
  showJoinButton,
  isJoined = false
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="primary">
              Year {group.year} - Section {group.section}
            </Badge>
            {group.user_role === 'admin' && (
              <Badge variant="warning">
                <Crown className="h-3 w-3 mr-1" />
                Admin
              </Badge>
            )}
            {group.created_by === user?.id && (
              <Badge variant="success">
                <Crown className="h-3 w-3 mr-1" />
                Creator
              </Badge>
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{group.name}</h3>
          {group.subject && (
            <p className="text-sm text-primary-600 font-medium mb-2">{group.subject}</p>
          )}
          {group.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{group.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Users className="h-4 w-4" />
            <span>{group.member_count} members</span>
          </div>
          {group.is_password_protected && (
            <div className="flex items-center space-x-1 text-amber-600">
              <Lock className="h-4 w-4" />
              <span className="text-sm font-medium">Protected</span>
            </div>
          )}
          {group.unread_count && group.unread_count > 0 && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
              <span className="text-primary-600 font-medium">
                {group.unread_count} unread
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(group.updated_at), { addSuffix: true })}</span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {isJoined ? (
          <Button
            onClick={onSelect}
            className="flex-1"
            variant="primary"
          >
            Open Group
          </Button>
        ) : showJoinButton ? (
          <>
            <Button
              onClick={() => onJoin(group)}
              loading={isJoining}
              disabled={isJoining}
              className="flex-1"
            >
              {group.is_password_protected ? (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Join Group
                </>
              ) : (
                'Join Group'
              )}
            </Button>
            <Button
              onClick={onSelect}
              variant="outline"
              className="px-3"
            >
              View
            </Button>
          </>
        ) : (
          <Button
            onClick={onSelect}
            variant="outline"
            className="flex-1"
          >
            View Group
          </Button>
        )}
      </div>
    </div>
  )
}

export default ClassGroupList