import { supabase } from '../lib/supabase'
import { Database } from '../types/database.types'

// Rate limiting to prevent excessive API calls
const API_CALL_LIMITS = {
  getAllGroups: { calls: 0, lastReset: Date.now(), maxCalls: 2, resetInterval: 60000 }, // Reduced to 2 calls per minute
  getUserGroups: { calls: 0, lastReset: Date.now(), maxCalls: 3, resetInterval: 60000 }, // Reduced to 3 calls per minute
}

// Simple cache to reduce API calls
const CACHE = {
  allGroups: { data: null as ClassGroupWithDetails[] | null, timestamp: 0, ttl: 30000 }, // 30 seconds TTL
  userGroups: new Map<string, { data: ClassGroupWithDetails[] | null, timestamp: number }>(), // Per-user cache
}

const getCachedData = (key: 'allGroups', userId?: string): ClassGroupWithDetails[] | null => {
  if (key === 'allGroups') {
    const cache = CACHE.allGroups
    if (cache.data && Date.now() - cache.timestamp < cache.ttl) {
      return cache.data
    }
  }
  return null
}

const setCachedData = (key: 'allGroups', data: ClassGroupWithDetails[], userId?: string) => {
  if (key === 'allGroups') {
    CACHE.allGroups = { data, timestamp: Date.now(), ttl: 30000 }
  }
}

const checkRateLimit = (key: keyof typeof API_CALL_LIMITS): boolean => {
  const limit = API_CALL_LIMITS[key]
  const now = Date.now()
  
  // Reset counter if interval has passed
  if (now - limit.lastReset > limit.resetInterval) {
    limit.calls = 0
    limit.lastReset = now
  }
  
  // Check if we've exceeded the limit
  if (limit.calls >= limit.maxCalls) {
    return false
  }
  
  limit.calls++
  return true
}

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
  is_password_protected?: boolean
  join_status?: string
  is_admin?: boolean
  is_creator?: boolean
}

export interface GroupMemberWithProfile extends GroupMember {
  profiles?: {
    id: string
    username: string
    full_name: string
  } | null
}

export interface GroupAdminInfo {
  group_id: string
  group_name: string
  creator_id: string
  creator_name: string
  creator_username: string
  admin_count: number
  total_members: number
  created_at: string
  is_active: boolean
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
  if (!supabase) {
    console.error('Supabase not available')
    return []
  }

  // Check cache first
  const cachedData = getCachedData('allGroups')
  if (cachedData) {
    return cachedData
  }

  // Check rate limit
  if (!checkRateLimit('getAllGroups')) {
    console.warn('getAllClassGroups: Rate limit exceeded, returning cached/empty data')
    return CACHE.allGroups.data || []
  }

  try {
    // Check if table exists by attempting a simple query
    const { data, error } = await supabase
      .from('class_groups')
      .select('id, name, description, year, section, subject, member_count, created_by, is_active, is_password_protected, created_at, updated_at')
      .eq('is_active', true)
      .order('year', { ascending: true })
      .order('section', { ascending: true })
      .limit(10) // Limit to avoid large queries initially

    if (error) {
      console.error('Error fetching all groups:', error)
      // If table doesn't exist, return empty array instead of throwing
      if (error.code === '42P01') { // Table doesn't exist
        console.warn('class_groups table does not exist yet')
        return []
      }
      throw error
    }
    
    const processedData = (data || []).map(group => ({
      ...group,
      is_member: false,
      user_role: undefined,
      unread_count: 0,
      join_status: group.is_password_protected ? '🔒 Password Protected' : 'Open to Join',
      password_hash: null // Add missing property
    }))
    
    // Cache the result
    setCachedData('allGroups', processedData)
    
    return processedData
  } catch (error) {
    console.error('Error fetching all groups:', error)
    return []
  }
}

// Get user's joined groups
export const getUserGroups = async (userId: string): Promise<ClassGroupWithDetails[]> => {
  if (!supabase || !userId) {
    console.error('Supabase not available or no user ID provided')
    return []
  }

  // Check rate limit
  if (!checkRateLimit('getUserGroups')) {
    console.warn('getUserGroups: Rate limit exceeded, returning cached/empty data')
    return []
  }

  try {
    
    // Use direct query instead of RPC function to avoid potential issues
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        joined_at,
        class_groups!inner (
          id,
          name,
          description,
          year,
          section,
          subject,
          member_count,
          created_by,
          is_active,
          created_at,
          updated_at
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .eq('class_groups.is_active', true)

    if (error) {
      console.error('Error fetching user groups:', error)
      throw error
    }
    
    return (data || []).map((item: any) => ({
      id: item.class_groups.id,
      name: item.class_groups.name,
      description: item.class_groups.description,
      year: item.class_groups.year,
      section: item.class_groups.section,
      subject: item.class_groups.subject,
      created_by: item.class_groups.created_by,
      is_active: item.class_groups.is_active,
      member_count: item.class_groups.member_count,
      created_at: item.class_groups.created_at,
      updated_at: item.class_groups.updated_at,
      user_role: item.role,
      unread_count: 0, // Will be calculated separately if needed
      is_member: true
    }))
  } catch (error) {
    console.error('Error fetching user groups:', error)
    return []
  }
}

// Create a new class group
export const createClassGroup = async (groupData: CreateClassGroupData): Promise<ClassGroupWithDetails> => {
  if (!supabase) {
    throw new Error('Database connection not available')
  }

  // Validate required fields
  if (!groupData.name || !groupData.year || !groupData.section || !groupData.subject || !groupData.created_by) {
    throw new Error('Missing required fields for group creation')
  }

  const insertData = {
    name: groupData.name,
    description: groupData.description || '',
    year: groupData.year,
    section: groupData.section,
    subject: groupData.subject,
    created_by: groupData.created_by,
    is_password_protected: !!groupData.password,
    member_count: 1, // Creator is the first member
    is_active: true
  }

  const { data, error } = await supabase
    .from('class_groups')
    .insert([insertData])
    .select()
    .single()

  if (error) {
    console.error('Error creating group:', error)
    throw new Error('Failed to create group')
  }

  return data as ClassGroupWithDetails
}

// Join a class group
export const joinClassGroup = async (groupId: string, userId: string, password?: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  // First check if group is password protected
  const { data: groupData, error: groupError } = await supabase
    .from('class_groups')
    .select('is_password_protected')
    .eq('id', groupId)
    .single()

  if (groupError) throw new Error('Group not found')

  // If password protected, verify password
  if (groupData.is_password_protected) {
    if (!password) {
      throw new Error('This group requires a password to join')
    }

    const { data: isValid, error: verifyError } = await supabase
      .rpc('verify_group_password', {
        group_id_param: groupId,
        password_param: password
      })

    if (verifyError) {
      throw new Error('Error verifying password')
    }

    if (!isValid) {
      throw new Error('Incorrect password')
    }
  }

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
  if (!supabase) {
    console.warn('Supabase not available for getGroupMembers')
    return []
  }
  
  if (!groupId) {
    console.warn('No group ID provided for getGroupMembers')
    return []
  }

  try {
    
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

    if (error) {
      console.error('Database error in getGroupMembers:', error)
      if (error.code === '42P01') {
        console.warn('group_members table does not exist yet')
        return []
      }
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error in getGroupMembers:', error)
    
    // Don't return empty array for unknown errors - let caller handle it
    if (error instanceof Error && error.message.includes('table does not exist')) {
      return []
    }
    
    throw error
  }
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
  if (!groupId || !userId || !message.trim()) throw new Error('Missing required parameters')

  try {
    
    const messageData = {
      group_id: groupId,
      user_id: userId,
      message: message.trim(),
      message_type: messageType,
      file_url: fileData?.file_url || null,
      file_name: fileData?.file_name || null,
      file_size: fileData?.file_size || null,
      reply_to: replyTo || null
    }

    const { data, error } = await supabase
      .from('group_messages')
      .insert([messageData])
      .select()
      .single()

    if (error) {
      console.error('Error sending message:', error)
      if (error.code === '42P01') {
        throw new Error('There is a technical issue. Please try again later.')
      } else if (error.code === '42501') {
        throw new Error('You are already in this group')
      } else {
        throw new Error('Could not join the group. Please try again.')
      }
    }
    
    return data
  } catch (error) {
    console.error('Error in sendGroupMessage:', error)
    throw error
  }
}

// Get group messages
export const getGroupMessages = async (
  groupId: string,
  limit: number = 50,
  offset: number = 0
): Promise<GroupMessageWithProfile[]> => {
  if (!supabase) {
    return []
  }

  if (!groupId) {
    return []
  }

  try {
    // First, try without the problematic join to see if we can get basic message data
    const { data: basicMessages, error: basicError } = await supabase
      .from('group_messages')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (basicError) {
      throw basicError
    }

    if (!basicMessages || basicMessages.length === 0) {
      return []
    }

    // Now fetch profile data separately but in batches to reduce API calls
    const userIds = [...new Set(basicMessages.map(msg => msg.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url')
      .in('id', userIds)

    // Create a lookup map for profiles
    const profileMap = new Map()
    profiles?.forEach(profile => {
      profileMap.set(profile.id, profile)
    })

    const messagesWithProfiles = basicMessages.map(message => ({
      ...message,
      profiles: profileMap.get(message.user_id) || {
        id: message.user_id,
        username: 'Unknown User',
        full_name: 'Unknown User',
        avatar_url: null
      }
    }))
    
    return messagesWithProfiles
  } catch (error) {
    console.error('Error fetching group messages:', error)
    
    // Don't return empty array for unknown errors - let caller handle it
    if (error instanceof Error && error.message.includes('table does not exist')) {
      return []
    }
    
    throw error
  }
}

// Mark messages as read
export const markGroupMessagesAsRead = async (
  groupId: string,
  userId: string
): Promise<void> => {
  if (!supabase || !userId || !groupId) return

  try {
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

    const { error } = await supabase
      .from('group_message_reads')
      .upsert(readRecords, { onConflict: 'message_id,user_id' })

    if (error) {
      console.error('Error marking messages as read:', error)
    }
  } catch (error) {
    console.error('Error in markGroupMessagesAsRead:', error)
  }
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
        
        try {
          const { data, error } = await supabase
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

          if (error) {
            console.error('Error fetching new message details:', error)
            return
          }

          if (data) {
            callback(data)
          }
        } catch (error) {
          console.error('Error fetching new message:', error)
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

// Verify group password
export const verifyGroupPassword = async (
  groupId: string,
  password: string
): Promise<boolean> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('verify_group_password', {
      group_id_param: groupId,
      password_param: password
    })

  if (error) {
    console.error('Error verifying password:', error)
    return false
  }

  return data || false
}

// Set group password (for group admin/creator)
export const setGroupPassword = async (
  groupId: string,
  password: string | null,
  userId: string
): Promise<void> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('set_group_password', {
      group_id_param: groupId,
      password_param: password,
      user_id_param: userId
    })

  if (error) throw error
  if (!data) throw new Error('You do not have permission to change group password')
}

// ============================================================================
// ADMIN MANAGEMENT FUNCTIONS
// ============================================================================

// Check if user is admin of a group
export const isGroupAdmin = async (groupId: string, userId: string): Promise<boolean> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('is_group_admin', {
      group_id_param: groupId,
      user_id_param: userId
    })

  if (error) {
    console.error('Error checking admin status:', error)
    return false
  }

  return data || false
}

// Promote member to admin
export const promoteToAdmin = async (
  groupId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('promote_to_admin', {
      group_id_param: groupId,
      target_user_id_param: targetUserId,
      requesting_user_id_param: requestingUserId
    })

  if (error) throw error
  return data
}

// Demote admin to member
export const demoteAdmin = async (
  groupId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('demote_admin', {
      group_id_param: groupId,
      target_user_id_param: targetUserId,
      requesting_user_id_param: requestingUserId
    })

  if (error) throw error
  return data
}

// Remove member from group
export const removeGroupMember = async (
  groupId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('remove_group_member', {
      group_id_param: groupId,
      target_user_id_param: targetUserId,
      requesting_user_id_param: requestingUserId
    })

  if (error) throw error
  return data
}

// Update group details (admin only)
export const updateGroupDetails = async (
  groupId: string,
  newName?: string,
  newDescription?: string,
  requestingUserId?: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('update_group_details', {
      group_id_param: groupId,
      new_name: newName || null,
      new_description: newDescription || null,
      requesting_user_id_param: requestingUserId
    })

  if (error) throw error
  return data
}

// Delete group (creator only)
export const deleteGroup = async (
  groupId: string,
  requestingUserId: string
): Promise<{ success: boolean; message?: string; error?: string }> => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .rpc('delete_group', {
      group_id_param: groupId,
      requesting_user_id_param: requestingUserId
    })

  if (error) throw error
  return data
}

// Get group admin info
export const getGroupAdminInfo = async (groupId: string) => {
  if (!supabase) throw new Error('Supabase not available')

  const { data, error } = await supabase
    .from('group_admin_info')
    .select('*')
    .eq('group_id', groupId)
    .single()

  if (error) throw error
  return data
}
