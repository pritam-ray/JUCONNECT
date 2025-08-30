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
  authKey: number
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  forceRefreshProfile: () => Promise<void>
  isSessionValid: () => boolean
  refreshSession: () => Promise<void>
  debugAuthState: () => void
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
  const [authKey, setAuthKey] = useState(0) // Force re-render key

  // Helper function to completely clear authentication state
  const clearAuthState = useCallback(() => {
    console.log('🧹 Clearing all authentication state...')
    
    setUser(null)
    setProfile(null)
    setSession(null)
    setIsGuest(true)
    
    // Force re-render
    setAuthKey(prev => prev + 1)
    
    // Clear all storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Clear any browser-cached auth data
    if (typeof window !== 'undefined') {
      // Clear any cookies related to auth
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=")
        const name = eqPos > -1 ? c.substr(0, eqPos) : c
        if (name.trim().includes('sb-') || name.trim().includes('supabase')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
        }
      })
    }
    
    console.log('✅ Authentication state cleared')
  }, [])

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
      console.log('🚪 Starting sign out process...')
      
      if (isSupabaseConfigured() && supabase && !isGuest) {
        // Sign out from Supabase with scope 'global' to clear all sessions
        const { error } = await supabase.auth.signOut({ scope: 'global' })
        if (error) {
          console.warn('Error during sign out:', error.message)
        }
      }
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      // Use the helper function to clear all auth state
      clearAuthState()
      
      console.log('✅ Sign out complete - user is now guest')
      
      // Force a page refresh to completely reset the application state
      setTimeout(() => {
        window.location.href = '/'
      }, 100)
    }
  }, [isGuest, clearAuthState])

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

  // Force refresh profile without rate limiting (for auth flows)
  const forceRefreshProfile = useCallback(async () => {
    console.log('🔄 Force refreshing profile...')
    console.log('🔍 Current user:', user?.email, 'User ID:', user?.id)
    console.log('🔍 Is guest:', isGuest, 'Supabase configured:', isSupabaseConfigured())
    
    if (!user || isGuest || !isSupabaseConfigured() || !supabase) {
      console.warn('⚠️ Cannot refresh profile - missing requirements:', {
        hasUser: !!user,
        isGuest,
        supabaseConfigured: isSupabaseConfigured(),
        hasSupabase: !!supabase
      })
      return
    }

    try {
      console.log('📡 Fetching profile for user:', user.id)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          console.warn('⚠️ Profile not found for user:', user.id)
          return
        }
        console.error('❌ Error fetching profile:', error)
        throw error
      }
      
      if (data) {
        console.log('✅ Profile force refreshed successfully:', data.username)
        setProfile(data)
        
        // Reset rate limiting timer
        localStorage.setItem('last-profile-refresh', Date.now().toString())
      } else {
        console.warn('⚠️ No profile data returned for user:', user.id)
      }
    } catch (error) {
      console.error('❌ Error force refreshing profile:', error)
    }
  }, [user, isGuest])

  // Debug function to log current auth state
  const debugAuthState = useCallback(() => {
    console.log('🐛 === AUTH STATE DEBUG ===')
    console.log('User:', user?.email || 'null')
    console.log('User ID:', user?.id || 'null')
    console.log('Profile:', profile?.username || 'null')
    console.log('Session exists:', !!session)
    console.log('Is Guest:', isGuest)
    console.log('Loading:', loading)
    console.log('Auth Key:', authKey)
    console.log('Session valid:', isSessionValid())
    console.log('🐛 === END DEBUG ===')
  }, [user, profile, session, isGuest, loading, authKey, isSessionValid])

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

          // ENHANCED: Get session with multiple attempts and better error handling
          let session = null
          let attempts = 0
          const maxAttempts = 3
          
          while (attempts < maxAttempts && !session) {
            try {
              console.log(`🔍 Attempting to get session (attempt ${attempts + 1}/${maxAttempts})`)
              const { data: { session: currentSession }, error } = await supabase.auth.getSession()
              
              if (error) {
                console.warn(`Session retrieval attempt ${attempts + 1} failed:`, error)
                if (attempts === maxAttempts - 1) {
                  throw error
                }
              } else {
                session = currentSession
                if (session?.user) {
                  console.log('✅ Session found:', session.user.email)
                  break
                } else {
                  console.log('📝 No session found on this attempt')
                }
              }
            } catch (error) {
              console.error(`Failed to retrieve session (attempt ${attempts + 1}):`, error)
              if (attempts === maxAttempts - 1) {
                console.error('All session retrieval attempts failed')
              }
            }
            
            attempts++
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 500)) // Wait before retry
            }
          }
          
          if (mounted) {
            setSession(session)
            setUser(session?.user ?? null)
            
            // Enhanced session detection and state setting
            if (!session?.user) {
              console.log('❌ No authenticated session found, setting as guest')
              setIsGuest(true)
              setProfile(null)
              setAuthKey(prev => prev + 1) // Force re-render
              console.log('AuthContext: Set isGuest to true - user is null')
            } else {
              console.log('✅ Authenticated session found, setting as authenticated user')
              console.log('👤 User email:', session.user.email)
              console.log('🆔 User ID:', session.user.id)
              setIsGuest(false)
              setAuthKey(prev => prev + 1) // Force re-render
              console.log('AuthContext: Set isGuest to false - user authenticated')
              
              // Force refresh profile for authenticated users immediately
              if (session.user?.id) {
                console.log('🔄 Loading profile for user:', session.user.id)
                try {
                  const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                  
                  if (profileError) {
                    if (profileError.code !== 'PGRST116') {
                      console.error('❌ Profile fetch error:', profileError)
                    } else {
                      console.warn('⚠️ Profile not found for user:', session.user.id)
                    }
                  } else if (profileData) {
                    console.log('✅ Profile loaded successfully:', profileData.username)
                    setProfile(profileData)
                  }
                } catch (error) {
                  console.error('❌ Failed to load profile:', error)
                }
              }
              
              // Wait a bit for state to settle then force refresh profile as backup
              setTimeout(async () => {
                console.log('⏰ Delayed profile refresh after state settlement')
                await forceRefreshProfile()
              }, 500)
            }
            
            setLoading(false)
            console.log('🎯 Auth initialization complete. isGuest:', !session?.user, 'user exists:', !!session?.user)
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
              
              console.log('🔄 Auth state changed:', event, 'Session exists:', !!session?.user)
              console.log('🔄 Session user:', session?.user?.email)
              
              try {
                setSession(session)
                setUser(session?.user ?? null)
                
                // Handle different auth events
                if (event === 'SIGNED_OUT') {
                  console.log('🚪 SIGNED_OUT event - forcing guest mode')
                  clearAuthState()
                } else if (event === 'SIGNED_IN' && session?.user) {
                  console.log('🔑 SIGNED_IN event - user authenticated')
                  setIsGuest(false)
                  console.log('AuthContext: SIGNED_IN - isGuest set to false, user:', session.user.email)
                  // Clear any guest mode storage
                  localStorage.removeItem('ju-connect-guest-mode')
                  
                  // Force re-render
                  setAuthKey(prev => prev + 1)
                  
                  // Load profile immediately for SIGNED_IN event
                  if (session.user?.id && isSupabaseConfigured() && supabase) {
                    try {
                      const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()
                      
                      if (profileError) {
                        if (profileError.code !== 'PGRST116') {
                          console.error('❌ Profile fetch error during SIGNED_IN:', profileError)
                        }
                      } else if (profileData) {
                        console.log('✅ Profile loaded during SIGNED_IN:', profileData.username)
                        setProfile(profileData)
                      }
                    } catch (error) {
                      console.error('❌ Failed to load profile during SIGNED_IN:', error)
                    }
                  }
                } else if (session?.user) {
                  setIsGuest(false)
                  console.log('AuthContext: Auth state change - user authenticated, isGuest set to false')
                  // Clear any guest mode storage
                  localStorage.removeItem('ju-connect-guest-mode')
                  
                  // Force re-render
                  setAuthKey(prev => prev + 1)
                  
                  // Load profile for authenticated user
                  if (session.user?.id && isSupabaseConfigured() && supabase) {
                    try {
                      const { data: profileData, error: profileError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single()
                      
                      if (profileError) {
                        if (profileError.code !== 'PGRST116') {
                          console.error('❌ Profile fetch error during auth change:', profileError)
                        }
                      } else if (profileData) {
                        console.log('✅ Profile loaded during auth change:', profileData.username)
                        setProfile(profileData)
                      }
                    } catch (error) {
                      console.error('❌ Failed to load profile during auth change:', error)
                    }
                  }
                } else {
                  console.log('Auth state change: No user session, setting as guest')
                  setIsGuest(true)
                  setProfile(null)
                  
                  // Force re-render
                  setAuthKey(prev => prev + 1)
                  
                  console.log('AuthContext: Auth state change - no user, isGuest set to true')
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
  }, [isSessionValid, refreshSession, refreshProfile, forceRefreshProfile]) // Include forceRefreshProfile

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    isGuest,
    authKey,
    signOut,
    refreshProfile,
    forceRefreshProfile,
    isSessionValid,
    refreshSession,
    debugAuthState,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
