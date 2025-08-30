import React, { useState, useEffect, useCallback } from 'react'
import { 
  Crown, 
  UserMinus, 
  UserPlus, 
  Trash2, 
  Shield, 
  ShieldOff,
  Edit3,
  Save,
  X
} from 'lucide-react'
import { 
  getGroupMembers, 
  promoteToAdmin, 
  demoteAdmin, 
  removeGroupMember,
  updateGroupDetails,
  deleteGroup,
  getGroupAdminInfo,
  isGroupAdmin,
  ClassGroupWithDetails,
  GroupMemberWithProfile,
  GroupAdminInfo
} from '../../services/classGroupService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Badge from '../ui/Badge'
import LoadingSpinner from '../ui/LoadingSpinner'

interface GroupAdminPanelProps {
  group: ClassGroupWithDetails
  isOpen: boolean
  onClose: () => void
  onGroupUpdated: () => void
}

const GroupAdminPanel: React.FC<GroupAdminPanelProps> = ({
  group,
  isOpen,
  onClose,
  onGroupUpdated
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [members, setMembers] = useState<GroupMemberWithProfile[]>([])
  const [adminInfo, setAdminInfo] = useState<GroupAdminInfo | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [isUserCreator, setIsUserCreator] = useState(false)
  const [editingGroup, setEditingGroup] = useState(false)
  const [groupName, setGroupName] = useState(group.name)
  const [groupDescription, setGroupDescription] = useState(group.description || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchData = useCallback(async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const [membersData, adminInfoData] = await Promise.all([
        getGroupMembers(group.id),
        getGroupAdminInfo(group.id)
      ])
      
      setMembers(membersData)
      setAdminInfo(adminInfoData)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [user, group.id])

  const checkAdminStatus = useCallback(async () => {
    if (!user) return
    
    try {
      const adminStatus = await isGroupAdmin(group.id, user.id)
      setIsUserAdmin(adminStatus)
    } catch (err) {
      console.error('Error checking admin status:', err)
    }
  }, [user, group.id])

  useEffect(() => {
    if (isOpen && user) {
      fetchData()
    }
  }, [isOpen, user, group.id, fetchData])

  useEffect(() => {
    if (user) {
      setIsUserCreator(group.created_by === user.id)
      checkAdminStatus()
    }
  }, [user, group.created_by, checkAdminStatus])

  const handlePromoteToAdmin = async (userId: string) => {
    if (!user) return
    
    try {
      setLoading(true)
      const result = await promoteToAdmin(group.id, userId, user.id)
      
      if (result.success) {
        setSuccess(result.message || 'Member promoted to admin')
        await fetchData()
      } else {
        setError(result.error || 'Failed to promote member')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoteAdmin = async (userId: string) => {
    if (!user) return
    
    try {
      setLoading(true)
      const result = await demoteAdmin(group.id, userId, user.id)
      
      if (result.success) {
        setSuccess(result.message || 'Admin demoted to member')
        await fetchData()
      } else {
        setError(result.error || 'Failed to demote admin')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!user) return
    
    if (!confirm(`Are you sure you want to remove ${userName} from the group?`)) {
      return
    }
    
    try {
      setLoading(true)
      const result = await removeGroupMember(group.id, userId, user.id)
      
      if (result.success) {
        setSuccess(result.message || 'Member removed successfully')
        await fetchData()
        onGroupUpdated()
      } else {
        setError(result.error || 'Failed to remove member')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateGroup = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const result = await updateGroupDetails(
        group.id,
        groupName !== group.name ? groupName : undefined,
        groupDescription !== group.description ? groupDescription : undefined,
        user.id
      )
      
      if (result.success) {
        setSuccess(result.message || 'Group updated successfully')
        setEditingGroup(false)
        onGroupUpdated()
      } else {
        setError(result.error || 'Failed to update group')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteGroup = async () => {
    if (!user) return
    
    const confirmMessage = `Are you sure you want to delete "${group.name}"? This action cannot be undone and will remove all members, messages, and files.`
    
    if (!confirm(confirmMessage)) {
      return
    }
    
    try {
      setLoading(true)
      const result = await deleteGroup(group.id, user.id)
      
      if (result.success) {
        setSuccess(result.message || 'Group deleted successfully')
        onGroupUpdated()
        onClose()
      } else {
        setError(result.error || 'Failed to delete group')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const clearMessages = () => {
    setError('')
    setSuccess('')
  }

  if (!isUserAdmin && !isUserCreator) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Access Denied" size="sm">
        <div className="text-center py-8">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Only group admins can access this panel.</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Administration" size="xl">
      <div className="space-y-6">
        {/* Status Messages */}
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center">
            <span>{error}</span>
            <button onClick={clearMessages}><X className="h-4 w-4" /></button>
          </div>
        )}
        
        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200 flex justify-between items-center">
            <span>{success}</span>
            <button onClick={clearMessages}><X className="h-4 w-4" /></button>
          </div>
        )}

        {/* Group Info */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <Crown className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Group Information</h3>
              <p className="text-sm text-blue-700">
                {adminInfo?.admin_count || 0} admins • {adminInfo?.total_members || 0} total members
              </p>
            </div>
          </div>
          
          {editingGroup ? (
            <div className="space-y-4">
              <Input
                label="Group Name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                premium
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="input-premium resize-none"
                  rows={3}
                  placeholder="Group description..."
                />
              </div>
              <div className="flex space-x-2">
                <Button onClick={handleUpdateGroup} loading={loading} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingGroup(false)
                    setGroupName(group.name)
                    setGroupDescription(group.description || '')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{group.name}</p>
                {group.description && (
                  <p className="text-sm text-gray-600">{group.description}</p>
                )}
              </div>
              <Button
                variant="outline"
                onClick={() => setEditingGroup(true)}
                className="flex items-center space-x-2"
              >
                <Edit3 className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            </div>
          )}
        </div>

        {/* Members List */}
        <div>
          <h3 className="font-medium text-gray-900 mb-4">Group Members</h3>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div>
                      <p className="font-medium">{member.profiles?.full_name}</p>
                      <p className="text-sm text-gray-600">@{member.profiles?.username}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant={member.role === 'admin' ? 'primary' : 'secondary'}>
                        {member.role === 'admin' ? (
                          <><Crown className="h-3 w-3 mr-1" /> Admin</>
                        ) : (
                          'Member'
                        )}
                      </Badge>
                      {member.user_id === group.created_by && (
                        <Badge variant="success">Creator</Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Action buttons */}
                  {member.user_id !== user?.id && (
                    <div className="flex space-x-2">
                      {member.role === 'member' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePromoteToAdmin(member.user_id)}
                          disabled={loading}
                          className="flex items-center space-x-1"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Promote</span>
                        </Button>
                      ) : member.user_id !== group.created_by && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDemoteAdmin(member.user_id)}
                          disabled={loading}
                          className="flex items-center space-x-1"
                        >
                          <ShieldOff className="h-3 w-3" />
                          <span>Demote</span>
                        </Button>
                      )}
                      
                      {member.user_id !== group.created_by && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMember(member.user_id, member.profiles?.full_name || 'User')}
                          disabled={loading}
                          className="flex items-center space-x-1 text-red-600 hover:bg-red-50"
                        >
                          <UserMinus className="h-3 w-3" />
                          <span>Remove</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Danger Zone - Only for Creator */}
        {isUserCreator && (
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <h3 className="font-medium text-red-900 mb-2">Danger Zone</h3>
            <p className="text-sm text-red-700 mb-4">
              These actions are permanent and cannot be undone.
            </p>
            <Button
              variant="outline"
              onClick={handleDeleteGroup}
              disabled={loading}
              className="flex items-center space-x-2 text-red-600 border-red-300 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Group</span>
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}

export default GroupAdminPanel
