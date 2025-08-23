import { Plus } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { FileText, ChevronRight, Book } from 'lucide-react'
import { getCategoriesWithContentCount, CategoryWithChildren } from '../services/categoryService'
import { getApprovedContent, ContentWithCategory } from '../services/contentService'
import { useAuth } from '../contexts/AuthContext'
import ContentCard from '../components/content/ContentCard'
import ContentViewer from '../components/content/ContentViewer'
import AddCategoryModal from '../components/ui/AddCategoryModal'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'

const CategoriesPage: React.FC = () => {
  const { user, isGuest } = useAuth()
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithChildren | null>(null)
  const [categoryContent, setCategoryContent] = useState<ContentWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentWithCategory | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategoriesWithContentCount()
        setCategories(data)
      } catch (error) {
        console.error('Failed to fetch categories:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  const handleCategoryAdded = async () => {
    try {
      const data = await getCategoriesWithContentCount()
      setCategories(data)
    } catch (error) {
      console.error('Failed to refresh categories:', error)
    }
  }

  const handleCategoryClick = async (category: CategoryWithChildren) => {
    setSelectedCategory(category)
    setContentLoading(true)
    
    try {
      const content = await getApprovedContent(undefined, category.id)
      setCategoryContent(content)
    } catch (error) {
      console.error('Failed to fetch category content:', error)
    } finally {
      setContentLoading(false)
    }
  }

  const handleContentClick = (content: ContentWithCategory) => {
    setSelectedContent(content)
    setShowViewer(true)
  }

  const renderCategory = (category: CategoryWithChildren, depth = 0) => {
    return (
      <div key={category.id} className={`${depth > 0 ? 'ml-3 sm:ml-6' : ''}`}>
        <div
          className={`p-3 sm:p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${
            selectedCategory?.id === category.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-gray-900 text-sm sm:text-base truncate">{category.name}</h3>
                {category.description && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0 ml-2">
              {category.content_count !== undefined && (
                <Badge variant="neutral" size="sm">
                  <span className="hidden sm:inline">{category.content_count} items</span>
                  <span className="sm:hidden">{category.content_count}</span>
                </Badge>
              )}
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
            </div>
          </div>
        </div>
        
        {/* Render subcategories */}
        {category.children && category.children.length > 0 && (
          <div className="mt-2 space-y-2">
            {category.children.map(child => renderCategory(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20 sm:pb-4 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-12">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 sm:mb-6 lg:mb-8 space-y-4 lg:space-y-0">
          <div className="text-center lg:text-left w-full lg:w-auto">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">Browse by Categories</h1>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl px-4 sm:px-0">
              Explore our organized collection of study materials, question papers, and resources 
              categorized by subject areas
            </p>
          </div>
          
          {user && !isGuest && (
            <Button
              onClick={() => setShowAddCategoryModal(true)}
              className="flex items-center justify-center space-x-2 w-full sm:w-auto"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 lg:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Subject Areas</h2>
              <div className="space-y-2 sm:space-y-3 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4 text-sm">No categories available</p>
                ) : (
                  categories.map(category => renderCategory(category))
                )}
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            {selectedCategory ? (
              <div>
                <div className="mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                    {selectedCategory.name}
                  </h2>
                  {selectedCategory.description && (
                    <p className="text-sm sm:text-base text-gray-600">{selectedCategory.description}</p>
                  )}
                </div>

                {contentLoading ? (
                  <div className="flex justify-center py-8 sm:py-12">
                    <LoadingSpinner />
                  </div>
                ) : categoryContent.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Book className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                      No content available
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 px-4">
                      There are no resources in this category yet
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {categoryContent.map((content) => (
                      <ContentCard
                        key={content.id}
                        content={content}
                        onClick={() => handleContentClick(content)}
                        showUploader={true}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                <FileText className="h-12 w-12 sm:h-16 sm:w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
                  Select a Category
                </h3>
                <p className="text-sm sm:text-base text-gray-600 px-4">
                  Choose a subject area from the left to explore available resources
                </p>
              </div>
            )}
          </div>
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
        
        {/* Add Category Modal */}
        <AddCategoryModal
          isOpen={showAddCategoryModal}
          onClose={() => setShowAddCategoryModal(false)}
          onSuccess={handleCategoryAdded}
          categories={categories}
        />
      </div>
    </div>
  )
}

export default CategoriesPage