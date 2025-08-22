import React, { useState } from 'react'
import { Plus, Users, Lock, Eye, EyeOff } from 'lucide-react'
import { createClassGroup } from '../../services/classGroupService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    year: 1,
    section: '',
    subject: '',
    isPasswordProtected: false,
    password: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return

    // Validate password if protection is enabled
    if (formData.isPasswordProtected) {
      if (!formData.password) {
        setError('Password is required for protected groups')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      if (formData.password.length < 4) {
        setError('Password must be at least 4 characters long')
        return
      }
    }

    setLoading(true)
    setError('')

    try {
      await createClassGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        year: formData.year,
        section: formData.section.trim().toUpperCase(),
        subject: formData.subject.trim() || undefined,
        created_by: user.id,
        password: formData.isPasswordProtected ? formData.password : undefined
      })

      // Reset form
      setFormData({
        name: '',
        description: '',
        year: 1,
        section: '',
        subject: '',
        isPasswordProtected: false,
        password: '',
        confirmPassword: ''
      })
      
      onSuccess()
    } catch (err: any) {
      if (err.code === '23505') {
        setError('A group with this year, section, and subject already exists')
      } else {
        setError(err.message || 'Failed to create group')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData(prev => ({ 
        ...prev, 
        [name]: target.checked
      }))
    } else {
      setFormData(prev => ({ 
        ...prev, 
        [name]: name === 'year' ? parseInt(value) : value 
      }))
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Class Group" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <Users className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">Create Your Class Group</h3>
            <p className="text-sm text-blue-700">
              Bring your classmates together for better collaboration
            </p>
          </div>
        </div>

        <Input
          name="name"
          label="Group Name *"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Computer Science 4th Year Section B"
          required
          disabled={loading}
          premium
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year *
            </label>
            <select
              name="year"
              value={formData.year}
              onChange={handleInputChange}
              required
              className="input-premium appearance-none cursor-pointer"
              disabled={loading}
            >
              {[1, 2, 3, 4, 5].map(year => (
                <option key={year} value={year}>Year {year}</option>
              ))}
            </select>
          </div>

          <Input
            name="section"
            label="Section *"
            value={formData.section}
            onChange={handleInputChange}
            placeholder="e.g., A, B, C"
            required
            disabled={loading}
            premium
          />
        </div>

        <Input
          name="subject"
          label="Subject (Optional)"
          value={formData.subject}
          onChange={handleInputChange}
          placeholder="e.g., Computer Science, Mathematics"
          disabled={loading}
          premium
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Brief description of the group purpose..."
            rows={3}
            className="input-premium resize-none"
            disabled={loading}
          />
        </div>

        {/* Password Protection Section */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center space-x-3 mb-3">
            <Lock className="h-5 w-5 text-gray-600" />
            <div>
              <h4 className="font-medium text-gray-900">Group Privacy</h4>
              <p className="text-sm text-gray-600">Control who can join your group</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isPasswordProtected"
              name="isPasswordProtected"
              checked={formData.isPasswordProtected}
              onChange={handleInputChange}
              disabled={loading}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="isPasswordProtected" className="text-sm font-medium text-gray-700">
              Password protect this group
            </label>
          </div>
          
          {formData.isPasswordProtected && (
            <div className="mt-4 space-y-4">
              <div className="relative">
                <Input
                  name="password"
                  label="Group Password *"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter password (min 4 characters)"
                  required={formData.isPasswordProtected}
                  disabled={loading}
                  premium
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              
              <Input
                name="confirmPassword"
                label="Confirm Password *"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm your password"
                required={formData.isPasswordProtected}
                disabled={loading}
                premium
              />
              
              <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded border">
                <p className="font-medium text-yellow-700 mb-1">🔒 Password Protected Group</p>
                <p>Only users with the correct password can join this group. Make sure to share the password securely with your classmates.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={loading || !formData.name.trim() || !formData.section.trim()}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Group</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default CreateGroupModal