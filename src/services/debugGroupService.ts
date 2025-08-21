import { supabase } from '../lib/supabase'

// Debug utility to test group functionality
export const debugGroupAccess = async (groupId: string, userId: string) => {
  if (!supabase) {
    console.log('❌ Supabase not available')
    return
  }

  console.log('🔍 Debug Group Access')
  console.log('Group ID:', groupId)
  console.log('User ID:', userId)

  // Test 1: Check if group exists
  try {
    const { data: groupData, error: groupError } = await supabase
      .from('class_groups')
      .select('*')
      .eq('id', groupId)
      .single()

    if (groupError) {
      console.log('❌ Group table error:', groupError)
      return
    }

    console.log('✅ Group exists:', groupData.name)
  } catch (error) {
    console.log('❌ Failed to check group:', error)
    return
  }

  // Test 2: Check if user is a member
  try {
    const { data: memberData, error: memberError } = await supabase
      .from('group_members')
      .select('*')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .single()

    if (memberError) {
      if (memberError.code === 'PGRST116') {
        console.log('❌ User is NOT a member of this group')
        
        // Try to add user as member
        console.log('🔄 Attempting to add user as member...')
        const { error: joinError } = await supabase
          .from('group_members')
          .insert([{
            group_id: groupId,
            user_id: userId,
            role: 'member'
          }])

        if (joinError) {
          console.log('❌ Failed to add user as member:', joinError)
        } else {
          console.log('✅ User added as member')
        }
      } else {
        console.log('❌ Member check error:', memberError)
      }
      return
    }

    console.log('✅ User is a member:', memberData.role, 'Active:', memberData.is_active)
  } catch (error) {
    console.log('❌ Failed to check membership:', error)
  }

  // Test 3: Try to send a test message
  try {
    const { data: messageData, error: messageError } = await supabase
      .from('group_messages')
      .insert([{
        group_id: groupId,
        user_id: userId,
        message: 'Debug test message',
        message_type: 'text'
      }])
      .select()
      .single()

    if (messageError) {
      console.log('❌ Message send error:', messageError)
    } else {
      console.log('✅ Test message sent:', messageData.id)
      
      // Clean up test message
      await supabase
        .from('group_messages')
        .delete()
        .eq('id', messageData.id)
    }
  } catch (error) {
    console.log('❌ Failed to send test message:', error)
  }
}
