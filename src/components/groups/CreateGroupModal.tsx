import React, { useState } from 'react'
import { Plus, Users } from 'lucide-react'
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
    subject: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError('')

    try {
      await createClassGroup({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        year: formData.year,
        section: formData.section.trim().toUpperCase(),
        subject: formData.subject.trim() || undefined,
        created_by: user.id
      })

      // Reset form
      setFormData({
        name: '',
        description: '',
        year: 1,
        section: '',
        subject: ''
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
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'year' ? parseInt(value) : value 
    }))
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
              {[1, 2, 3, 4, 5, 6].map(year => (
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