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
  isSessionValid: () => boolean
  refreshSession: () => Promise<void>
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

  // Enhanced session validation
  const isSessionValid = useCallback(() => {
    if (!session || isGuest) return false
    
    // Check if session is expired
    const now = new Date().getTime()
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    
    return expiresAt > now
  }, [session, isGuest])

  // Enhanced session refresh
  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured() || !supabase || isGuest) return
    
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.warn('Session refresh failed:', error.message)
        // If refresh fails, sign out the user
        await signOut()
        return
      }
      
      if (newSession) {
        setSession(newSession)
        setUser(newSession.user)
        console.log('Session refreshed successfully')
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      await signOut()
    }
  }, [isGuest])

  const refreshProfile = useCallback(async () => {
    if (user && !isGuest && isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.warn('Profile not found for user')
            return
          }
          throw error
        }
        setProfile(data)
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
  }, [user, isGuest])

  const signInAsGuest = useCallback(() => {
    setIsGuest(true)
    setUser(null)
    setProfile(null)
    setSession(null)
    setLoading(false)
    
    // Store guest mode in localStorage for persistence
    localStorage.setItem('ju-connect-guest-mode', 'true')
  }, [])

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured() && supabase && !isGuest) {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.warn('Error during sign out:', error.message)
        }
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setUser(null)
      setProfile(null)
      setSession(null)
      setIsGuest(false)
      
      // Clear stored data
      localStorage.removeItem('ju-connect-guest-mode')
      sessionStorage.clear()
    }
  }, [isGuest])

  useEffect(() => {
    let mounted = true
    let sessionCheckInterval: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        if (!isSupabaseConfigured() || !supabase) {
          console.warn('Supabase not configured, running in guest mode')
          
          // Check if user was in guest mode before
          const wasGuest = localStorage.getItem('ju-connect-guest-mode') === 'true'
          if (wasGuest) {
            setIsGuest(true)
          }
          
          if (mounted) {
            setLoading(false)
          }
          return
        }

        // Get initial session with retry mechanism
        let retryCount = 0
        const maxRetries = 3
        let session = null
        
        while (retryCount < maxRetries && !session) {
          try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession()
            if (error) throw error
            session = currentSession
            break
          } catch (error) {
            retryCount++
            if (retryCount < maxRetries) {
              console.warn(`Session retrieval attempt ${retryCount} failed, retrying...`)
              await new Promise(resolve => setTimeout(resolve, 1000))
            } else {
              console.error('Failed to retrieve session after retries:', error)
            }
          }
        }
        
        if (mounted) {
          setSession(session)
          setUser(session?.user ?? null)
          
          if (session?.user) {
            await refreshProfile()
          }
          
          setLoading(false)
        }

        // Set up periodic session validation
        sessionCheckInterval = setInterval(() => {
          if (session && !isSessionValid()) {
            console.log('Session expired, refreshing...')
            refreshSession()
          }
        }, 5 * 60 * 1000) // Check every 5 minutes

        // Listen for auth changes with enhanced error handling
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (!mounted) return
            
            console.log('Auth state changed:', event)
            
            try {
              setSession(session)
              setUser(session?.user ?? null)
              setIsGuest(false)
              
              if (session?.user) {
                await refreshProfile()
              } else {
                setProfile(null)
                localStorage.removeItem('ju-connect-guest-mode')
              }
            } catch (error) {
              console.error('Error handling auth state change:', error)
            }
          }
        )

        // Handle page visibility changes for session management
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && session && !isSessionValid()) {
            refreshSession()
          }
        }
        
        document.addEventListener('visibilitychange', handleVisibilityChange)

        return () => {
          subscription.unsubscribe()
          document.removeEventListener('visibilitychange', handleVisibilityChange)
          if (sessionCheckInterval) {
            clearInterval(sessionCheckInterval)
          }
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
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval)
      }
    }
  }, [refreshProfile, isSessionValid, refreshSession])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isGuest,
    signInAsGuest,
    signOut,
    refreshProfile,
    isSessionValid,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
