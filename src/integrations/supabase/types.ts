export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_accounts: {
        Row: {
          created_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      apps: {
        Row: {
          android_app_id: string | null
          apk_path: string | null
          approval_status: string
          banner_url: string | null
          category_id: string | null
          changelog: string | null
          created_at: string
          developer: string | null
          download_count: number
          file_size: number | null
          full_description: string | null
          icon_url: string | null
          id: string
          is_featured: boolean
          is_published: boolean
          kind: Database["public"]["Enums"]["app_kind"]
          min_android: string | null
          name: string
          open_count: number
          package_name: string | null
          release_date: string | null
          scan_status: string
          screenshots: string[]
          sha256: string | null
          short_description: string | null
          slug: string
          tags: string[]
          updated_at: string
          version_code: number | null
          version_name: string | null
          website_url: string | null
        }
        Insert: {
          android_app_id?: string | null
          apk_path?: string | null
          approval_status?: string
          banner_url?: string | null
          category_id?: string | null
          changelog?: string | null
          created_at?: string
          developer?: string | null
          download_count?: number
          file_size?: number | null
          full_description?: string | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          kind: Database["public"]["Enums"]["app_kind"]
          min_android?: string | null
          name: string
          open_count?: number
          package_name?: string | null
          release_date?: string | null
          scan_status?: string
          screenshots?: string[]
          sha256?: string | null
          short_description?: string | null
          slug: string
          tags?: string[]
          updated_at?: string
          version_code?: number | null
          version_name?: string | null
          website_url?: string | null
        }
        Update: {
          android_app_id?: string | null
          apk_path?: string | null
          approval_status?: string
          banner_url?: string | null
          category_id?: string | null
          changelog?: string | null
          created_at?: string
          developer?: string | null
          download_count?: number
          file_size?: number | null
          full_description?: string | null
          icon_url?: string | null
          id?: string
          is_featured?: boolean
          is_published?: boolean
          kind?: Database["public"]["Enums"]["app_kind"]
          min_android?: string | null
          name?: string
          open_count?: number
          package_name?: string | null
          release_date?: string | null
          scan_status?: string
          screenshots?: string[]
          sha256?: string | null
          short_description?: string | null
          slug?: string
          tags?: string[]
          updated_at?: string
          version_code?: number | null
          version_name?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apps_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          details: Json | null
          id: string
          target: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      downloads: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string | null
          version_name: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id?: string | null
          version_name?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
          version_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "downloads_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          app_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          app_id: string | null
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          title: string
          user_id: string
        }
        Insert: {
          app_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title: string
          user_id: string
        }
        Update: {
          app_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_blocked: boolean
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_blocked?: boolean
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
        }
        Relationships: []
      }
      reviews: {
        Row: {
          app_id: string
          author_name: string | null
          body: string | null
          created_at: string
          id: string
          is_hidden: boolean
          rating: number
          user_id: string
        }
        Insert: {
          app_id: string
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating: number
          user_id: string
        }
        Update: {
          app_id?: string
          author_name?: string | null
          body?: string | null
          created_at?: string
          id?: string
          is_hidden?: boolean
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          id: number
          maintenance_mode: boolean
          owner_name: string | null
          primary_color: string | null
          site_name: string
          support_email: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          maintenance_mode?: boolean
          owner_name?: string | null
          primary_color?: string | null
          site_name?: string
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          maintenance_mode?: boolean
          owner_name?: string | null
          primary_color?: string | null
          site_name?: string
          support_email?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      website_opens: {
        Row: {
          app_id: string
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          app_id: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          app_id?: string
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "website_opens_app_id_fkey"
            columns: ["app_id"]
            isOneToOne: false
            referencedRelation: "apps"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_kind: "website" | "apk"
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_kind: ["website", "apk"],
      app_role: ["admin", "user"],
    },
  },
} as const
