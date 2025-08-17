import React, { useState } from 'react'
import { Plus, FolderPlus } from 'lucide-react'
import { createUserCategory, CategoryWithChildren } from '../../services/categoryService'
import { useAuth } from '../../contexts/AuthContext'
import Modal from './Modal'
import Button from './Button'
import Input from './Input'

interface AddCategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: CategoryWithChildren[]
}

const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  categories
}) => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    parentId: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || loading) return

    setLoading(true)
    setError('')

    try {
      await createUserCategory(
        formData.name.trim(),
        formData.description.trim() || undefined,
        formData.parentId || undefined
      )

      // Reset form
      setFormData({
        name: '',
        description: '',
        parentId: ''
      })
      
      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to create category')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const renderCategoryOptions = (cats: CategoryWithChildren[], depth = 0): React.ReactNode => {
    return cats.map(cat => (
      <React.Fragment key={cat.id}>
        <option value={cat.id}>
          {'  '.repeat(depth)}{cat.name}
        </option>
        {cat.children && renderCategoryOptions(cat.children, depth + 1)}
      </React.Fragment>
    ))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Category" size="md">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200">
            {error}
          </div>
        )}

        <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-lg">
          <FolderPlus className="h-8 w-8 text-blue-600" />
          <div>
            <h3 className="font-medium text-blue-900">Create Custom Category</h3>
            <p className="text-sm text-blue-700">
              Add a new category to help organize content better
            </p>
          </div>
        </div>

        <Input
          name="name"
          label="Category Name *"
          value={formData.name}
          onChange={handleInputChange}
          placeholder="e.g., Machine Learning, Web Development"
          required
          disabled={loading}
          premium
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Parent Category (Optional)
          </label>
          <select
            name="parentId"
            value={formData.parentId}
            onChange={handleInputChange}
            className="input-premium appearance-none cursor-pointer"
            disabled={loading}
          >
            <option value="">None (Top Level Category)</option>
            {renderCategoryOptions(categories)}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Select a parent category to create a subcategory
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Brief description of what this category contains..."
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
            disabled={loading || !formData.name.trim()}
            className="flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddCategoryModal