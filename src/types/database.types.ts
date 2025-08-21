export interface Database {
  public: {
    Tables: {
      private_messages: {
        Row: {
          id: string
          sender_id: string | null
          recipient_id: string | null
          message: string
          is_read: boolean
          is_deleted_by_sender: boolean
          is_deleted_by_recipient: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id?: string | null
          recipient_id?: string | null
          message: string
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string | null
          recipient_id?: string | null
          message?: string
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      content_reports: {
        Row: {
          id: string
          content_id: string
          reported_by: string
          reason: string
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content_id: string
          reported_by: string
          reason: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          reported_by?: string
          reason?: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      chat_reports: {
        Row: {
          id: string
          message_id: string
          reported_by: string
          reason: string
          description: string | null
          status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by: string | null
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          message_id: string
          reported_by: string
          reason: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          reported_by?: string
          reason?: string
          description?: string | null
          status?: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
          reviewed_by?: string | null
          admin_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
      }
      file_security_scans: {
        Row: {
          id: string
          content_id: string
          scan_status: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error'
          scan_results: any
          scanned_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          scan_status?: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error'
          scan_results?: any
          scanned_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          scan_status?: 'pending' | 'clean' | 'infected' | 'suspicious' | 'error'
          scan_results?: any
          scanned_at?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          username: string
          mobile_number: string
          full_name: string
          is_admin: boolean
          created_at: string
          updated_at: string
          avatar_url: string | null
          bio: string | null
          is_online: boolean
          last_seen: string
        }
        Insert: {
          id: string
          username: string
          mobile_number: string
          full_name: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          bio?: string | null
          is_online?: boolean
          last_seen?: string
        }
        Update: {
          id?: string
          username?: string
          mobile_number?: string
          full_name?: string
          is_admin?: boolean
          created_at?: string
          updated_at?: string
          avatar_url?: string | null
          bio?: string | null
          is_online?: boolean
          last_seen?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
      }
      content: {
        Row: {
          id: string
          title: string
          description: string | null
          content_type: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'other'
          category_id: string | null
          uploaded_by: string | null
          file_url: string | null
          file_size: number | null
          file_type: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | null
          external_url: string | null
          tags: string[]
          year: number | null
          semester: number | null
          is_approved: boolean
          view_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content_type: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'other'
          category_id?: string | null
          uploaded_by?: string | null
          file_url?: string | null
          file_size?: number | null
          file_type?: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | null
          external_url?: string | null
          tags?: string[]
          year?: number | null
          semester?: number | null
          is_approved?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content_type?: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'other'
          category_id?: string | null
          uploaded_by?: string | null
          file_url?: string | null
          file_size?: number | null
          file_type?: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png' | null
          external_url?: string | null
          tags?: string[]
          year?: number | null
          semester?: number | null
          is_approved?: boolean
          view_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      educational_links: {
        Row: {
          id: string
          title: string
          url: string
          description: string | null
          platform: string
          thumbnail_url: string | null
          category_id: string | null
          uploaded_by: string | null
          is_approved: boolean
          tags: string[]
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          url: string
          description?: string | null
          platform: string
          thumbnail_url?: string | null
          category_id?: string | null
          uploaded_by?: string | null
          is_approved?: boolean
          tags?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          url?: string
          description?: string | null
          platform?: string
          thumbnail_url?: string | null
          category_id?: string | null
          uploaded_by?: string | null
          is_approved?: boolean
          tags?: string[]
          created_at?: string
        }
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string | null
          message: string
          is_reported: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          message: string
          is_reported?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          message?: string
          is_reported?: boolean
          created_at?: string
        }
      }
      update_requests: {
        Row: {
          id: string
          user_id: string | null
          content_type: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments'
          content_id: string | null
          issue_description: string
          suggested_changes: string | null
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          reviewed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          content_type: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments'
          content_id?: string | null
          issue_description: string
          suggested_changes?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          content_type?: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments'
          content_id?: string | null
          issue_description?: string
          suggested_changes?: string | null
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          reviewed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      file_uploads: {
        Row: {
          id: string
          user_id: string | null
          original_filename: string
          stored_filename: string
          file_size: number
          file_type: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png'
          upload_path: string
          is_processed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          original_filename: string
          stored_filename: string
          file_size: number
          file_type: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png'
          upload_path: string
          is_processed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          original_filename?: string
          stored_filename?: string
          file_size?: number
          file_type?: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png'
          upload_path?: string
          is_processed?: boolean
          created_at?: string
        }
      }
      class_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          year: number
          section: string
          subject: string | null
          created_by: string
          is_active: boolean
          member_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          year: number
          section: string
          subject?: string | null
          created_by: string
          is_active?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          year?: number
          section?: string
          subject?: string | null
          created_by?: string
          is_active?: boolean
          member_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: 'admin' | 'member'
          joined_at: string
          is_active: boolean
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: 'admin' | 'member'
          joined_at?: string
          is_active?: boolean
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: 'admin' | 'member'
          joined_at?: string
          is_active?: boolean
        }
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          message: string
          message_type: 'text' | 'file' | 'link'
          file_url: string | null
          file_name: string | null
          file_size: number | null
          reply_to: string | null
          is_edited: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          message: string
          message_type?: 'text' | 'file' | 'link'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          reply_to?: string | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          message?: string
          message_type?: 'text' | 'file' | 'link'
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          reply_to?: string | null
          is_edited?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      group_files: {
        Row: {
          id: string
          group_id: string
          uploaded_by: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          uploaded_by: string
          file_name: string
          file_url: string
          file_size: number
          file_type: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          uploaded_by?: string
          file_name?: string
          file_url?: string
          file_size?: number
          file_type?: string
          description?: string | null
          created_at?: string
        }
      }
      group_announcements: {
        Row: {
          id: string
          group_id: string
          created_by: string
          title: string
          content: string
          is_important: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          group_id: string
          created_by: string
          title: string
          content: string
          is_important?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          created_by?: string
          title?: string
          content?: string
          is_important?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      group_message_reads: {
        Row: {
          id: string
          message_id: string
          user_id: string
          read_at: string
        }
        Insert: {
          id?: string
          message_id: string
          user_id: string
          read_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          user_id?: string
          read_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_old_chat_messages: {
        Args: Record<string, never>
        Returns: undefined
      }
      get_user_groups: {
        Args: {
          user_id: string
        }
        Returns: {
          group_id: string
          group_name: string
          group_description: string | null
          year: number
          section: string
          subject: string | null
          member_count: number
          user_role: string
          unread_count: number
        }[]
      }
    }
    Enums: {
      content_type: 'question_paper' | 'notes' | 'syllabus' | 'educational_link' | 'assignments' | 'other'
      request_status: 'pending' | 'approved' | 'rejected'
      file_type: 'pdf' | 'doc' | 'docx' | 'txt' | 'jpg' | 'png'
    }
  }
}