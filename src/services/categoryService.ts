import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/supabase'
import { Database } from '../types/database.types'

type Category = Database['public']['Tables']['categories']['Row']
type CategoryInsert = Database['public']['Tables']['categories']['Insert']

export interface CategoryWithChildren extends Category {
  children?: CategoryWithChildren[]
  parent?: Category | null
  content_count?: number
}

export const getAllCategories = async (): Promise<CategoryWithChildren[]> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase is not configured. Returning empty categories list.')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) throw error

    // Organize into parent-child hierarchy
    const categoryMap = new Map<string, CategoryWithChildren>()
    const rootCategories: CategoryWithChildren[] = []

    data.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [] })
    })

    data.forEach(category => {
      const categoryWithChildren = categoryMap.get(category.id)!
      
      if (category.parent_id) {
        const parent = categoryMap.get(category.parent_id)
        if (parent) {
          parent.children = parent.children || []
          parent.children.push(categoryWithChildren)
          categoryWithChildren.parent = parent
        }
      } else {
        rootCategories.push(categoryWithChildren)
      }
    })

    return rootCategories
  } catch (error: any) {
    console.error('Failed to fetch categories:', error)
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      throw new Error('Unable to connect to the server. Please check your internet connection and try again.')
    }
    throw error
  }
}

export const getCategoryById = async (categoryId: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', categoryId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export const getCategoryBySlug = async (slug: string): Promise<Category | null> => {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

export const createCategory = async (categoryData: CategoryInsert): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const updateCategory = async (
  categoryId: string,
  updates: Partial<CategoryInsert>
): Promise<Category> => {
  const { data, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', categoryId)
    .select()
    .single()

  if (error) throw error
  return data
}

export const deleteCategory = async (categoryId: string): Promise<void> => {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) throw error
}

export const createUserCategory = async (
  name: string,
  description?: string,
  parentId?: string
): Promise<Category> => {
  // Generate slug from name
  const slug = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()

  // Check if slug already exists
  const { data: existingCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', slug)
    .single()

  if (existingCategory) {
    throw new Error('A category with this name already exists')
  }

  const categoryData: CategoryInsert = {
    name: name.trim(),
    slug,
    description: description?.trim() || null,
    parent_id: parentId || null
  }

  const { data, error } = await supabase
    .from('categories')
    .insert([categoryData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const getCategoriesWithContentCount = async (): Promise<CategoryWithChildren[]> => {
  const categories = await getAllCategories()
  
  // Get content count for each category
  const { data: contentCounts, error } = await supabase
    .from('content')
    .select('category_id')
    .eq('is_approved', true)

  if (error) throw error

  const countMap = new Map<string, number>()
  contentCounts.forEach(item => {
    if (item.category_id) {
      countMap.set(item.category_id, (countMap.get(item.category_id) || 0) + 1)
    }
  })

  const addContentCount = (cats: CategoryWithChildren[]): CategoryWithChildren[] => {
    return cats.map(cat => ({
      ...cat,
      content_count: countMap.get(cat.id) || 0,
      children: cat.children ? addContentCount(cat.children) : []
    }))
  }

  return addContentCount(categories)
}