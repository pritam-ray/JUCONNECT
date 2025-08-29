import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Database } from '../types/database.types'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isGuest: boolean
  signInAsGuest: () => void
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)

  const refreshProfile = useCallback(async () => {
    if (user && !isGuest && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) throw error
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
  }, [user, isGuest])

  const signInAsGuest = () => {
    setIsGuest(true)
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
  }

  const signOut = async () => {
    try {
      if (isSupabaseConfigured() && supabase) {
        await supabase.auth.signOut()
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
      setIsGuest(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured() || !supabase) {
          console.warn('Supabase not configured, running in guest mode')
          if (mounted) {
            setLoading(false)
          }
          return
        }

        // Get initial session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await refreshProfile()
          }
          
          setLoading(false)
        }

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (_, session) => {
            if (mounted) {
              setSession(session)
              setUser(session?.user ?? null)
              setIsGuest(false)
              
              if (session?.user) {
                await refreshProfile()
              } else {
                setProfile(null)
              }
            }
          }
        )

        return () => {
          subscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    return () => {
      mounted = false
    }
  }, [refreshProfile])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isGuest,
    signInAsGuest,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
