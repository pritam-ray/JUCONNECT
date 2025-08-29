import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'
import { handleSupabaseError } from '../utils/errorHandling'
import { logger } from '../utils/logger'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  username: string,
  mobileNumber: string
) => {
  try {
    if (!supabase) {
      throw new Error('Sign up is not available right now. Please try again later.')
    }
    
    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()

    if (existingUsername) {
      throw new Error('This username is taken. Please choose a different one.')
    }

    // Check if mobile number is already taken
    const { data: existingMobile } = await supabase
      .from('profiles')
      .select('mobile_number')
      .eq('mobile_number', mobileNumber)
      .maybeSingle()

    if (existingMobile) {
      throw new Error('This phone number is already registered. Please use a different number.')
    }

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: fullName,
        }
      }
    })

    if (authError) {
      throw handleSupabaseError(authError)
    }

    if (!authData.user) {
      throw new Error('Could not create your account. Please try again.')
    }

    // Create profile
    const profileData: ProfileInsert = {
      id: authData.user.id,
      username,
      mobile_number: mobileNumber,
      full_name: fullName,
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabase.auth.signOut()
      throw handleSupabaseError(profileError)
    }

    logger.info('User signed up successfully:', authData.user.id)
    return { user: authData.user, profile: profileData }
  } catch (error: any) {
    logger.error('Sign up error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Could not create your account. Please try again.')
  }
}

export const signIn = async (email: string, password: string) => {
  try {
    if (!supabase) {
      throw new Error('Sign in is not available right now. Please try again later.')
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw handleSupabaseError(error)
    }
    
    logger.info('User signed in successfully:', data.user?.id)
    return data
  } catch (error: any) {
    logger.error('Sign in error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Could not sign you in. Please check your email and password.')
  }
}

export const signOut = async () => {
  try {
    if (!supabase) {
      throw new Error('Sign out is not available right now.')
    }
    
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw handleSupabaseError(error)
    }
    
    // Clear any cached data
    localStorage.removeItem('supabase.auth.token')
    sessionStorage.clear()
    logger.info('User signed out successfully')
  } catch (error: any) {
    logger.error('Sign out error:', error)
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Could not sign you out. Please try again.')
  }
}

const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

const updateProfile = async (
  userId: string,
  updates: Partial<Pick<ProfileInsert, 'username' | 'full_name' | 'mobile_number'>>
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}