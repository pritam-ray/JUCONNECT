import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type ContentReport = Database['public']['Tables']['content_reports']['Row']
type ContentReportInsert = Database['public']['Tables']['content_reports']['Insert']
type ChatReport = Database['public']['Tables']['chat_reports']['Row']
type ChatReportInsert = Database['public']['Tables']['chat_reports']['Insert']

export interface ContentReportWithDetails extends ContentReport {
  content?: {
    id: string
    title: string
    content_type: string
  } | null
  reporter?: {
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

export interface ChatReportWithDetails extends ChatReport {
  chat_messages?: {
    id: string
    message: string
    user_id: string
  } | null
  reporter?: {
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

// Report content
export const reportContent = async (
  contentId: string,
  reportedBy: string,
  reason: string,
  description?: string
): Promise<ContentReport> => {
  // Check if user has already reported this content
  const { data: existingReport } = await supabase
    .from('content_reports')
    .select('id')
    .eq('content_id', contentId)
    .eq('reported_by', reportedBy)
    .maybeSingle()

  if (existingReport) {
    throw new Error('You have already reported this content')
  }

  const reportData: ContentReportInsert = {
    content_id: contentId,
    reported_by: reportedBy,
    reason: reason.trim(),
    description: description?.trim() || null
  }

  const { data, error } = await supabase
    .from('content_reports')
    .insert([reportData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Report chat message
export const reportChatMessage = async (
  messageId: string,
  reportedBy: string,
  reason: string,
  description?: string
): Promise<ChatReport> => {
  // Check if user has already reported this message
  const { data: existingReport } = await supabase
    .from('chat_reports')
    .select('id')
    .eq('message_id', messageId)
    .eq('reported_by', reportedBy)
    .single()

  if (existingReport) {
    throw new Error('You have already reported this message')
  }

  const reportData: ChatReportInsert = {
    message_id: messageId,
    reported_by: reportedBy,
    reason: reason.trim(),
    description: description?.trim() || null
  }

  const { data, error } = await supabase
    .from('chat_reports')
    .insert([reportData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get all content reports (admin only)
export const getAllContentReports = async (
  status?: string
): Promise<ContentReportWithDetails[]> => {
  let query = supabase
    .from('content_reports')
    .select(`
      *,
      content (
        id,
        title,
        content_type
      ),
      reporter:profiles!content_reports_reported_by_fkey (
        id,
        username,
        full_name
      ),
      reviewer:profiles!content_reports_reviewed_by_fkey (
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

// Get all chat reports (admin only)
export const getAllChatReports = async (
  status?: string
): Promise<ChatReportWithDetails[]> => {
  let query = supabase
    .from('chat_reports')
    .select(`
      *,
      chat_messages (
        id,
        message,
        user_id
      ),
      reporter:profiles!chat_reports_reported_by_fkey (
        id,
        username,
        full_name
      ),
      reviewer:profiles!chat_reports_reviewed_by_fkey (
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

// Update content report status (admin only)
export const updateContentReportStatus = async (
  reportId: string,
  status: 'reviewed' | 'resolved' | 'dismissed',
  reviewedBy: string,
  adminNotes?: string
): Promise<ContentReport> => {
  const { data, error } = await supabase
    .from('content_reports')
    .update({
      status,
      reviewed_by: reviewedBy,
      admin_notes: adminNotes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Update chat report status (admin only)
export const updateChatReportStatus = async (
  reportId: string,
  status: 'reviewed' | 'resolved' | 'dismissed',
  reviewedBy: string,
  adminNotes?: string
): Promise<ChatReport> => {
  const { data, error } = await supabase
    .from('chat_reports')
    .update({
      status,
      reviewed_by: reviewedBy,
      admin_notes: adminNotes?.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Remove content based on report (admin only)
export const removeReportedContent = async (
  contentId: string,
  reportId: string,
  adminId: string,
  reason: string
): Promise<void> => {
  // Update the report status first
  await updateContentReportStatus(reportId, 'resolved', adminId, `Content removed: ${reason}`)

  // Delete the content
  const { error } = await supabase
    .from('content')
    .delete()
    .eq('id', contentId)

  if (error) throw error
}

// Remove chat message based on report (admin only)
export const removeReportedChatMessage = async (
  messageId: string,
  reportId: string,
  adminId: string,
  reason: string
): Promise<void> => {
  // Update the report status first
  await updateChatReportStatus(reportId, 'resolved', adminId, `Message removed: ${reason}`)

  // Mark the message as reported (which hides it from public view)
  const { error } = await supabase
    .from('chat_messages')
    .update({ is_reported: true })
    .eq('id', messageId)

  if (error) throw error
}

// Get user's own reports
export const getUserReports = async (userId: string): Promise<{
  contentReports: ContentReportWithDetails[]
  chatReports: ChatReportWithDetails[]
}> => {
  const [contentReports, chatReports] = await Promise.all([
    supabase
      .from('content_reports')
      .select(`
        *,
        content (
          id,
          title,
          content_type
        )
      `)
      .eq('reported_by', userId)
      .order('created_at', { ascending: false }),
    
    supabase
      .from('chat_reports')
      .select(`
        *,
        chat_messages (
          id,
          message,
          user_id
        )
      `)
      .eq('reported_by', userId)
      .order('created_at', { ascending: false })
  ])

  if (contentReports.error) throw contentReports.error
  if (chatReports.error) throw chatReports.error

  return {
    contentReports: contentReports.data || [],
    chatReports: chatReports.data || []
  }
}

// Get report statistics (admin only)
export const getReportStatistics = async (): Promise<{
  contentReports: {
    total: number
    pending: number
    reviewed: number
    resolved: number
    dismissed: number
  }
  chatReports: {
    total: number
    pending: number
    reviewed: number
    resolved: number
    dismissed: number
  }
}> => {
  const [contentReports, chatReports] = await Promise.all([
    supabase
      .from('content_reports')
      .select('status'),
    
    supabase
      .from('chat_reports')
      .select('status')
  ])

  if (contentReports.error) throw contentReports.error
  if (chatReports.error) throw chatReports.error

  const contentStats = {
    total: contentReports.data.length,
    pending: contentReports.data.filter(r => r.status === 'pending').length,
    reviewed: contentReports.data.filter(r => r.status === 'reviewed').length,
    resolved: contentReports.data.filter(r => r.status === 'resolved').length,
    dismissed: contentReports.data.filter(r => r.status === 'dismissed').length
  }

  const chatStats = {
    total: chatReports.data.length,
    pending: chatReports.data.filter(r => r.status === 'pending').length,
    reviewed: chatReports.data.filter(r => r.status === 'reviewed').length,
    resolved: chatReports.data.filter(r => r.status === 'resolved').length,
    dismissed: chatReports.data.filter(r => r.status === 'dismissed').length
  }

  return {
    contentReports: contentStats,
    chatReports: chatStats
  }
}