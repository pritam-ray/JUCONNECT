import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/supabase'
import { Database } from '../types/database.types'
import { ensureSupabase, withSupabaseGuard } from '../utils/serviceGuards'
import { logger } from '../utils/logger'

type Content = Database['public']['Tables']['content']['Row']
type ContentInsert = Database['public']['Tables']['content']['Insert']
type ContentUpdate = Database['public']['Tables']['content']['Update']

export interface ContentWithCategory extends Content {
  categories?: {
    id: string
    name: string
    slug: string
  } | null
  profiles?: {
    id: string
    username: string
    full_name: string
  } | null
}

export const getApprovedContent = async (
  contentType?: Content['content_type'],
  categoryId?: string,
  searchQuery?: string,
  limit: number = 20,
  offset: number = 0
): Promise<ContentWithCategory[]> => {
  if (!isSupabaseConfigured()) {
    logger.demoMode('Supabase is not configured. Returning empty content list.')
    return []
  }

  try {
    let query = supabase
      .from('content')
      .select(`
        *,
        categories (
          id,
          name,
          slug
        ),
        profiles (
          id,
          username,
          full_name
        )
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (contentType) {
      query = query.eq('content_type', contentType)
    }

    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }

    if (searchQuery) {
      const searchTerm = `%${searchQuery.trim()}%`
      query = query.or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error: any) {
    logger.error('Failed to fetch content:', error)
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.')
    }
    throw error
  }
}

const getUserContent = async (userId: string): Promise<ContentWithCategory[]> => {
  if (!isSupabaseConfigured()) {
    return []
  }

  const { data, error } = await supabase
    .from('content')
    .select(`
      *,
      categories (
        id,
        name,
        slug
      )
    `)
    .eq('uploaded_by', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const createContent = async (contentData: ContentInsert): Promise<Content> => {
  const { data, error } = await supabase
    .from('content')
    .insert([contentData])
    .select()
    .single()

  if (error) throw error
  
  // Content is automatically approved after security validation
  return data
}

const updateContent = async (
  contentId: string,
  updates: ContentUpdate
): Promise<Content> => {
  const { data, error } = await supabase
    .from('content')
    .update(updates)
    .eq('id', contentId)
    .select()
    .single()

  if (error) throw error
  return data
}

const deleteContent = async (contentId: string): Promise<void> => {
  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', contentId)

  if (error) throw error
}

export const incrementViewCount = async (contentId: string): Promise<void> => {
  const { error } = await supabase.rpc('increment_view_count', {
    content_id: contentId
  })

  if (error) {
    // Fallback to manual increment if RPC doesn't exist
    const { data: content } = await supabase
      .from('content')
      .select('view_count')
      .eq('id', contentId)
      .single()

    if (content) {
      await supabase
        .from('content')
        .update({ view_count: (content.view_count || 0) + 1 })
        .eq('id', contentId)
    }
  }
}

const getContentById = async (contentId: string): Promise<ContentWithCategory | null> => {
  const { data, error } = await supabase
    .from('content')
    .select(`
      *,
      categories (
        id,
        name,
        slug
      ),
      profiles (
        id,
        username,
        full_name
      )
    `)
    .eq('id', contentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return data
}

export const getContentStats = async () => {
  if (!isSupabaseConfigured()) {
    return {
      total: 0,
      approved: 0,
      pending: 0,
      byType: {
        question_paper: 0,
        notes: 0,
        syllabus: 0,
        educational_link: 0,
        assignments: 0,
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('content')
      .select('content_type, is_approved')

    if (error) throw error

    const stats = {
      total: data.length,
      approved: data.filter(item => item.is_approved).length,
      pending: data.filter(item => !item.is_approved).length,
      byType: {
        question_paper: data.filter(item => item.content_type === 'question_paper').length,
        notes: data.filter(item => item.content_type === 'notes').length,
        syllabus: data.filter(item => item.content_type === 'syllabus').length,
        educational_link: data.filter(item => item.content_type === 'educational_link').length,
        assignments: data.filter(item => item.content_type === 'assignments').length,
      }
    }

    return stats
  } catch (error: any) {
    logger.error('Failed to fetch content stats:', error)
    return {
      totalContent: 0,
      totalCategories: 0,
      totalUsers: 0,
      recentUploads: 0
    }
  }
}