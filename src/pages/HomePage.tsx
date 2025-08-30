import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Filter, BookOpen, FileText, Users, TrendingUp, Sparkles, Star, Zap, Shield } from 'lucide-react'
import { getApprovedContent, getContentStats, ContentWithCategory } from '../services/contentService'
import { getAllCategories, CategoryWithChildren } from '../services/categoryService'
import { isSupabaseConfigured } from '../lib/supabase'
import { appState } from '../utils/appState'
import { useAuth } from '../contexts/AuthContext'
import ContentCard from '../components/content/ContentCard'
import ContentViewer from '../components/content/ContentViewer'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import AuthModal from '../components/ui/AuthModal'
import DemoModeBanner from '../components/ui/DemoModeBanner'

const HomePage: React.FC = () => {
  const { user, isGuest } = useAuth()
  const [content, setContent] = useState<ContentWithCategory[]>([])
  const [categories, setCategories] = useState<CategoryWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('') // Separate state for input vs actual search
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedContentType, setSelectedContentType] = useState('')
  const [selectedContent, setSelectedContent] = useState<ContentWithCategory | null>(null)
  const [showViewer, setShowViewer] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [connectionError, setConnectionError] = useState(false)

  // Dynamically load all images from src/assets/hero
  const heroImages = React.useMemo(() => {
    try {
      const files = import.meta.glob('../assets/hero/*.{png,jpg,jpeg,webp,svg}', { 
        eager: true, 
        query: '?url', 
        import: 'default' 
      }) as Record<string, string>
      const images = Object.values(files)
      // Return at least the fallback if no images found
      return images.length > 0 ? images : []
    } catch (error) {
      console.warn('Failed to load hero images:', error)
      return []
    }
  }, [])

  // Slider state
  const [slide, setSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goto = (index: number) => setSlide((index + heroImages.length) % heroImages.length)

  const pauseTemporarily = () => {
    setIsPaused(true)
    if (resumeTimer.current) clearTimeout(resumeTimer.current)
    resumeTimer.current = setTimeout(() => setIsPaused(false), 8000) // resume after 8s
  }

  const next = () => {
    if (heroImages.length === 0) return
    goto(slide + 1)
    pauseTemporarily()
  }

  const prev = () => {
    if (heroImages.length === 0) return
    goto(slide - 1)
    pauseTemporarily()
  }

  useEffect(() => {
    if (heroImages.length === 0 || isPaused) return
    const id = setInterval(() => {
      setSlide(s => (s + 1) % heroImages.length)
    }, 4000) // auto-slide every 4s
    return () => clearInterval(id)
  }, [heroImages.length, isPaused])

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current)
    }
  }, [])

  const contentTypes = [
    { value: '', label: 'All Types', icon: '📚' },
    { value: 'question_paper', label: 'Question Papers', icon: '📝' },
    { value: 'notes', label: 'Study Notes', icon: '📖' },
    { value: 'syllabus', label: 'Syllabus', icon: '📋' },
    { value: 'assignments', label: 'Assignments', icon: '📄' },
    { value: 'other', label: 'Other', icon: '📄' },
  ]

  useEffect(() => {
    // Prevent duplicate component mounting
    if (!appState.markComponentMounted('HomePage')) {
      return
    }

    const fetchData = async () => {
      setConnectionError(false)
      
      if (!isSupabaseConfigured()) {
        console.log('Supabase not configured, showing demo content')
        setConnectionError(true)
        setLoading(false)
        return
      }

      try {
        const [contentData, categoriesData, statsData] = await Promise.all([
          getApprovedContent(),
          getAllCategories(),
          getContentStats()
        ])
        
        setContent(contentData)
        setCategories(categoriesData)
        setStats(statsData)
        setConnectionError(false) // Clear any previous error
      } catch (error) {
        console.error('Failed to fetch data:', error)
        setConnectionError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    // Cleanup on unmount
    return () => {
      appState.markComponentUnmounted('HomePage')
    }
  }, []) // Remove any dependencies to prevent re-runs

  useEffect(() => {
    const fetchFilteredContent = async () => {
      if (!isSupabaseConfigured()) return
      
      setLoading(true)
      try {
        const data = await getApprovedContent(
          selectedContentType as any,
          selectedCategory,
          searchQuery
        )
        setContent(data)
      } catch (error) {
        console.error('Failed to fetch filtered content:', error)
        setConnectionError(true)
      } finally {
        setLoading(false)
      }
    }

    // Only fetch when filters change and we're not showing all content
    if (searchQuery || selectedCategory || selectedContentType) {
      fetchFilteredContent()
    }
  }, [searchQuery, selectedCategory, selectedContentType])

  // Separate useEffect for resetting to all content
  useEffect(() => {
    const fetchAllContent = async () => {
      if (!isSupabaseConfigured()) return
      
      try {
        const data = await getApprovedContent()
        setContent(data)
      } catch (error) {
        console.error('Failed to fetch content:', error)
      }
    }

    // Only fetch all content when all filters are cleared
    if (!searchQuery && !selectedCategory && !selectedContentType) {
      fetchAllContent()
    }
  }, [searchQuery, selectedCategory, selectedContentType])

  const handleContentClick = (contentItem: ContentWithCategory) => {
    setSelectedContent(contentItem)
    setShowViewer(true)
  }

  const handleManualSearch = () => {
    if (searchInput.trim().length >= 2 || searchInput.trim().length === 0) {
      setSearchQuery(searchInput.trim())
    }
  }

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value)
    // Only auto-search if input is cleared (for immediate reset)
    if (value.trim() === '') {
      setSearchQuery('')
    }
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 via-white to-primary-50">
        <div className="text-center space-y-6">
          <LoadingSpinner size="xl" text="Loading content..." />
          <div className="flex items-center justify-center space-x-2 text-secondary-600">
            <Sparkles className="h-5 w-5 animate-bounce-subtle" />
            <span className="font-medium">Preparing your experience</span>
            <Sparkles className="h-5 w-5 animate-bounce-subtle" />
          </div>
        </div>
      </div>
    )
  }

  if (connectionError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center p-6">
          <div className="card-premium p-12">
            <div className="text-primary-500 mb-6">
              <Shield className="h-20 w-20 mx-auto animate-bounce-subtle" />
            </div>
            <h2 className="text-2xl font-bold text-secondary-900 mb-4 text-gradient">
              Connection Issue
            </h2>
            <p className="text-secondary-600 mb-6 leading-relaxed">
              We're having trouble connecting to our servers. This might be due to:
            </p>
            <ul className="text-left text-sm text-secondary-600 mb-8 space-y-2">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                <span>Network connectivity issues</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                <span>Server configuration problems</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary-500 rounded-full" />
                <span>Missing environment variables</span>
              </li>
            </ul>
            <Button
              onClick={() => window.location.reload()}
              variant="premium"
              size="lg"
              className="w-full"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50 mesh-bg">
      {/* Demo Mode Banner */}
      {!isSupabaseConfigured() && <DemoModeBanner />}
      
      {/* Hero Section */}
      <div
        className="hero-gradient text-white relative overflow-hidden min-h-[35vh] sm:min-h-[30vh] md:min-h-[28vh] lg:min-h-[25vh] flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Sliding Images Layer */}
        <div className="absolute inset-0 -z-0 overflow-hidden">
          {heroImages.length > 0 ? (
            <div
              className="flex h-full transition-transform duration-700 ease-out"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {heroImages.map((src, i) => (
                <div key={i} className="w-full h-full flex-shrink-0">
                  <img
                    src={src}
                    alt={`Hero ${i + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                </div>
              ))}
            </div>
          ) : (
            // Fallback if no images yet
            <div className="w-full h-full" />
          )}

          {/* Red tint + subtle vignette for readability */}
          <div className="absolute inset-0 bg-red-600/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/25 via-transparent to-black/25" />
        </div>

        {/* Decorative floating lights (optional, keep as before) */}
        <div className="absolute top-0 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-white/10 rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-white/5 rounded-full blur-3xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />

        {/* Overlay Content (text/buttons) */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8 w-full">
          <div className="text-center space-y-3 sm:space-y-4 md:space-y-5">
            <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent-400 animate-bounce-subtle" />
              <Badge variant="premium" size="lg" glow pulse>
                The JECRC App
              </Badge>
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-accent-400 animate-bounce-subtle" />
            </div>
            
            <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3 sm:mb-4 md:mb-5 animate-fade-in-up">
              <span className="block text-white text-shadow-lg">JU CONNECT</span>
              <span className="block text-xs sm:text-base md:text-lg lg:text-xl font-medium text-white/90 mt-1 sm:mt-2">
                Resource Hub
              </span>
            </h1>
            
            <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-4 sm:mb-5 md:mb-6 max-w-3xl mx-auto text-white/90 leading-relaxed animate-fade-in-up px-2 sm:px-4" style={{ animationDelay: '0.2s' }}>
              Access all the study materials, PYQ'S, Notes and many more. Connect with fellow students, 
              and elevate your academic journey with this platform
            </p>
            
            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 max-w-3xl mx-auto animate-fade-in-up px-2 sm:px-4" style={{ animationDelay: '0.4s' }}>
                {[
                  { label: 'Resources Available', value: stats.approved, icon: BookOpen },
                  { label: 'Question Papers', value: stats.byType.question_paper, icon: FileText },
                  { label: 'Study Notes', value: stats.byType.notes, icon: TrendingUp },
                  { label: 'Subject Areas', value: categories.length, icon: Users },
                ].map((stat) => (
                  <div key={stat.label} className="glass p-2 sm:p-3 md:p-4 rounded-lg sm:rounded-xl text-center group hover:scale-105 transition-all duration-300">
                    <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-accent-400 mx-auto mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-sm sm:text-lg md:text-xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-2xs sm:text-xs text-white/80 font-medium leading-tight">{stat.label}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-3 md:space-x-4 animate-fade-in-up px-2 sm:px-4" style={{ animationDelay: '0.6s' }}>
              <Button 
                size="lg"
                variant="secondary"
                className="bg-white/30 backdrop-blur-none border-white/30 text-white hover:bg-white/40 w-full sm:w-auto"
                onClick={() => document.getElementById('content-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Zap className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                Explore Content
              </Button>
              
              {(!user || isGuest) && (
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white/50 text-white hover:bg-white hover:text-primary-600 w-full sm:w-auto"
                  onClick={() => setShowAuthModal(true)}
                >
                  <Star className="mr-2 h-5 w-5" />
                  Join JU CONNECT
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Manual Controls */}
        {heroImages.length > 1 && (
          <>
            <button
              aria-label="Previous"
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-none"
            >
              ‹
            </button>
            <button
              aria-label="Next"
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-none"
            >
              ›
            </button>

            {/* Dots */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => { goto(i); pauseTemporarily() }}
                  className={`h-0.5 w-0.5 sm:h-1 sm:w-1 rounded-full transition-all duration-300 ${
                    slide === i 
                      ? 'bg-red-500 scale-125 sm:scale-150' 
                      : 'bg-white/60 hover:bg-white/90 hover:scale-110'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-12" id="content-section">
        <div className="card-premium p-4 sm:p-6 md:p-8 mb-8 sm:mb-12 animate-fade-in-up">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-xl sm:text-2xl font-bold text-secondary-900 mb-2 text-gradient">
              Find Your Perfect Study Material
            </h2>
            <p className="text-sm sm:text-base text-secondary-600">
              Use our advanced filters to discover exactly what you need
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
            <div className="lg:col-span-2 order-1">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative group flex-1">
                  <Search className="absolute left-3 sm:left-4 top-3 sm:top-4 h-4 w-4 sm:h-5 sm:w-5 text-secondary-400 group-focus-within:text-primary-500 transition-colors duration-300" />
                  <input
                    type="text"
                    placeholder="Search resources, notes, question papers..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="input-premium pl-10 sm:pl-12 pr-3 sm:pr-4 text-base sm:text-lg w-full h-12 sm:h-14"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSearch()
                        e.currentTarget.blur()
                      }
                    }}
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary-500/10 to-primary-600/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
                <Button
                  onClick={handleManualSearch}
                  variant="premium"
                  size="lg"
                  className="px-4 sm:px-6 flex items-center justify-center gap-2 h-12 sm:h-14 w-full sm:w-auto"
                  disabled={searchInput.trim().length > 0 && searchInput.trim().length < 2}
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Search</span>
                </Button>
              </div>
              {/* Search help text */}
              <div className="mt-2">
                <p className="text-xs text-secondary-500">
                  💡 Type your search terms and click the Search button or press Enter
                </p>
              </div>
            </div>
            
            <div className="order-3 lg:order-2">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input-premium appearance-none cursor-pointer"
                >
                  <option value="">📚 All Categories</option>
                  {renderCategoryOptions(categories)}
                </select>
                <Filter className="absolute right-4 top-4 h-5 w-5 text-secondary-400 pointer-events-none" />
              </div>
            </div>
            
            <div className="order-3">
              <div className="relative">
                <select
                  value={selectedContentType}
                  onChange={(e) => setSelectedContentType(e.target.value)}
                  className="input-premium appearance-none cursor-pointer"
                >
                  {contentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-4 top-4 h-5 w-5 text-secondary-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(searchQuery || selectedCategory || selectedContentType) && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-secondary-600">Active filters:</span>
              
              {searchQuery && (
                <Badge variant="premium" className="flex items-center gap-2">
                  <Search className="h-3 w-3" />
                  "{searchQuery}"
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setSearchInput('')
                    }}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="Remove search filter"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              
              {selectedCategory && (
                <Badge variant="premium" className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  {categories.find(c => c.id === selectedCategory)?.name}
                  <button
                    onClick={() => setSelectedCategory('')}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="Remove category filter"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              
              {selectedContentType && (
                <Badge variant="premium" className="flex items-center gap-2">
                  {contentTypes.find(t => t.value === selectedContentType)?.icon}
                  {contentTypes.find(t => t.value === selectedContentType)?.label}
                  <button
                    onClick={() => setSelectedContentType('')}
                    className="ml-1 hover:text-red-500 transition-colors"
                    title="Remove type filter"
                  >
                    ✕
                  </button>
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('')
                  setSearchInput('')
                  setSelectedCategory('')
                  setSelectedContentType('')
                }}
                className="text-secondary-500 hover:text-primary-600"
              >
                Clear all filters
              </Button>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold text-secondary-900 text-gradient">
              {searchQuery || selectedCategory || selectedContentType ? 'Filtered Results' : 'All Resources'}
            </h2>
            <p className="text-secondary-600">
              {content.length} {content.length === 1 ? 'resource' : 'resources'} found
              {(searchQuery || selectedCategory || selectedContentType) && (
                <span className="text-primary-600 font-medium"> matching your criteria</span>
              )}
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge variant="premium" glow>
              <Sparkles className="w-3 h-3 mr-1" />
              Enjoy
            </Badge>
          </div>
        </div>

        {content.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <div className="card-premium p-12 max-w-md mx-auto">
              <BookOpen className="h-20 w-20 text-secondary-300 mx-auto mb-6 animate-bounce-subtle" />
              {searchQuery || selectedCategory || selectedContentType ? (
                <>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-4">No matching resources found</h3>
                  <p className="text-secondary-600 mb-6">
                    No resources match your current search criteria. Try:
                  </p>
                  <ul className="text-sm text-secondary-600 mb-6 text-left space-y-2">
                    <li>• Using different keywords</li>
                    <li>• Checking your spelling</li>
                    <li>• Selecting a different category</li>
                    <li>• Browsing all content types</li>
                  </ul>
                </>
              ) : (
                <>
                  <h3 className="text-xl font-semibold text-secondary-900 mb-4">No resources available</h3>
                  <p className="text-secondary-600 mb-6">
                    There are currently no approved resources in the database.
                  </p>
                </>
              )}
              <Button 
                variant="premium" 
                onClick={() => {
                  setSearchQuery('')
                  setSearchInput('')
                  setSelectedCategory('')
                  setSelectedContentType('')
                }}
              >
                {searchQuery || selectedCategory || selectedContentType ? 'Clear Filters' : 'Refresh'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 animate-fade-in-up">
            {content.map((item, index) => (
              <div 
                key={item.id} 
                className="animate-fade-in-up w-full"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ContentCard
                  content={item}
                  onClick={() => handleContentClick(item)}
                  showUploader={true}
                />
              </div>
            ))}
          </div>
        )}

        {/* Quick Access Categories */}
        <div className="mt-8 sm:mt-12 lg:mt-16 xl:mt-20">
          <div className="text-center mb-6 sm:mb-8 lg:mb-12">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary-900 mb-2 sm:mb-4 text-gradient">
              Browse by Subject
            </h3>
            <p className="text-secondary-600 text-sm sm:text-base lg:text-lg px-4">
              Explore our carefully organized subject categories
            </p>
          </div>
          
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-6">
            {categories.slice(0, 8).map((category, index) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="card-premium p-3 sm:p-4 lg:p-6 text-left group hover:scale-105 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="font-semibold text-xs sm:text-sm lg:text-base text-secondary-900 group-hover:text-primary-600 transition-colors duration-300 line-clamp-2">
                      {category.name}
                    </div>
                    {category.description && (
                      <div className="text-xs text-secondary-500 mt-1 line-clamp-1 hidden sm:block">
                        {category.description}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Hover effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </button>
            ))}
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

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </div>
    </div>
  )
}

export default HomePage