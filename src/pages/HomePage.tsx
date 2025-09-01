import React, { useState, useEffect, useRef } from 'react'
import { Search, Filter, BookOpen, FileText, Users, TrendingUp, Sparkles, Star, Zap, Shield, ArrowRight, Download, Eye, Clock, Globe } from 'lucide-react'
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
    { value: '', label: 'All Types', icon: '📚', color: 'from-blue-500 to-blue-600' },
    { value: 'question_paper', label: 'Question Papers', icon: '📝', color: 'from-green-500 to-green-600' },
    { value: 'notes', label: 'Study Notes', icon: '📖', color: 'from-purple-500 to-purple-600' },
    { value: 'syllabus', label: 'Syllabus', icon: '📋', color: 'from-yellow-500 to-yellow-600' },
    { value: 'assignments', label: 'Assignments', icon: '📄', color: 'from-pink-500 to-pink-600' },
    { value: 'other', label: 'Other', icon: '📄', color: 'from-gray-500 to-gray-600' },
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
    <div className="min-h-screen mesh-bg">
      {/* Demo Mode Banner */}
      {!isSupabaseConfigured() && <DemoModeBanner />}
      
      {/* Premium Hero Section */}
      <div
        className="hero-gradient text-white relative overflow-hidden min-h-[60vh] sm:min-h-[55vh] md:min-h-[50vh] lg:min-h-[45vh] flex items-center"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Sliding Images Layer */}
        <div className="absolute inset-0 -z-0 overflow-hidden">
          {heroImages.length > 0 ? (
            <div
              className="flex h-full transition-transform duration-1000 ease-out"
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
            <div className="w-full h-full bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800" />
          )}

          {/* Enhanced overlay with premium effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-900/60 via-primary-800/70 to-primary-900/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30" />
        </div>

        {/* Premium floating elements */}
        <div className="absolute top-1/4 left-1/4 w-32 sm:w-48 md:w-64 h-32 sm:h-48 md:h-64 bg-gradient-to-br from-white/20 to-transparent rounded-full blur-3xl animate-float pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-24 sm:w-36 md:w-48 h-24 sm:h-36 md:h-48 bg-gradient-to-br from-accent-500/30 to-transparent rounded-full blur-2xl animate-float pointer-events-none" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[32rem] md:w-[40rem] h-96 sm:h-[32rem] md:h-[40rem] bg-gradient-to-r from-primary-500/10 via-accent-500/10 to-primary-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />

        {/* Enhanced Overlay Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12 md:py-16 w-full">
          <div className="text-center space-y-6 sm:space-y-8 md:space-y-10">
            <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-4 sm:mb-6">
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-accent-400 animate-bounce-subtle" />
              <div className="glass-card px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-white/40">
                <span className="text-sm sm:text-base font-semibold text-white drop-shadow-lg">
                  🎓 The Premium JECRC Hub
                </span>
              </div>
              <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-accent-400 animate-bounce-subtle" />
            </div>
            
            <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
              <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white text-shadow-lg">
                <span className="block bg-gradient-to-r from-white via-white to-accent-200 bg-clip-text text-transparent">
                  JU CONNECT
                </span>
                <span className="block text-lg sm:text-2xl md:text-3xl lg:text-4xl font-medium text-white/90 mt-2 sm:mt-4">
                  Premium Education Hub
                </span>
              </h1>
              
              <p className="text-sm sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 md:mb-10 max-w-4xl mx-auto text-white/90 leading-relaxed animate-fade-in-up font-medium drop-shadow-sm" style={{ animationDelay: '0.2s' }}>
                Access premium study materials, question papers, notes, and connect with fellow students. 
                <span className="block mt-2 text-accent-200">Elevate your academic journey with our cutting-edge platform.</span>
              </p>
            </div>
            
            {/* Premium Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <Button 
                size="lg" 
                variant="premium" 
                className="group shadow-2xl hover:shadow-accent-500/30 px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg"
                onClick={() => !user || isGuest ? setShowAuthModal(true) : null}
              >
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                Explore Resources
                <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 ml-3 group-hover:translate-x-1 transition-transform duration-300" />
              </Button>
              
              <Button 
                size="lg" 
                variant="secondary" 
                className="group glass-card border-white/40 text-white hover:bg-white/20 px-8 sm:px-12 py-4 sm:py-5 text-base sm:text-lg backdrop-blur-xl"
                onClick={() => document.getElementById('stats-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 mr-3" />
                View Statistics
              </Button>
            </div>
            
            {/* Enhanced Stats Grid */}
            {stats && (
              <div 
                id="stats-section"
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 max-w-5xl mx-auto animate-fade-in-up" 
                style={{ animationDelay: '0.6s' }}
              >
                {[
                  { label: 'Total Resources', value: stats.approved, icon: BookOpen, color: 'from-blue-500 to-blue-600' },
                  { label: 'Question Papers', value: stats.byType.question_paper, icon: FileText, color: 'from-green-500 to-green-600' },
                  { label: 'Study Notes', value: stats.byType.notes, icon: TrendingUp, color: 'from-purple-500 to-purple-600' },
                  { label: 'Active Categories', value: categories.length, icon: Users, color: 'from-yellow-500 to-yellow-600' },
                ].map((stat, index) => (
                  <div 
                    key={stat.label} 
                    className="glass-card p-4 sm:p-6 md:p-8 rounded-2xl text-center group hover:scale-105 hover:-translate-y-2 transition-all duration-500 border border-white/40"
                    style={{ animationDelay: `${0.7 + index * 0.1}s` }}
                  >
                    <div className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-lg`}>
                      <stat.icon className="h-6 w-6 sm:h-8 sm:w-8 text-white drop-shadow-lg" />
                    </div>
                    <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2 group-hover:text-accent-200 transition-colors duration-300 drop-shadow-lg">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-white/80 font-medium leading-tight">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Scroll Indicator */}
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce text-white/60" style={{ animationDelay: '1s' }}>
              <div className="w-1 h-8 sm:h-12 bg-gradient-to-b from-white/60 to-transparent rounded-full mx-auto mb-2" />
              <span className="text-xs sm:text-sm font-medium">Scroll to explore</span>
            </div>
          </div>
        </div>

        {/* Enhanced Manual Controls */}
        {heroImages.length > 1 && (
          <>
            <button
              aria-label="Previous"
              onClick={prev}
              className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-3 sm:p-4 rounded-2xl glass-card border border-white/40 hover:bg-white/30 text-white backdrop-blur-xl transition-all duration-500 hover:scale-110 active:scale-95"
            >
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6 rotate-180" />
            </button>
            <button
              aria-label="Next"
              onClick={next}
              className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-3 sm:p-4 rounded-2xl glass-card border border-white/40 hover:bg-white/30 text-white backdrop-blur-xl transition-all duration-500 hover:scale-110 active:scale-95"
            >
              <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            {/* Premium Dots Indicator */}
            <div className="absolute bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-2 glass-card px-4 py-2 rounded-full border border-white/40">
              {heroImages.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Go to slide ${i + 1}`}
                  onClick={() => { goto(i); pauseTemporarily() }}
                  className={`h-2 w-2 rounded-full transition-all duration-500 ${
                    slide === i 
                      ? 'bg-white scale-150 shadow-lg' 
                      : 'bg-white/50 hover:bg-white/80 hover:scale-125'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Premium Search and Filters Section */}
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 sm:py-12 md:py-16" id="content-section">
        <div className="glass-card p-6 sm:p-8 md:p-12 mb-8 sm:mb-12 animate-fade-in-up border border-white/60">
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center space-x-2 mb-4">
              <Search className="h-6 w-6 text-primary-600" />
              <span className="text-sm font-medium text-primary-600 uppercase tracking-wider">Discovery Center</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-secondary-900 mb-4 text-gradient">
              Find Your Perfect Study Material
            </h2>
            <p className="text-base sm:text-lg text-secondary-600 max-w-2xl mx-auto">
              Use our advanced filters and intelligent search to discover exactly what you need for academic excellence
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
            {/* Search Input */}
            <div className="lg:col-span-6 order-1">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative group flex-1">
                  <Search className="absolute left-4 sm:left-6 top-1/2 transform -translate-y-1/2 h-5 w-5 sm:h-6 sm:w-6 text-secondary-400 group-focus-within:text-primary-500 transition-all duration-500" />
                  <input
                    type="text"
                    placeholder="Search resources, notes, question papers..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    className="input-premium pl-12 sm:pl-16 pr-4 text-base sm:text-lg w-full h-14 sm:h-16"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualSearch()
                        e.currentTarget.blur()
                      }
                    }}
                  />
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary-500/10 to-primary-600/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none" />
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