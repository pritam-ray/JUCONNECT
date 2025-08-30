import React, { useRef, useState } from 'react'
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { validateFile } from '../../services/fileUploadService'
import { cn } from '../../utils/cn'

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void
  onFileRemove: () => void
  selectedFile: File | null
  accept?: string
  maxSize?: number
  disabled?: boolean
  uploading?: boolean
  uploadProgress?: number
  className?: string
}

const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  onFileSelect,
  onFileRemove,
  selectedFile,
  accept = ".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif",
  disabled = false,
  uploading = false,
  uploadProgress = 0,
  className
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (file: File) => {
    setError(null)
    
    // Validate file
    const validation = validateFile(file)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }
    
    onFileSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    if (disabled || uploading) return
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !uploading) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string) => {
    // Extension could be used for different file type icons in the future
    fileName.split('.').pop()?.toLowerCase()
    return <FileText className="h-6 w-6 text-blue-600" />
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
          className={cn(
            "upload-zone",
            dragOver && "dragover",
            disabled && "opacity-50 cursor-not-allowed",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-base text-gray-600 mb-2">
            {dragOver ? 'Drop your file here' : 'Click to select a file or drag and drop'}
          </p>
          <p className="text-sm text-gray-500">
            Supported: PDF, Word documents, text files, images (Max 5MB)
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleInputChange}
            accept={accept}
            className="hidden"
            disabled={disabled || uploading}
          />
        </div>
      ) : (
        /* Selected File Display */
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              {getFileIcon(selectedFile.name)}
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
                
                {/* Upload Progress */}
                {uploading && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {!uploading && (
              <button
                type="button"
                onClick={onFileRemove}
                className="text-red-600 hover:text-red-700 p-1 ml-2"
                disabled={disabled}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {uploading && (
            <div className="mt-3 flex items-center text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Uploading your file...
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-200 flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Success State */}
      {selectedFile && !uploading && !error && (
        <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200 flex items-center space-x-2">
          <CheckCircle className="h-4 w-4" />
          <span>File ready for upload</span>
        </div>
      )}
    </div>
  )
}

export default FileUploadZone