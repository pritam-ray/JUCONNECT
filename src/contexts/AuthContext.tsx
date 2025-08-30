import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { Database } from '../types/database.types'
import { initGuard } from '../utils/initGuard'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  isGuest: boolean
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
  const [isInitialized, setIsInitialized] = useState(false)

  // Enhanced session validation
  const isSessionValid = useCallback(() => {
    if (!session || isGuest) return false
    
    // Check if session is expired
    const now = new Date().getTime()
    const expiresAt = session.expires_at ? session.expires_at * 1000 : 0
    
    return expiresAt > now
  }, [session, isGuest])

  // Define signOut before functions that use it
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
      setIsGuest(true) // Automatically set as guest after sign out
      
      // Clear stored data
      localStorage.removeItem('ju-connect-guest-mode')
      sessionStorage.clear()
    }
  }, [isGuest])

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
  }, [isGuest, signOut])

  const refreshProfile = useCallback(async () => {
    // Rate limiting - only allow profile refresh once every 30 seconds
    const now = Date.now()
    const lastRefresh = parseInt(localStorage.getItem('last-profile-refresh') || '0')
    if (now - lastRefresh < 60000) { // Increase to 60 seconds for more aggressive rate limiting
      console.log('Profile refresh rate limited')
      return
    }
    
    if (user && !isGuest && isSupabaseConfigured() && supabase) {
      try {
        localStorage.setItem('last-profile-refresh', now.toString())
        
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

  useEffect(() => {
    let mounted = true
    let sessionCheckInterval: NodeJS.Timeout | null = null
    let authSubscription: any = null

    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (isInitialized) {
        console.log('🔒 Auth already initialized, skipping...')
        return
      }

      try {
        console.log('🚀 Initializing Auth...')
        setIsInitialized(true)
        await initGuard.initialize(async () => {
          console.log('🔐 Initializing authentication...')
          
          if (!isSupabaseConfigured() || !supabase) {
            console.warn('Supabase not configured, setting as guest mode')
            
            if (mounted) {
              setIsGuest(true)
              setUser(null)
              setProfile(null)
              setSession(null)
              setLoading(false)
            }
            return
          }

          // SIMPLIFIED: Get session ONCE only, no retries
          let session = null
          try {
            const { data: { session: currentSession }, error } = await supabase.auth.getSession()
            if (error) {
              console.warn('Session retrieval failed:', error)
            } else {
              session = currentSession
            }
          } catch (error) {
            console.error('Failed to retrieve session:', error)
          }
          
          if (mounted) {
            setSession(session)
            setUser(session?.user ?? null)
            
            // If no session, automatically set as guest
            if (!session?.user) {
              console.log('No authenticated session found, setting as guest')
              setIsGuest(true)
            } else {
              setIsGuest(false)
              await refreshProfile()
            }
            
            setLoading(false)
          }

          // Set up periodic session validation with cleanup
          if (session && mounted) {
            sessionCheckInterval = setInterval(() => {
              if (mounted && session && !isSessionValid()) {
                console.log('Session expired, refreshing...')
                refreshSession()
              }
            }, 5 * 60 * 1000) // Check every 5 minutes
          }

          // Listen for auth changes with enhanced error handling
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (!mounted) return
              
              console.log('Auth state changed:', event)
              
              try {
                setSession(session)
                setUser(session?.user ?? null)
                
                // Automatically set guest status based on session
                if (session?.user) {
                  setIsGuest(false)
                  // Clear any guest mode storage
                  localStorage.removeItem('ju-connect-guest-mode')
                } else {
                  console.log('Auth state change: No user session, setting as guest')
                  setIsGuest(true)
                }
                
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
          
          authSubscription = subscription

          // Handle page visibility changes for session management
          const handleVisibilityChange = () => {
            if (mounted && document.visibilityState === 'visible' && session && !isSessionValid()) {
              refreshSession()
            }
          }
          
          document.addEventListener('visibilitychange', handleVisibilityChange)
        })
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
      if (authSubscription) {
        authSubscription.unsubscribe()
      }
    }
  }, [isSessionValid, refreshSession, refreshProfile]) // Include refreshProfile

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isGuest,
    signOut,
    refreshProfile,
    isSessionValid,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
