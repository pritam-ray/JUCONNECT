import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a fallback client configuration for development/demo mode
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    logger.demoMode('Supabase environment variables not found. Running in demo mode.')
    logger.demoMode('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
    return null
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  } catch (error) {
    logger.error('Failed to create Supabase client:', error)
    return null
  }
}

export const supabase = createSupabaseClient()

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = (): boolean => {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return !!(url && key && supabase)
}

// Helper function to check if user is admin
export const isAdmin = async (userId: string): Promise<boolean> => {
  if (!supabase) return false
  
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  
  return data?.is_admin || false
}

// Helper function to get user profile
export const getUserProfile = async (userId: string) => {
  if (!supabase) throw new Error('Supabase is not configured')
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}