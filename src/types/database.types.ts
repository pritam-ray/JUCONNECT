export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name: string
          mobile_number: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          mobile_number?: string
          avatar_url?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          id: string
          user_id: string | null
          message: string
          is_reported: boolean
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
