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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      companies: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          name: string
          number: number
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name: string
          number: number
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          number?: number
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergencies: {
        Row: {
          address: string
          caller_name: string | null
          caller_phone: string | null
          controlled_at: string | null
          created_at: string
          created_by: string | null
          dispatched_at: string | null
          emergency_key_id: string
          en_route_at: string | null
          finished_at: string | null
          folio: string
          id: string
          latitude: number | null
          longitude: number | null
          observations: string | null
          pre_report: string | null
          reference: string | null
          status: Database["public"]["Enums"]["emergency_status"]
          updated_at: string
          working_at: string | null
        }
        Insert: {
          address: string
          caller_name?: string | null
          caller_phone?: string | null
          controlled_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          emergency_key_id: string
          en_route_at?: string | null
          finished_at?: string | null
          folio: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          pre_report?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["emergency_status"]
          updated_at?: string
          working_at?: string | null
        }
        Update: {
          address?: string
          caller_name?: string | null
          caller_phone?: string | null
          controlled_at?: string | null
          created_at?: string
          created_by?: string | null
          dispatched_at?: string | null
          emergency_key_id?: string
          en_route_at?: string | null
          finished_at?: string | null
          folio?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          pre_report?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["emergency_status"]
          updated_at?: string
          working_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergencies_emergency_key_id_fkey"
            columns: ["emergency_key_id"]
            isOneToOne: false
            referencedRelation: "emergency_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_keys: {
        Row: {
          active: boolean
          code: string
          color: string
          created_at: string
          id: string
          name: string
          sort_order: number
          tone_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          color?: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
          tone_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          color?: string
          created_at?: string
          id?: string
          name?: string
          sort_order?: number
          tone_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      emergency_log: {
        Row: {
          created_at: string
          created_by: string | null
          emergency_id: string
          id: string
          message: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emergency_id: string
          id?: string
          message: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emergency_id?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_log_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_personnel: {
        Row: {
          assigned_at: string
          emergency_id: string
          emergency_vehicle_id: string | null
          id: string
          role: string | null
          volunteer_id: string
        }
        Insert: {
          assigned_at?: string
          emergency_id: string
          emergency_vehicle_id?: string | null
          id?: string
          role?: string | null
          volunteer_id: string
        }
        Update: {
          assigned_at?: string
          emergency_id?: string
          emergency_vehicle_id?: string | null
          id?: string
          role?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_personnel_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_personnel_emergency_vehicle_id_fkey"
            columns: ["emergency_vehicle_id"]
            isOneToOne: false
            referencedRelation: "emergency_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_personnel_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_vehicles: {
        Row: {
          assigned_at: string
          emergency_id: string
          id: string
          odometer_end: number | null
          odometer_start: number | null
          released_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          emergency_id: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          released_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          emergency_id?: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          released_at?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_vehicles_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_vehicles_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          condition: string | null
          created_at: string
          id: string
          last_check: string | null
          name: string
          notes: string | null
          quantity: number
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          condition?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          name: string
          notes?: string | null
          quantity?: number
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          condition?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          name?: string
          notes?: string | null
          quantity?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      hydrants: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          latitude: number
          longitude: number
          name: string | null
          type: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          latitude: number
          longitude: number
          name?: string | null
          type?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string | null
          type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ranks: {
        Row: {
          created_at: string
          id: string
          level: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      training: {
        Row: {
          certification: string | null
          course_name: string
          created_at: string
          date_completed: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          volunteer_id: string
        }
        Insert: {
          certification?: string | null
          course_name: string
          created_at?: string
          date_completed?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          volunteer_id: string
        }
        Update: {
          certification?: string | null
          course_name?: string
          created_at?: string
          date_completed?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
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
      vehicles: {
        Row: {
          capacity: number
          code: string
          company_id: string | null
          created_at: string
          id: string
          plate: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          capacity?: number
          code: string
          company_id?: string | null
          created_at?: string
          id?: string
          plate?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          capacity?: number
          code?: string
          company_id?: string | null
          created_at?: string
          id?: string
          plate?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type?: string
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          available: boolean
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          rank_id: string | null
          rut: string | null
          specialties: string[] | null
          status: Database["public"]["Enums"]["volunteer_status"]
          updated_at: string
        }
        Insert: {
          available?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          rank_id?: string | null
          rut?: string | null
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
        }
        Update: {
          available?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          rank_id?: string | null
          rut?: string | null
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteers_rank_id_fkey"
            columns: ["rank_id"]
            isOneToOne: false
            referencedRelation: "ranks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador" | "oficial" | "visor"
      emergency_status:
        | "despacho"
        | "en_ruta"
        | "en_trabajo"
        | "controlada"
        | "finalizada"
      vehicle_status:
        | "disponible"
        | "en_servicio"
        | "mantencion"
        | "fuera_servicio"
      volunteer_status: "activo" | "inactivo" | "licencia"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "operador", "oficial", "visor"],
      emergency_status: [
        "despacho",
        "en_ruta",
        "en_trabajo",
        "controlada",
        "finalizada",
      ],
      vehicle_status: [
        "disponible",
        "en_servicio",
        "mantencion",
        "fuera_servicio",
      ],
      volunteer_status: ["activo", "inactivo", "licencia"],
    },
  },
} as const
