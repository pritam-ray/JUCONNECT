import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type ProfileInsert = Database['public']['Tables']['profiles']['Insert']

export const signUp = async (
  email: string,
  password: string,
  fullName: string,
  username: string,
  mobileNumber: string
) => {
  try {
    // Check if username is already taken
    const { data: existingUsername } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single()

    if (existingUsername) {
      throw new Error('Username already exists')
    }

    // Check if mobile number is already taken
    const { data: existingMobile } = await supabase
      .from('profiles')
      .select('mobile_number')
      .eq('mobile_number', mobileNumber)
      .single()

    if (existingMobile) {
      throw new Error('Mobile number already registered')
    }

    // Sign up user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (!authData.user) {
      throw new Error('User creation failed')
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
      throw profileError
    }

    return { user: authData.user, profile: profileData }
  } catch (error) {
    console.error('Sign up error:', error)
    throw error
  }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export const updateProfile = async (
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