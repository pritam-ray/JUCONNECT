import React, { useState, useRef } from 'react'
import { Upload, X, FileText, AlertCircle, Shield } from 'lucide-react'
import { uploadFile, AllowedFileType } from '../../services/fileUploadService'
import { getAllCategories, CategoryWithChildren } from '../../services/categoryService'
import { createContent } from '../../services/contentService'
import { validateFileName, validateFileContent } from '../../services/securityService'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../ui/Button'
import Input from '../ui/Input'

interface FileUploadFormProps {
  onSuccess?: () => void
}

const FileUploadForm: React.FC<FileUploadFormProps> = ({ onSuccess }) => {
  const { user } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'notes' as 'question_paper' | 'notes' | 'syllabus' | 'other',
    categoryId: '',
    year: '',
    semester: '',
    tags: '',
  })

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getAllCategories()
        setCategories(data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      }
    }
    fetchCategories()
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file name
    const nameValidation = validateFileName(file.name)
    if (!nameValidation.isValid) {
      setError(nameValidation.error || 'Invalid file name')
      return
    }

    // Validate file content asynchronously
    validateFileContent(file).then(contentValidation => {
      if (!contentValidation.isValid) {
        setError(contentValidation.error || 'Invalid file content')
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
        return
      }
    })

    setSelectedFile(file)
    setError('')
    
    // Auto-fill title if empty
    if (!formData.title) {
      const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.')
      setFormData(prev => ({ ...prev, title: nameWithoutExtension }))
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedFile) return

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Upload file
      if (!selectedFile) {
        throw new Error('No file selected')
      }

      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      // Prepare metadata for security validation
      const metadata = {
        title: formData.title,
        description: formData.description,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        year: formData.year,
        semester: formData.semester
      }

      const { fileUrl } = await uploadFile(selectedFile, user.id, 'content', metadata)
      
      // Create content record
      await createContent({
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        content_type: formData.contentType,
        category_id: formData.categoryId || null,
        uploaded_by: user.id,
        file_url: fileUrl,
        file_size: selectedFile.size,
        file_type: selectedFile.name.split('.').pop()?.toLowerCase() as AllowedFileType,
        year: formData.year ? parseInt(formData.year) : null,
        semester: formData.semester ? parseInt(formData.semester) : null,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      })

      setSuccess('Content uploaded successfully and is now available to everyone!')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        contentType: 'notes',
        categoryId: '',
        year: '',
        semester: '',
        tags: '',
      })
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      onSuccess?.()
    } catch (err: any) {
      let errorMessage = err.message || 'Upload failed'
      
      // Provide user-friendly error messages
      if (errorMessage.includes('Failed to upload file')) {
        errorMessage = 'File upload failed. Please check your internet connection and try again.'
      }
      
      // Handle RLS policy errors
      if (errorMessage.includes('row-level security policy') || errorMessage.includes('Unauthorized') || errorMessage.includes('permissions are not configured')) {
        errorMessage = 'File uploads are not yet enabled. Please contact the administrator to configure upload permissions.'
      }
      
      // Handle specific storage configuration errors
      if (errorMessage.includes('storage is not configured') || errorMessage.includes('Bucket not found')) {
        errorMessage = 'File uploads are temporarily unavailable. The storage system needs to be configured by the administrator.'
      }
      
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const renderCategoryOptions = (cats: CategoryWithChildren[], depth = 0) => {
    return cats.flatMap(cat => [
      <option key={cat.id} value={cat.id}>
        {'  '.repeat(depth)}{cat.name}
      </option>,
      ...(cat.children ? renderCategoryOptions(cat.children, depth + 1) : [])
    ])
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-0">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Upload Content</h2>
          <p className="text-gray-600">
            Share your study materials with the community. All uploads are reviewed before publishing.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
              {success}
            </div>
          )}

          {/* Security Notice */}
          <div className="p-3 text-sm text-blue-600 bg-blue-50 rounded-lg border border-blue-200 flex items-start space-x-2">
            <Shield className="h-4 w-4 mt-0.5" />
            <div>
              <p className="font-medium">Security Notice</p>
              <p className="text-xs mt-1">
                All files are automatically scanned for security threats and validated before upload. 
                Your content will be available immediately after passing security checks.
              </p>
            </div>
          </div>
          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select File *
            </label>
            
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-6 md:p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
              >
                <Upload className="h-10 w-10 md:h-12 md:w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">Click to select a file or drag and drop</p>
                <p className="text-xs md:text-sm text-gray-500">
                  Supported: PDF, DOC, DOCX, TXT, JPG, PNG
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-3 md:p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 text-sm md:text-base truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.txt,.jpg,.png"
              className="hidden"
            />
          </div>

          {/* Title */}
          <Input
            name="title"
            label="Title *"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a descriptive title"
            required
            disabled={loading}
          />

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the content (optional)"
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Type *
            </label>
            <select
              name="contentType"
              value={formData.contentType}
              onChange={handleInputChange}
              required
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="notes">Study Notes</option>
              <option value="question_paper">Question Paper</option>
              <option value="syllabus">Syllabus</option>
              <option value="assignments">Assignments</option>
              <option value="other">Other</option>
              
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="">Select a category (optional)</option>
              {renderCategoryOptions(categories)}
            </select>
          </div>

          {/* Year and Semester */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              name="year"
              label="Academic Year"
              type="number"
              value={formData.year}
              onChange={handleInputChange}
              placeholder="e.g., 2024"
              min="2000"
              max="2030"
              disabled={loading}
              helpText="Optional"
            />
            
            <Input
              name="semester"
              label="Semester"
              type="number"
              value={formData.semester}
              onChange={handleInputChange}
              placeholder="e.g., 1"
              min="1"
              max="8"
              disabled={loading}
              helpText="Optional"
            />
          </div>

          {/* Tags */}
          <Input
            name="tags"
            label="Tags"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="algorithms, programming, data structures"
            helpText="Comma-separated tags"
            disabled={loading}
          />

          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
            <Button
              type="submit"
              className="w-full sm:w-auto"
              loading={loading}
              disabled={loading || !selectedFile || !formData.title.trim()}
            >
              Upload Content
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default FileUploadForm