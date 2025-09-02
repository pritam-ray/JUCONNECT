export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'admin' | 'super_admin'
export type ContentType = 'notes' | 'question_paper' | 'syllabus' | 'assignments' | 'educational_link' | 'other'
export type FileType = 'pdf' | 'image' | 'document' | 'video' | 'audio' | 'other'
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed'
export type RequestStatus = 'pending' | 'approved' | 'rejected'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          mobile_number: string
          avatar_url: string | null
          role: UserRole
          is_verified: boolean
          is_admin: boolean
          is_online: boolean
          last_seen: string
          bio: string | null
          year: number | null
          section: string | null
          course: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          mobile_number: string
          avatar_url?: string | null
          role?: UserRole
          is_verified?: boolean
          is_online?: boolean
          last_seen?: string
          bio?: string | null
          year?: number | null
          section?: string | null
          course?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          mobile_number?: string
          avatar_url?: string | null
          role?: UserRole
          is_verified?: boolean
          is_online?: boolean
          last_seen?: string
          bio?: string | null
          year?: number | null
          section?: string | null
          course?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          icon: string | null
          color: string
          parent_id: string | null
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          icon?: string | null
          color?: string
          parent_id?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          icon?: string | null
          color?: string
          parent_id?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          }
        ]
      }
      content: {
        Row: {
          id: string
          title: string
          description: string | null
          content_type: ContentType
          category_id: string | null
          uploaded_by: string | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          external_url: string | null
          tags: string[] | null
          year: number | null
          semester: number | null
          view_count: number
          download_count: number
          is_approved: boolean
          is_featured: boolean
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content_type: ContentType
          category_id?: string | null
          uploaded_by?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          external_url?: string | null
          tags?: string[] | null
          year?: number | null
          semester?: number | null
          view_count?: number
          download_count?: number
          is_approved?: boolean
          is_featured?: boolean
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content_type?: ContentType
          category_id?: string | null
          uploaded_by?: string | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          external_url?: string | null
          tags?: string[] | null
          year?: number | null
          semester?: number | null
          view_count?: number
          download_count?: number
          is_approved?: boolean
          is_featured?: boolean
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_approved_by_fkey"
            columns: ["approved_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      class_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          year: number
          section: string
          subject: string | null
          semester: string
          is_private: boolean
          password_hash: string | null
          is_password_protected: boolean
          max_members: number
          member_count: number
          creator_id: string
          is_active: boolean
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
          semester?: string
          is_private?: boolean
          password_hash?: string | null
          max_members?: number
          member_count?: number
          creator_id: string
          is_active?: boolean
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
          semester?: string
          is_private?: boolean
          password_hash?: string | null
          max_members?: number
          member_count?: number
          creator_id?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_creator_id_fkey"
            columns: ["creator_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_members: {
        Row: {
          id: string
          group_id: string
          user_id: string
          role: string
          is_active: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          is_active?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
          is_active?: boolean
          joined_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          message: string
          message_type: string
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: string | null
          reply_to: string | null
          is_announcement: boolean
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          message: string
          message_type?: string
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          reply_to?: string | null
          is_announcement?: boolean
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          message?: string
          message_type?: string
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: string | null
          reply_to?: string | null
          is_announcement?: boolean
          is_pinned?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_messages_reply_to_fkey"
            columns: ["reply_to"]
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string | null
          message: string
          file_url: string | null
          file_name: string | null
          reply_to: string | null
          is_edited: boolean
          is_reported: boolean
          is_flagged: boolean
          edited_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          message: string
          file_url?: string | null
          file_name?: string | null
          reply_to?: string | null
          is_edited?: boolean
          is_reported?: boolean
          is_flagged?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          message?: string
          file_url?: string | null
          file_name?: string | null
          reply_to?: string | null
          is_edited?: boolean
          is_reported?: boolean
          is_flagged?: boolean
          edited_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_fkey"
            columns: ["reply_to"]
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          }
        ]
      }
      private_messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          message: string
          file_url: string | null
          file_name: string | null
          is_read: boolean
          is_deleted_by_sender: boolean
          is_deleted_by_recipient: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          message: string
          file_url?: string | null
          file_name?: string | null
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          message?: string
          file_url?: string | null
          file_name?: string | null
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_messages_sender_id_fkey"
            columns: ["sender_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "private_messages_recipient_id_fkey"
            columns: ["recipient_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      file_uploads: {
        Row: {
          id: string
          user_id: string
          original_filename: string
          stored_filename: string
          file_size: number
          file_type: string
          upload_path: string
          content_id: string | null
          group_id: string | null
          upload_purpose: string
          is_processed: boolean
          processing_error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_filename: string
          stored_filename: string
          file_size: number
          file_type: string
          upload_path: string
          content_id?: string | null
          group_id?: string | null
          upload_purpose?: string
          is_processed?: boolean
          processing_error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_filename?: string
          stored_filename?: string
          file_size?: number
          file_type?: string
          upload_path?: string
          content_id?: string | null
          group_id?: string | null
          upload_purpose?: string
          is_processed?: boolean
          processing_error?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_uploads_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          }
        ]
      }
      update_requests: {
        Row: {
          id: string
          user_id: string
          content_id: string | null
          content_type: ContentType
          title: string | null
          description: string | null
          issue_description: string
          suggested_changes: string | null
          status: RequestStatus
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id?: string | null
          content_type?: ContentType
          title?: string | null
          description?: string | null
          issue_description: string
          suggested_changes?: string | null
          status?: RequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string | null
          content_type?: ContentType
          title?: string | null
          description?: string | null
          issue_description?: string
          suggested_changes?: string | null
          status?: RequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_requests_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_requests_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      content_reports: {
        Row: {
          id: string
          content_id: string
          reporter_id: string
          reason: string
          description: string | null
          status: ReportStatus
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          reporter_id: string
          reason: string
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          reporter_id?: string
          reason?: string
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_content_id_fkey"
            columns: ["content_id"]
            referencedRelation: "content"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      chat_reports: {
        Row: {
          id: string
          message_id: string
          reporter_id: string
          reason: string
          description: string | null
          status: ReportStatus
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          reporter_id: string
          reason: string
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          reporter_id?: string
          reason?: string
          description?: string | null
          status?: ReportStatus
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reports_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      user_blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      educational_links: {
        Row: {
          id: string
          title: string
          url: string
          description: string | null
          category_id: string | null
          added_by: string
          is_verified: boolean
          click_count: number
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          url: string
          description?: string | null
          category_id?: string | null
          added_by: string
          is_verified?: boolean
          click_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          url?: string
          description?: string | null
          category_id?: string | null
          added_by?: string
          is_verified?: boolean
          click_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "educational_links_category_id_fkey"
            columns: ["category_id"]
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "educational_links_added_by_fkey"
            columns: ["added_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      file_security_scans: {
        Row: {
          id: string
          file_upload_id: string
          scan_status: string
          scan_details: Json | null
          scanned_at: string
        }
        Insert: {
          id?: string
          file_upload_id: string
          scan_status?: string
          scan_details?: Json | null
          scanned_at?: string
        }
        Update: {
          id?: string
          file_upload_id?: string
          scan_status?: string
          scan_details?: Json | null
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_security_scans_file_upload_id_fkey"
            columns: ["file_upload_id"]
            referencedRelation: "file_uploads"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      popular_content: {
        Row: {
          id: string | null
          title: string | null
          description: string | null
          content_type: ContentType | null
          category_id: string | null
          author_id: string | null
          tags: string[] | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: FileType | null
          download_count: number | null
          is_approved: boolean | null
          is_featured: boolean | null
          approved_by: string | null
          approved_at: string | null
          created_at: string | null
          updated_at: string | null
          category_name: string | null
          author_name: string | null
          author_username: string | null
        }
        Insert: {
          id?: string | null
          title?: string | null
          description?: string | null
          content_type?: ContentType | null
          category_id?: string | null
          author_id?: string | null
          tags?: string[] | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: FileType | null
          download_count?: number | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_name?: string | null
          author_name?: string | null
          author_username?: string | null
        }
        Update: {
          id?: string | null
          title?: string | null
          description?: string | null
          content_type?: ContentType | null
          category_id?: string | null
          author_id?: string | null
          tags?: string[] | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: FileType | null
          download_count?: number | null
          is_approved?: boolean | null
          is_featured?: boolean | null
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string | null
          updated_at?: string | null
          category_name?: string | null
          author_name?: string | null
          author_username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      setup_sample_groups: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_sample_content: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_sample_links: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      post_welcome_message: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      make_user_admin: {
        Args: {
          user_id: string
        }
        Returns: boolean
      }
      is_group_admin: {
        Args: {
          group_id_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      promote_to_admin: {
        Args: {
          group_id_param: string
          target_user_id_param: string
          requesting_user_id_param: string
        }
        Returns: Json
      }
      demote_admin: {
        Args: {
          group_id_param: string
          target_user_id_param: string
          requesting_user_id_param: string
        }
        Returns: Json
      }
      remove_group_member: {
        Args: {
          group_id_param: string
          target_user_id_param: string
          requesting_user_id_param: string
        }
        Returns: Json
      }
      update_group_details: {
        Args: {
          group_id_param: string
          new_name?: string
          new_description?: string
          requesting_user_id_param?: string
        }
        Returns: Json
      }
      delete_group: {
        Args: {
          group_id_param: string
          requesting_user_id_param: string
        }
        Returns: Json
      }
      verify_group_password: {
        Args: {
          group_id_param: string
          password_param: string
        }
        Returns: boolean
      }
      set_group_password: {
        Args: {
          group_id_param: string
          password_param: string
          user_id_param: string
        }
        Returns: boolean
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_activity_type: string
          p_activity_data?: Json
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_error: {
        Args: {
          p_user_id?: string
          p_error_type?: string
          p_error_message?: string
          p_error_stack?: string
          p_context?: Json
          p_severity?: string
        }
        Returns: string
      }
      update_user_engagement: {
        Args: {
          p_user_id: string
          p_page_views?: number
          p_messages_sent?: number
          p_files_uploaded?: number
          p_files_downloaded?: number
          p_groups_joined?: number
          p_session_duration?: number
        }
        Returns: undefined
      }
      increment_view_count: {
        Args: {
          content_id: string
        }
        Returns: undefined
      }
      increment_download_count: {
        Args: {
          content_id: string
        }
        Returns: undefined
      }
      update_user_online_status: {
        Args: {
          user_id: string
          is_online: boolean
        }
        Returns: undefined
      }
      get_content_stats: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_user_engagement_stats: {
        Args: {
          user_id_param: string
        }
        Returns: Json
      }
      cleanup_old_messages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      cleanup_old_files: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      user_role: UserRole
      content_type: ContentType
      file_type: FileType
      report_status: ReportStatus
      request_status: RequestStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}