import { createClient } from '@supabase/supabase-js'
import { Database } from '../types/database.types'
import { apiTracker } from '../utils/apiTracker'
import { logger } from '../utils/logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Create a fallback client configuration for development/demo mode
const createSupabaseClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }

  try {
    const client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
    
    // Wrap the from method to track API calls
    const originalFrom = client.from.bind(client)
    client.from = (table: any) => {
      // Track the API call
      if (!apiTracker.logCall('SELECT', table)) {
        // Return a mock that throws an error
        return {
          select: () => Promise.reject(new Error('Rate limit exceeded')),
          insert: () => Promise.reject(new Error('Rate limit exceeded')),
          update: () => Promise.reject(new Error('Rate limit exceeded')),
          delete: () => Promise.reject(new Error('Rate limit exceeded')),
        } as any
      }
      
      return originalFrom(table)
    }
    
    return client
  } catch (error) {
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