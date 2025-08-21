import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

type ClassGroup = Database['public']['Tables']['class_groups']['Row']
type GroupMember = Database['public']['Tables']['group_members']['Row']
type GroupMessage = Database['public']['Tables']['group_messages']['Row']
type GroupFile = Database['public']['Tables']['group_files']['Row']
type GroupAnnouncement = Database['public']['Tables']['group_announcements']['Row']

export interface ClassGroupWithDetails extends ClassGroup {
  member_count: number
  user_role?: string
  unread_count?: number
  is_member?: boolean
}

export interface GroupMessageWithProfile extends GroupMessage {
  profiles?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
  } | null
  reply_to_message?: {
    id: string
    message: string
    user_name: string
  } | null
  read_by?: Array<{
    user_id: string
    username: string
    read_at: string
  }>
}

export interface GroupMemberWithProfile extends GroupMember {
  profiles?: {
    id: string
    username: string
    full_name: string
    avatar_url?: string
    is_online?: boolean
    last_seen?: string
  } | null
}

// Get all available class groups
export const getAllClassGroups = async (): Promise<ClassGroupWithDetails[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('class_groups')
    .select('*')
    .eq('is_active', true)
    .order('year', { ascending: true })
    .order('section', { ascending: true })

  if (error) throw error
  return data || []
}

// Get user's joined groups
export const getUserGroups = async (userId: string): Promise<ClassGroupWithDetails[]> => {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('get_user_groups', {
    user_id: userId
  })

  if (error) throw error
  
  return (data || []).map((group: any) => ({
    id: group.group_id,
    name: group.group_name,
    description: group.group_description,
    year: group.year,
    section: group.section,
    subject: group.subject,
    member_count: group.member_count,
    user_role: group.user_role,
    unread_count: group.unread_count,
    is_member: true
  }))
}

// Create a new class group
export const createClassGroup = async (groupData: {
  name: string
  description?: string
  year: number
  section: string
  subject?: string
  created_by: string
}): Promise<ClassGroup> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .from('class_groups')
    .insert([groupData])
    .select()
    .single()

  if (error) throw error

  // Add creator as admin
  await supabase
    .from('group_members')
    .insert([{
      group_id: data.id,
      user_id: groupData.created_by,
      role: 'admin'
    }])

  return data
}

// Join a class group
export const joinClassGroup = async (groupId: string, userId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  // Check if user is already a member
  const { data: existingMembership } = await supabase
    .from('group_members')
    .select('*')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single()

  if (existingMembership) {
    if (existingMembership.is_active) {
      throw new Error('You are already a member of this group')
    } else {
      // Reactivate membership
      const { error } = await supabase
        .from('group_members')
        .update({ is_active: true })
        .eq('group_id', groupId)
        .eq('user_id', userId)
      
      if (error) {
        console.error('Error reactivating membership:', error)
        throw new Error('Failed to rejoin group. Please try again.')
      }
      return
    }
  }

  const { error } = await supabase
    .from('group_members')
    .insert([{
      group_id: groupId,
      user_id: userId,
      role: 'member'
    }])

  if (error) {
    console.error('Error joining group:', error)
    if (error.message.includes('infinite recursion')) {
      throw new Error('Database configuration issue. Please contact support or try again later.')
    } else if (error.code === '23505') {
      throw new Error('You are already a member of this group')
    } else {
      throw new Error(`Failed to join group: ${error.message}`)
    }
  }
}

// Leave a class group
export const leaveClassGroup = async (groupId: string, userId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  const { error } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
}

// Get group members
export const getGroupMembers = async (groupId: string): Promise<GroupMemberWithProfile[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('group_members')
    .select(`
      *,
      profiles (
        id,
        username,
        full_name,
        avatar_url,
        is_online,
        last_seen
      )
    `)
    .eq('group_id', groupId)
    .eq('is_active', true)
    .order('role', { ascending: false })
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data || []
}

// Send group message
export const sendGroupMessage = async (
  groupId: string,
  userId: string,
  message: string,
  messageType: 'text' | 'file' | 'link' = 'text',
  fileData?: {
    file_url: string
    file_name: string
    file_size: number
  },
  replyTo?: string
): Promise<GroupMessage> => {
  if (!supabase) throw new Error('Supabase not available')

  const messageData = {
    group_id: groupId,
    user_id: userId,
    message: message.trim(),
    message_type: messageType,
    file_url: fileData?.file_url,
    file_name: fileData?.file_name,
    file_size: fileData?.file_size,
    reply_to: replyTo
  }

  const { data, error } = await supabase
    .from('group_messages')
    .insert([messageData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get group messages
export const getGroupMessages = async (
  groupId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GroupMessageWithProfile[]> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('group_messages')
    .select(`
      *,
      profiles (
        id,
        username,
        full_name,
        avatar_url
      ),
      reply_to_message:group_messages!group_messages_reply_to_fkey (
        id,
        message,
        profiles (
          username
        )
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) throw error
  
  return (data || []).reverse().map(msg => ({
    ...msg,
    reply_to_message: msg.reply_to_message ? {
      id: msg.reply_to_message.id,
      message: msg.reply_to_message.message,
      user_name: msg.reply_to_message.profiles?.username || 'Unknown'
    } : null
  }))
}

// Mark messages as read
export const markGroupMessagesAsRead = async (
  groupId: string,
  userId: string
): Promise<void> => {
  if (!supabase) return

  // Get unread messages
  const { data: unreadMessages } = await supabase
    .from('group_messages')
    .select('id')
    .eq('group_id', groupId)
    .neq('user_id', userId)

  if (!unreadMessages || unreadMessages.length === 0) return

  // Mark as read
  const readRecords = unreadMessages.map(msg => ({
    message_id: msg.id,
    user_id: userId
  }))

  await supabase
    .from('group_message_reads')
    .upsert(readRecords, { onConflict: 'message_id,user_id' })
}

// Upload file to group
export const uploadGroupFile = async (
  groupId: string,
  userId: string,
  file: File,
  category: 'assignment' | 'notes' | 'syllabus' | 'general' = 'general',
  description?: string
): Promise<GroupFile> => {
  if (!supabase) throw new Error('Supabase not available')

  // Upload file to storage
  const fileName = `${Date.now()}-${file.name}`
  const filePath = `group-files/${groupId}/${fileName}`

  const { error: uploadError } = await supabase.storage
    .from('files')
    .upload(filePath, file)

  if (uploadError) throw uploadError

  // Get public URL
  const { data: urlData } = supabase.storage
    .from('files')
    .getPublicUrl(filePath)

  // Save file record
  const fileData = {
    group_id: groupId,
    uploaded_by: userId,
    file_name: file.name,
    file_url: urlData.publicUrl,
    file_size: file.size,
    file_type: file.type,
    category,
    description
  }

  const { data, error } = await supabase
    .from('group_files')
    .insert([fileData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get group files
export const getGroupFiles = async (
  groupId: string,
  category?: string
): Promise<Array<GroupFile & { uploader: { username: string; full_name: string } }>> => {
  if (!supabase) return []

  let query = supabase
    .from('group_files')
    .select(`
      *,
      uploader:profiles!group_files_uploaded_by_fkey (
        username,
        full_name
      )
    `)
    .eq('group_id', groupId)
    .order('created_at', { ascending: false })

  if (category) {
    query = query.eq('category', category)
  }

  const { data, error } = await query

  if (error) throw error
  return data || []
}

// Create group announcement
export const createGroupAnnouncement = async (
  groupId: string,
  userId: string,
  title: string,
  content: string,
  isImportant: boolean = false,
  expiresAt?: string
): Promise<GroupAnnouncement> => {
  if (!supabase) throw new Error('Supabase not available')

  const announcementData = {
    group_id: groupId,
    created_by: userId,
    title: title.trim(),
    content: content.trim(),
    is_important: isImportant,
    expires_at: expiresAt
  }

  const { data, error } = await supabase
    .from('group_announcements')
    .insert([announcementData])
    .select()
    .single()

  if (error) throw error
  return data
}

// Get group announcements
export const getGroupAnnouncements = async (
  groupId: string
): Promise<Array<GroupAnnouncement & { creator: { username: string; full_name: string } }>> => {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('group_announcements')
    .select(`
      *,
      creator:profiles!group_announcements_created_by_fkey (
        username,
        full_name
      )
    `)
    .eq('group_id', groupId)
    .or('expires_at.is.null,expires_at.gt.now()')
    .order('is_important', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

// Subscribe to group messages
export const subscribeToGroupMessages = (
  groupId: string,
  callback: (message: GroupMessageWithProfile) => void
) => {
  if (!supabase) return () => {}

  const channel = supabase
    .channel(`group_messages_${groupId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'group_messages',
        filter: `group_id=eq.${groupId}`
      },
      async (payload) => {
        // Fetch complete message with profile data
        if (!supabase) return
        
        const { data } = await supabase
          .from('group_messages')
          .select(`
            *,
            profiles (
              id,
              username,
              full_name,
              avatar_url
            )
          `)
          .eq('id', payload.new.id)
          .single()

        if (data) {
          callback(data)
        }
      }
    )
    .subscribe()

  return () => {
    if (supabase) {
      supabase.removeChannel(channel)
    }
  }
}

// Update group member role
export const updateGroupMemberRole = async (
  groupId: string,
  userId: string,
  newRole: 'admin' | 'member'
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  const { error } = await supabase
    .from('group_members')
    .update({ role: newRole })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
}

// Remove group member (admin only)
export const removeGroupMember = async (
  groupId: string,
  userId: string
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  const { error } = await supabase
    .from('group_members')
    .update({ is_active: false })
    .eq('group_id', groupId)
    .eq('user_id', userId)

  if (error) throw error
}