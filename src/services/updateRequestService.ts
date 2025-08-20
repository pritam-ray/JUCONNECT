import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type UpdateRequest = Database['public']['Tables']['update_requests']['Row']
type UpdateRequestInsert = Database['public']['Tables']['update_requests']['Insert']
type UpdateRequestUpdate = Database['public']['Tables']['update_requests']['Update']

export interface UpdateRequestWithProfile extends UpdateRequest {
  profiles?: {
    id: string
    username: string
    full_name: string
  } | null
  reviewer?: {
    id: string
    username: string
    full_name: string
  } | null
}

export const createUpdateRequest = async (
  requestData: UpdateRequestInsert
): Promise<UpdateRequest> => {
  const { data, error } = await supabase
    .from('update_requests')
    .insert([requestData])
    .select()
    .single()

  if (error) throw error
  return data
}

export const getUserUpdateRequests = async (
  userId: string
): Promise<UpdateRequestWithProfile[]> => {
  const { data, error } = await supabase
    .from('update_requests')
    .select(`
      *,
      profiles!update_requests_user_id_fkey (
        id,
        username,
        full_name
      ),
      reviewer:profiles!update_requests_reviewed_by_fkey (
        id,
        username,
        full_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

const getAllUpdateRequests = async (
  status?: UpdateRequest['status']
): Promise<UpdateRequestWithProfile[]> => {
  let query = supabase
    .from('update_requests')
    .select(`
      *,
      profiles!update_requests_user_id_fkey (
        id,
        username,
        full_name
      ),
      reviewer:profiles!update_requests_reviewed_by_fkey (
        id,
        username,
        full_name
      )
    `)
    .order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

const updateRequestStatus = async (
  requestId: string,
  status: UpdateRequest['status'],
  adminNotes?: string,
  reviewedBy?: string
): Promise<UpdateRequest> => {
  const updates: UpdateRequestUpdate = {
    status,
    admin_notes: adminNotes,
    reviewed_by: reviewedBy,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('update_requests')
    .update(updates)
    .eq('id', requestId)
    .select()
    .single()

  if (error) throw error
  return data
}

const getUpdateRequestById = async (
  requestId: string
): Promise<UpdateRequestWithProfile | null> => {
  const { data, error } = await supabase
    .from('update_requests')
    .select(`
      *,
      profiles!update_requests_user_id_fkey (
        id,
        username,
        full_name
      ),
      reviewer:profiles!update_requests_reviewed_by_fkey (
        id,
        username,
        full_name
      )
    `)
    .eq('id', requestId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}

const deleteUpdateRequest = async (requestId: string): Promise<void> => {
  const { error } = await supabase
    .from('update_requests')
    .delete()
    .eq('id', requestId)

  if (error) throw error
}