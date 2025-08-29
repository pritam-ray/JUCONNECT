import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a fallback client configuration for development/demo mode
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. Running in demo mode.')
    console.warn('Required variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
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
    console.error('Failed to create Supabase client:', error)
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

// Enhanced session management
export const getSession = async () => {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) {
      logger.warn('Failed to get session:', error.message)
      return null
    }
    return session
  } catch (error) {
    logger.error('Failed to get session:', error)
    return null
  }
}

// Refresh session if needed
export const refreshSession = async () => {
  if (!supabase) return null
  
  try {
    const { data: { session }, error } = await supabase.auth.refreshSession()
    if (error) {
      logger.warn('Failed to refresh session:', error.message)
      return null
    }
    
    if (session) {
      logger.info('Session refreshed successfully')
    }
    return session
  } catch (error) {
    logger.error('Failed to refresh session:', error)
    return null
  }
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