import React, { useState, useEffect } from 'react'
import { FileText, ChevronRight, Book } from 'lucide-react'
import { getAllCategories, getCategoriesWithContentCount, CategoryWithChildren } from '../services/categoryService'
import { getApprovedContent, ContentWithCategory } from '../services/contentService'
import ContentCard from '../components/content/ContentCard'
import ContentViewer from '../components/content/ContentViewer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Badge from '../components/ui/Badge'

const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithChildren | null>(null)
  const [categoryContent, setCategoryContent] = useState<ContentWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [selectedContent, setSelectedContent] = useState<ContentWithCategory | null>(null)
  const [showViewer, setShowViewer] = useState(false)

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
      <div key={category.id} className={`${depth > 0 ? 'ml-6' : ''}`}>
        <div
          className={`p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer ${
            selectedCategory?.id === category.id ? 'ring-2 ring-blue-500 border-blue-500' : ''
          }`}
          onClick={() => handleCategoryClick(category)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                {category.description && (
                  <p className="text-sm text-gray-500 mt-1">{category.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {category.content_count !== undefined && (
                <Badge variant="neutral">
                  {category.content_count} items
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-gray-400" />
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
    <div className="min-h-screen bg-gray-50 pb-4 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-12">
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Browse by Categories</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our organized collection of study materials, question papers, and resources 
            categorized by subject areas
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1 order-2 lg:order-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Subject Areas</h2>
              <div className="space-y-3 max-h-64 lg:max-h-96 overflow-y-auto">
                {categories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No categories available</p>
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
                <div className="mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                    {selectedCategory.name}
                  </h2>
                  {selectedCategory.description && (
                    <p className="text-gray-600">{selectedCategory.description}</p>
                  )}
                </div>

                {contentLoading ? (
                  <div className="flex justify-center py-12">
                    <LoadingSpinner />
                  </div>
                ) : categoryContent.length === 0 ? (
                  <div className="text-center py-12">
                    <Book className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No content available
                    </h3>
                    <p className="text-gray-600">
                      There are no resources in this category yet
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Category
                </h3>
                <p className="text-gray-600">
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
      </div>
    </div>
  )
}

export default CategoriesPage