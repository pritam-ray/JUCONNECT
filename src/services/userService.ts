import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserProfile extends Profile {
  content_count?: number
  total_views?: number
  recent_uploads?: number
}

export interface UserStats {
  totalUploads: number
  totalViews: number
  recentUploads: number
  joinedDate: string
  categories: Array<{
    name: string
    count: number
  }>
  contentTypes: Array<{
    type: string
    count: number
  }>
}

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

export const getUserStats = async (userId: string): Promise<UserStats> => {
  // Get user's content
  const { data: userContent, error: contentError } = await supabase
    .from('content')
    .select(`
      id,
      content_type,
      view_count,
      created_at,
      categories (
        name
      )
    `)
    .eq('uploaded_by', userId)
    .eq('is_approved', true)

  if (contentError) throw contentError

  // Get user profile for join date
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('created_at')
    .eq('id', userId)
    .single()

  if (profileError) throw profileError

  const totalUploads = userContent?.length || 0
  const totalViews = userContent?.reduce((sum, content) => sum + (content.view_count || 0), 0) || 0
  
  // Recent uploads (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const recentUploads = userContent?.filter(content => 
    new Date(content.created_at) > thirtyDaysAgo
  ).length || 0

  // Category breakdown
  const categoryMap = new Map<string, number>()
  userContent?.forEach(content => {
    const categoryName = content.categories?.name || 'Uncategorized'
    categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1)
  })

  const categories = Array.from(categoryMap.entries()).map(([name, count]) => ({
    name,
    count
  })).sort((a, b) => b.count - a.count)

  // Content type breakdown
  const contentTypeMap = new Map<string, number>()
  userContent?.forEach(content => {
    const type = content.content_type
    contentTypeMap.set(type, (contentTypeMap.get(type) || 0) + 1)
  })

  const contentTypes = Array.from(contentTypeMap.entries()).map(([type, count]) => ({
    type,
    count
  })).sort((a, b) => b.count - a.count)

  return {
    totalUploads,
    totalViews,
    recentUploads,
    joinedDate: profile.created_at,
    categories,
    contentTypes
  }
}

export const updateUserProfile = async (
  userId: string,
  updates: Partial<Pick<Profile, 'username' | 'full_name' | 'bio'>>
): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

const searchUsers = async (
  query: string,
  limit: number = 20
): Promise<Profile[]> => {
  if (!query.trim()) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url, is_online')
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit)

  if (error) throw error
  return data || []
}

export const getUserContent = async (
  userId: string,
  limit: number = 20,
  offset: number = 0
) => {
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
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  return data || []
}