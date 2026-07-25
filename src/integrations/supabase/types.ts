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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          active: boolean
          address: string | null
          created_at: string
          id: string
          logo_url: string | null
          name: string
          number: number
          organization_id: string
          phone: string | null
          tone_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          number: number
          organization_id: string
          phone?: string | null
          tone_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          number?: number
          organization_id?: string
          phone?: string | null
          tone_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_settings: {
        Row: {
          duration_days: number
          enabled: boolean
          id: string
          max_emergencies: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          duration_days?: number
          enabled?: boolean
          id?: string
          max_emergencies?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          duration_days?: number
          enabled?: boolean
          id?: string
          max_emergencies?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          organization_id: string
          platform: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          organization_id: string
          platform?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          organization_id?: string
          platform?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_notes: {
        Row: {
          active: boolean
          content: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      emergencies: {
        Row: {
          address: string
          ambulance_requested: boolean
          caller_name: string | null
          caller_phone: string | null
          carabineros_requested: boolean
          controlled_at: string | null
          created_at: string
          created_by: string | null
          declared: boolean
          declared_at: string | null
          dispatched_at: string | null
          emergency_key_id: string
          en_route_at: string | null
          external_support: boolean
          false_alarm: boolean
          finished_at: string | null
          folio: string
          id: string
          in_quarters_at: string | null
          latitude: number | null
          longitude: number | null
          observations: string | null
          organization_id: string
          pre_report: string | null
          reference: string | null
          status: Database["public"]["Enums"]["emergency_status"]
          updated_at: string
          working_at: string | null
        }
        Insert: {
          address: string
          ambulance_requested?: boolean
          caller_name?: string | null
          caller_phone?: string | null
          carabineros_requested?: boolean
          controlled_at?: string | null
          created_at?: string
          created_by?: string | null
          declared?: boolean
          declared_at?: string | null
          dispatched_at?: string | null
          emergency_key_id: string
          en_route_at?: string | null
          external_support?: boolean
          false_alarm?: boolean
          finished_at?: string | null
          folio: string
          id?: string
          in_quarters_at?: string | null
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          organization_id: string
          pre_report?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["emergency_status"]
          updated_at?: string
          working_at?: string | null
        }
        Update: {
          address?: string
          ambulance_requested?: boolean
          caller_name?: string | null
          caller_phone?: string | null
          carabineros_requested?: boolean
          controlled_at?: string | null
          created_at?: string
          created_by?: string | null
          declared?: boolean
          declared_at?: string | null
          dispatched_at?: string | null
          emergency_key_id?: string
          en_route_at?: string | null
          external_support?: boolean
          false_alarm?: boolean
          finished_at?: string | null
          folio?: string
          id?: string
          in_quarters_at?: string | null
          latitude?: number | null
          longitude?: number | null
          observations?: string | null
          organization_id?: string
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
          {
            foreignKeyName: "emergencies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_attendance: {
        Row: {
          confirmed_at: string
          created_at: string
          emergency_id: string
          id: string
          organization_id: string
          status: string
          updated_at: string
          user_id: string
          volunteer_id: string | null
        }
        Insert: {
          confirmed_at?: string
          created_at?: string
          emergency_id: string
          id?: string
          organization_id: string
          status?: string
          updated_at?: string
          user_id: string
          volunteer_id?: string | null
        }
        Update: {
          confirmed_at?: string
          created_at?: string
          emergency_id?: string
          id?: string
          organization_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "emergency_attendance_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_attendance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_attendance_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          sort_order?: number
          tone_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_log: {
        Row: {
          created_at: string
          created_by: string | null
          emergency_id: string
          id: string
          message: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emergency_id: string
          id?: string
          message: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emergency_id?: string
          id?: string
          message?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_log_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
          role: string | null
          volunteer_id: string
        }
        Insert: {
          assigned_at?: string
          emergency_id: string
          emergency_vehicle_id?: string | null
          id?: string
          organization_id: string
          role?: string | null
          volunteer_id: string
        }
        Update: {
          assigned_at?: string
          emergency_id?: string
          emergency_vehicle_id?: string | null
          id?: string
          organization_id?: string
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
            foreignKeyName: "emergency_personnel_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
          released_at: string | null
          vehicle_id: string
        }
        Insert: {
          assigned_at?: string
          emergency_id: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id: string
          released_at?: string | null
          vehicle_id: string
        }
        Update: {
          assigned_at?: string
          emergency_id?: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          organization_id?: string
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
            foreignKeyName: "emergency_vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          quantity?: number
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hydrants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          city: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string | null
          source: string | null
          station_size: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name?: string | null
          source?: string | null
          station_size?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string | null
          source?: string | null
          station_size?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          created_at: string
          device_token: string
          emergency_id: string
          error_message: string | null
          id: string
          opened_at: string | null
          organization_id: string
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_token: string
          emergency_id: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          organization_id: string
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_token?: string
          emergency_id?: string
          error_message?: string | null
          id?: string
          opened_at?: string | null
          organization_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_log_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          last_sent_at: string | null
          organization_id: string
          resend_count: number
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["invitation_status"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          organization_id: string
          resend_count?: number
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          last_sent_at?: string | null
          organization_id?: string
          resend_count?: number
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["invitation_status"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invitations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["org_member_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["org_member_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_requests: {
        Row: {
          applicant_email: string
          applicant_name: string
          commune: string | null
          created_at: string
          id: string
          message: string | null
          organization_name: string
          phone: string | null
          region: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          user_id: string | null
        }
        Insert: {
          applicant_email: string
          applicant_name: string
          commune?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_name: string
          phone?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string | null
        }
        Update: {
          applicant_email?: string
          applicant_name?: string
          commune?: string | null
          created_at?: string
          id?: string
          message?: string | null
          organization_name?: string
          phone?: string | null
          region?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          address: string | null
          approved_by: string | null
          commune: string | null
          country: string | null
          created_at: string
          created_by: string | null
          demo_expires_at: string | null
          id: string
          institution_email: string | null
          is_demo: boolean
          logo_url: string | null
          name: string
          phone: string | null
          plan: string | null
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_by?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          demo_expires_at?: string | null
          id?: string
          institution_email?: string | null
          is_demo?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string | null
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_by?: string | null
          commune?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          demo_expires_at?: string | null
          id?: string
          institution_email?: string | null
          is_demo?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string | null
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
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
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: number
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: number
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ranks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_hydrants: {
        Row: {
          active: boolean
          anio: number | null
          created_at: string
          diam_grifo: number | null
          diam_tub: number | null
          grifo_id: number | null
          id: string
          latitude: number
          longitude: number
          modelo: string | null
          ubicacion: string | null
        }
        Insert: {
          active?: boolean
          anio?: number | null
          created_at?: string
          diam_grifo?: number | null
          diam_tub?: number | null
          grifo_id?: number | null
          id?: string
          latitude: number
          longitude: number
          modelo?: string | null
          ubicacion?: string | null
        }
        Update: {
          active?: boolean
          anio?: number | null
          created_at?: string
          diam_grifo?: number | null
          diam_tub?: number | null
          grifo_id?: number | null
          id?: string
          latitude?: number
          longitude?: number
          modelo?: string | null
          ubicacion?: string | null
        }
        Relationships: []
      }
      superadmins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_sounds: {
        Row: {
          created_at: string
          id: string
          label: string
          organization_id: string
          sound_key: string
          sound_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          organization_id: string
          sound_key: string
          sound_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          organization_id?: string
          sound_key?: string
          sound_url?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_sounds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          organization_id: string
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
          organization_id: string
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
          organization_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
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
          odometer: number | null
          organization_id: string
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
          odometer?: number | null
          organization_id: string
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
          odometer?: number | null
          organization_id?: string
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
          {
            foreignKeyName: "vehicles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          invitation_sent_at: string | null
          name: string
          organization_id: string
          phone: string | null
          pwa_enabled: boolean
          rank_id: string | null
          rut: string | null
          specialties: string[] | null
          status: Database["public"]["Enums"]["volunteer_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          available?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          name: string
          organization_id: string
          phone?: string | null
          pwa_enabled?: boolean
          rank_id?: string | null
          rut?: string | null
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          available?: boolean
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          name?: string
          organization_id?: string
          phone?: string | null
          pwa_enabled?: boolean
          rank_id?: string | null
          rut?: string | null
          specialties?: string[] | null
          status?: Database["public"]["Enums"]["volunteer_status"]
          updated_at?: string
          user_id?: string | null
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
            foreignKeyName: "volunteers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
      accept_invitation: { Args: { _token: string }; Returns: Json }
      can_write_in_org: { Args: { _org_id: string }; Returns: boolean }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      demo_emergency_count: { Args: { _org_id: string }; Returns: number }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_invitation_preview: { Args: { _token: string }; Returns: Json }
      get_my_organization_ids: { Args: never; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_org_role: {
        Args: {
          _org_id: string
          _role: Database["public"]["Enums"]["org_role"]
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_audit_log: {
        Args: {
          _action: string
          _new_data?: Json
          _old_data?: Json
          _organization_id: string
          _record_id?: string
          _table_name?: string
        }
        Returns: string
      }
      is_company_admin: {
        Args: { _company_id: string; _org_id: string }
        Returns: boolean
      }
      is_demo_org_active: { Args: { _org_id: string }; Returns: boolean }
      is_org_admin_of_user: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      is_org_member: { Args: { _org_id: string }; Returns: boolean }
      is_org_volunteer: { Args: { _org_id: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
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
        | "en_cuartel"
      invitation_status: "pending" | "accepted" | "expired" | "cancelled"
      org_member_status: "active" | "invited" | "suspended"
      org_role: "admin" | "operador" | "oficial" | "visor" | "voluntario"
      org_status: "pending" | "active" | "suspended" | "rejected"
      request_status: "pending" | "approved" | "rejected"
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
        "en_cuartel",
      ],
      invitation_status: ["pending", "accepted", "expired", "cancelled"],
      org_member_status: ["active", "invited", "suspended"],
      org_role: ["admin", "operador", "oficial", "visor", "voluntario"],
      org_status: ["pending", "active", "suspended", "rejected"],
      request_status: ["pending", "approved", "rejected"],
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
