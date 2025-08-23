import React from 'react'
import { FileText, Download, Eye, Calendar, User, Tag, Flag, Sparkles } from 'lucide-react'
import { ContentWithCategory } from '../../services/contentService'
import { reportContent } from '../../services/reportingService'
import { useAuth } from '../../contexts/AuthContext'
import Badge from '../ui/Badge'
import { formatDistanceToNow } from 'date-fns'

interface ContentCardProps {
  content: ContentWithCategory
  onClick?: () => void
  showUploader?: boolean
  showReportButton?: boolean
}

const ContentCard: React.FC<ContentCardProps> = ({ 
  content, 
  onClick,
  showUploader = false,
  showReportButton = true
}) => {
  const { user, isGuest } = useAuth()

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case 'question_paper':
        return <FileText className="h-5 w-5" />
      case 'notes':
        return <FileText className="h-5 w-5" />
      case 'syllabus':
        return <FileText className="h-5 w-5" />
      default:
        return <FileText className="h-5 w-5" />
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

  const handleReport = async (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    
    if (!user || isGuest) {
      alert('Please sign in to report content')
      return
    }
    
    const reason = prompt('Please specify the reason for reporting this content:')
    if (!reason) return
    
    const description = prompt('Additional details (optional):')
    
    try {
      await reportContent(content.id, user.id, reason.trim(), description?.trim())
      alert('Content reported successfully. Our moderators will review it.')
    } catch (error: any) {
      alert(error.message || 'Failed to report content')
    }
  }
  return (
    <div className="card-premium p-4 md:p-6 cursor-pointer group relative overflow-hidden" onClick={onClick}>
      {/* Premium indicator */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <Sparkles className="h-4 w-4 text-accent-500 animate-bounce-subtle" />
      </div>
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4 md:mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            {getContentTypeIcon(content.content_type)}
          </div>
          <Badge variant={getContentTypeBadgeVariant(content.content_type) as any} glow>
            {getContentTypeLabel(content.content_type)}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2 md:space-x-3 text-sm text-secondary-500">
          {showReportButton && (
            <button
              onClick={handleReport}
              className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-1 md:p-2 hover:text-red-600 hover:bg-red-50 rounded-lg hover:scale-110"
              title="Report content"
            >
              <Flag className="h-3 w-3 md:h-4 md:w-4" />
            </button>
          )}
          
          {content.view_count > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-secondary-100 rounded-lg text-xs">
              <Eye className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">{content.view_count}</span>
            </div>
          )}
        </div>
      </div>

      {/* Title and Description */}
      <div className="mb-4 md:mb-6">
        <h3 className="font-bold text-secondary-900 text-lg md:text-xl mb-2 md:mb-3 group-hover:text-primary-600 transition-colors duration-300 line-clamp-2">
          {content.title}
        </h3>
        {content.description && (
          <p className="text-secondary-600 text-xs md:text-sm line-clamp-2 md:line-clamp-3 leading-relaxed">
            {content.description}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
        {content.categories && (
          <Badge variant="neutral" size="sm">
            {content.categories.name}
          </Badge>
        )}
        
        {content.year && (
          <Badge variant="neutral" size="sm">
            Year: {content.year}
          </Badge>
        )}
        
        {content.semester && (
          <Badge variant="neutral" size="sm">
            Sem: {content.semester}
          </Badge>
        )}
      </div>

      {/* Tags */}
      {content.tags && content.tags.length > 0 && (
        <div className="mb-4 md:mb-6">
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            <Tag className="h-3 w-3 text-secondary-400 hidden sm:block" />
            {content.tags.slice(0, 2).map((tag, index) => (
              <span key={index} className="text-xs text-secondary-600 bg-secondary-100 px-2 py-1 rounded-full font-medium truncate max-w-20 sm:max-w-none">
                {tag}
              </span>
            ))}
            {content.tags.length > 2 && (
              <span className="text-xs text-gray-400">
                +{content.tags.length - 2} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-sm text-secondary-500 pt-4 md:pt-6 border-t border-secondary-100 space-y-2 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <div className="flex items-center space-x-2 text-xs md:text-sm">
            <Calendar className="h-3 w-3 md:h-4 md:w-4" />
            <span className="font-medium truncate">{formatDistanceToNow(new Date(content.created_at), { addSuffix: true })}</span>
          </div>
          
          {showUploader && content.profiles && (
            <div className="flex items-center space-x-2 px-2 py-1 bg-secondary-100 rounded-lg text-xs">
              <User className="h-3 w-3 md:h-4 md:w-4" />
              <span className="font-medium truncate max-w-24 sm:max-w-none">@{content.profiles.username}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2 md:space-x-3 self-end sm:self-auto">
          {content.file_size && (
            <span className="text-xs bg-secondary-100 px-2 py-1 rounded-full font-medium whitespace-nowrap">
              {formatFileSize(content.file_size)}
            </span>
          )}
          
          {content.file_url && (
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110">
              <Download className="h-4 w-4" />
            </div>
          )}
        </div>
      
      {/* Premium glow effect */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/5 via-transparent to-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </div>
  )
}

export default ContentCard