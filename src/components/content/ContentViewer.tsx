import React, { useEffect, useState } from 'react'
import { Download, Eye, Calendar, User, Tag, ExternalLink } from 'lucide-react'
import { ContentWithCategory, incrementViewCount } from '../../services/contentService'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import { formatDistanceToNow } from 'date-fns'

interface ContentViewerProps {
  content: ContentWithCategory | null
  isOpen: boolean
  onClose: () => void
}

const ContentViewer: React.FC<ContentViewerProps> = ({ content, isOpen, onClose }) => {
  const [viewIncremented, setViewIncremented] = useState(false)

  useEffect(() => {
    if (content && isOpen && !viewIncremented) {
      incrementViewCount(content.id).catch(console.error)
      setViewIncremented(true)
    }
  }, [content, isOpen, viewIncremented])

  useEffect(() => {
    if (!isOpen) {
      setViewIncremented(false)
    }
  }, [isOpen])

  if (!content) return null

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case 'question_paper':
        return 'Question Paper'
      case 'notes':
        return 'Notes'
      case 'syllabus':
        return 'Syllabus'
      case 'assignments':
        return 'Assignments'
      case 'other':
        return 'Other'
      default:
        return type
    }
  }

  const getContentTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'question_paper':
        return 'primary'
      case 'notes':
        return 'secondary'
      case 'syllabus':
        return 'warning'
      case 'assignments':
        return 'success'
      case 'other':
        return 'neutral'
      default:
        return 'neutral'
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleDownload = () => {
    if (content.file_url) {
      window.open(content.file_url, '_blank')
    }
  }

  const handleExternalLink = () => {
    if (content.external_url) {
      window.open(content.external_url, '_blank')
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start justify-between space-y-4 md:space-y-0">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge variant={getContentTypeBadgeVariant(content.content_type) as any}>
                {getContentTypeLabel(content.content_type)}
              </Badge>
              {content.categories && (
                <Badge variant="neutral">
                  {content.categories.name}
                </Badge>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {content.title}
            </h1>
            {content.description && (
              <p className="text-sm md:text-base text-gray-600">
                {content.description}
              </p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 p-3 md:p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
            <Calendar className="h-4 w-4" />
            <span className="truncate">{formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600">
            <Eye className="h-4 w-4" />
            <span>{content.view_count} views</span>
          </div>
          
          {content.profiles && (
            <div className="flex items-center space-x-2 text-xs md:text-sm text-gray-600 col-span-2 lg:col-span-1">
              <User className="h-4 w-4" />
              <span className="truncate">@{content.profiles.username}</span>
            </div>
          )}
          
          {content.file_size && (
            <div className="text-xs md:text-sm text-gray-600">
              Size: {formatFileSize(content.file_size)}
            </div>
          )}
        </div>

        {/* Academic Details */}
        {(content.year || content.semester) && (
          <div className="flex items-center space-x-4">
            {content.year && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Year:</span>
                <Badge variant="neutral">{content.year}</Badge>
              </div>
            )}
            {content.semester && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Semester:</span>
                <Badge variant="neutral">{content.semester}</Badge>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {content.tags && content.tags.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Tags:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {content.tags.map((tag, index) => (
                <span 
                  key={index} 
                  className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
          <div className="text-xs md:text-sm text-gray-500">
            Content ID: {content.id.split('-')[0]}...
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            {content.external_url && (
              <Button
                onClick={handleExternalLink}
                variant="outline"
                size="sm"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Open Link</span>
              </Button>
            )}
            
            {content.file_url && (
              <Button
                onClick={handleDownload}
                size="sm"
                className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            )}
          </div>
        </div>

        {/* File Preview for images */}
        {content.file_url && content.file_type && ['jpg', 'png'].includes(content.file_type) && (
          <div className="border rounded-lg overflow-hidden mt-4">
            <img 
              src={content.file_url} 
              alt={content.title}
              className="w-full h-auto max-h-64 md:max-h-96 object-contain"
            />
          </div>
        )}
      </div>
    </Modal>
  )
}

export default ContentViewer