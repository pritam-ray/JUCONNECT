export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type UserRole = 'student' | 'admin' | 'super_admin'
export type ContentType = 'notes' | 'previous_papers' | 'assignments' | 'study_materials' | 'other'
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
          is_active?: boolean
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          id: string
          title: string
          description: string | null
          content_type: ContentType
          category_id: string | null
          author_id: string | null
          tags: string[] | null
          file_url: string | null
          file_name: string | null
          file_size: number | null
          file_type: FileType | null
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
          author_id?: string | null
          tags?: string[] | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: FileType | null
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
          author_id?: string | null
          tags?: string[] | null
          file_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_type?: FileType | null
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
            foreignKeyName: "content_author_id_fkey"
            columns: ["author_id"]
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
      class_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          year: number
          section: string
          subject: string | null
          password_hash: string | null
          is_public: boolean
          max_members: number
          member_count: number
          created_by: string
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
          password_hash?: string | null
          is_public?: boolean
          max_members?: number
          member_count?: number
          created_by: string
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
          password_hash?: string | null
          is_public?: boolean
          max_members?: number
          member_count?: number
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_groups_created_by_fkey"
            columns: ["created_by"]
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
          joined_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          role?: string
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
          file_url: string | null
          file_name: string | null
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
          file_url?: string | null
          file_name?: string | null
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
          file_url?: string | null
          file_name?: string | null
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
        Relationships: [
          {
            foreignKeyName: "group_message_reads_message_id_fkey"
            columns: ["message_id"]
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_message_reads_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      group_files: {
        Row: {
          id: string
          group_id: string
          uploaded_by: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: FileType | null
          description: string | null
          download_count: number
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          uploaded_by: string
          file_name: string
          file_url: string
          file_size?: number | null
          file_type?: FileType | null
          description?: string | null
          download_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          uploaded_by?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          file_type?: FileType | null
          description?: string | null
          download_count?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_files_group_id_fkey"
            columns: ["group_id"]
            referencedRelation: "class_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      update_requests: {
        Row: {
          id: string
          user_id: string
          content_id: string | null
          title: string | null
          description: string | null
          requested_changes: string
          status: RequestStatus
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content_id?: string | null
          title?: string | null
          description?: string | null
          requested_changes: string
          status?: RequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content_id?: string | null
          title?: string | null
          description?: string | null
          requested_changes?: string
          status?: RequestStatus
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
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
      file_uploads: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string
          file_size: number | null
          file_type: FileType | null
          upload_purpose: string | null
          related_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_url: string
          file_size?: number | null
          file_type?: FileType | null
          upload_purpose?: string | null
          related_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_url?: string
          file_size?: number | null
          file_type?: FileType | null
          upload_purpose?: string | null
          related_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
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
      approve_content: {
        Args: {
          content_id: string
        }
        Returns: boolean
      }
      reject_content: {
        Args: {
          content_id: string
        }
        Returns: boolean
      }
      get_secure_download_url: {
        Args: {
          file_path: string
        }
        Returns: string
      }
      refresh_popular_content: {
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
          is_flagged: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          message: string
          is_reported?: boolean
          is_flagged?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          message?: string
          is_reported?: boolean
          is_flagged?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
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
          is_read: boolean
          is_deleted_by_sender: boolean
          is_deleted_by_recipient: boolean
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          message: string
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          message?: string
          is_read?: boolean
          is_deleted_by_sender?: boolean
          is_deleted_by_recipient?: boolean
          created_at?: string
        }
        Relationships: []
      }
      class_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          subject: string
          year: number
          section: string
          semester: string
          is_private: boolean
          password_hash: string | null
          max_members: number | null
          creator_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          subject: string
          year: number
          section: string
          semester: string
          is_private?: boolean
          password_hash?: string | null
          max_members?: number | null
          creator_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          subject?: string
          year?: number
          section?: string
          semester?: string
          is_private?: boolean
          password_hash?: string | null
          max_members?: number | null
          creator_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      group_messages: {
        Row: {
          id: string
          group_id: string
          user_id: string
          message: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          message: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          message?: string
          created_at?: string
        }
        Relationships: []
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
        Relationships: []
      }
      group_files: {
        Row: {
          id: string
          group_id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          created_at?: string
        }
        Relationships: []
      }
      group_announcements: {
        Row: {
          id: string
          group_id: string
          user_id: string
          title: string
          content: string
          is_pinned: boolean
          created_at: string
        }
        Insert: {
          id?: string
          group_id: string
          user_id: string
          title: string
          content: string
          is_pinned?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          group_id?: string
          user_id?: string
          title?: string
          content?: string
          is_pinned?: boolean
          created_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          color?: string | null
          created_at?: string
        }
        Relationships: []
      }
      content: {
        Row: {
          id: string
          title: string
          description: string | null
          content_type: string
          category_id: string | null
          file_path: string | null
          file_size: number | null
          uploader_id: string | null
          is_approved: boolean
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          content_type: string
          category_id?: string | null
          file_path?: string | null
          file_size?: number | null
          uploader_id?: string | null
          is_approved?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          content_type?: string
          category_id?: string | null
          file_path?: string | null
          file_size?: number | null
          uploader_id?: string | null
          is_approved?: boolean
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_reports: {
        Row: {
          id: string
          message_id: string
          reporter_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          reporter_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          reporter_id?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      content_reports: {
        Row: {
          id: string
          content_id: string
          reporter_id: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          content_id: string
          reporter_id: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          content_id?: string
          reporter_id?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          id: string
          user_id: string | null
          activity_type: string
          activity_data: Json
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          activity_type: string
          activity_data?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          activity_type?: string
          activity_data?: Json
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: []
      }
      error_logs: {
        Row: {
          id: string
          user_id: string | null
          error_type: string
          error_message: string
          error_stack: string | null
          context: Json
          severity: string
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          error_type: string
          error_message: string
          error_stack?: string | null
          context?: Json
          severity?: string
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          error_type?: string
          error_message?: string
          error_stack?: string | null
          context?: Json
          severity?: string
          resolved?: boolean
          created_at?: string
        }
        Relationships: []
      }
      cleanup_logs: {
        Row: {
          id: string
          cleanup_type: string
          records_affected: number
          status: string
          error_message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          cleanup_type: string
          records_affected?: number
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          cleanup_type?: string
          records_affected?: number
          status?: string
          error_message?: string | null
          created_at?: string
        }
        Relationships: []
      }
      user_engagement_metrics: {
        Row: {
          id: string
          user_id: string
          total_uploads: number
          total_downloads: number
          total_messages: number
          total_groups_joined: number
          last_activity: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_uploads?: number
          total_downloads?: number
          total_messages?: number
          total_groups_joined?: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_uploads?: number
          total_downloads?: number
          total_messages?: number
          total_groups_joined?: number
          last_activity?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
