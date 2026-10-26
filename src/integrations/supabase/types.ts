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
          latitude: number | null
          logo_url: string | null
          longitude: number | null
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
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
      company_guard_rules: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          id: string
          minimum: number
          mode: string
          organization_id: string
          required_specialties: string[]
          role_name: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          id?: string
          minimum: number
          mode: string
          organization_id: string
          required_specialties?: string[]
          role_name: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          id?: string
          minimum?: number
          mode?: string
          organization_id?: string
          required_specialties?: string[]
          role_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_guard_rules_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "company_guard_rules_organization_id_fkey"
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
          location_shared_latitude: number | null
          location_shared_longitude: number | null
          location_source: string | null
          location_source_updated_at: string | null
          location_source_updated_by: string | null
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
          location_shared_latitude?: number | null
          location_shared_longitude?: number | null
          location_source?: string | null
          location_source_updated_at?: string | null
          location_source_updated_by?: string | null
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
          location_shared_latitude?: number | null
          location_shared_longitude?: number | null
          location_source?: string | null
          location_source_updated_at?: string | null
          location_source_updated_by?: string | null
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
          controlled_at: string | null
          emergency_id: string
          id: string
          odometer_end: number | null
          odometer_start: number | null
          on_scene_at: string | null
          operational_status: string
          organization_id: string
          released_at: string | null
          status_updated_at: string
          vehicle_id: string
          volunteer_count: number
          withdrawing_at: string | null
        }
        Insert: {
          assigned_at?: string
          controlled_at?: string | null
          emergency_id: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          on_scene_at?: string | null
          operational_status?: string
          organization_id: string
          released_at?: string | null
          status_updated_at?: string
          vehicle_id: string
          volunteer_count?: number
          withdrawing_at?: string | null
        }
        Update: {
          assigned_at?: string
          controlled_at?: string | null
          emergency_id?: string
          id?: string
          odometer_end?: number | null
          odometer_start?: number | null
          on_scene_at?: string | null
          operational_status?: string
          organization_id?: string
          released_at?: string | null
          status_updated_at?: string
          vehicle_id?: string
          volunteer_count?: number
          withdrawing_at?: string | null
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
          assigned_at: string | null
          assigned_volunteer_id: string | null
          condition: string | null
          created_at: string
          id: string
          last_check: string | null
          name: string
          notes: string | null
          organization_id: string
          quantity: number
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_volunteer_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          name: string
          notes?: string | null
          organization_id: string
          quantity?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_volunteer_id?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          last_check?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          quantity?: number
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assigned_volunteer_id_fkey"
            columns: ["assigned_volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
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
      guard_applications: {
        Row: {
          company_id: string
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          organization_id: string
          reason: string | null
          shift_id: string
          slot_id: string
          status: string
          volunteer_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          shift_id: string
          slot_id: string
          status?: string
          volunteer_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          shift_id?: string
          slot_id?: string
          status?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_applications_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_applications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_applications_slot_id_shift_id_organization_id_compan_fkey"
            columns: ["slot_id", "shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_slots"
            referencedColumns: [
              "id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
          },
          {
            foreignKeyName: "guard_applications_volunteer_id_organization_id_fkey"
            columns: ["volunteer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guard_assignments: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          decided_at: string | null
          ends_at: string
          id: string
          organization_id: string
          reason: string | null
          shift_id: string
          slot_id: string
          starts_at: string
          status: string
          volunteer_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          decided_at?: string | null
          ends_at: string
          id?: string
          organization_id: string
          reason?: string | null
          shift_id: string
          slot_id: string
          starts_at: string
          status?: string
          volunteer_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          ends_at?: string
          id?: string
          organization_id?: string
          reason?: string | null
          shift_id?: string
          slot_id?: string
          starts_at?: string
          status?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_assignments_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_assignments_slot_id_shift_id_organization_id_company_fkey"
            columns: ["slot_id", "shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_slots"
            referencedColumns: [
              "id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
          },
          {
            foreignKeyName: "guard_assignments_volunteer_id_organization_id_fkey"
            columns: ["volunteer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guard_attendance_events: {
        Row: {
          actor_id: string
          assignment_id: string
          company_id: string
          created_at: string
          decision: string | null
          id: string
          kind: string
          occurred_at: string
          organization_id: string
          previous_event_id: string | null
          reason: string | null
          shift_id: string
          volunteer_id: string
        }
        Insert: {
          actor_id: string
          assignment_id: string
          company_id: string
          created_at?: string
          decision?: string | null
          id?: string
          kind: string
          occurred_at: string
          organization_id: string
          previous_event_id?: string | null
          reason?: string | null
          shift_id: string
          volunteer_id: string
        }
        Update: {
          actor_id?: string
          assignment_id?: string
          company_id?: string
          created_at?: string
          decision?: string | null
          id?: string
          kind?: string
          occurred_at?: string
          organization_id?: string
          previous_event_id?: string | null
          reason?: string | null
          shift_id?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_attendance_events_assignment_id_shift_id_organizatio_fkey"
            columns: [
              "assignment_id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
            isOneToOne: false
            referencedRelation: "guard_assignments"
            referencedColumns: [
              "id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
          },
          {
            foreignKeyName: "guard_attendance_events_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_attendance_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_attendance_events_previous_event_id_assignment_id_sh_fkey"
            columns: [
              "previous_event_id",
              "assignment_id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
            isOneToOne: false
            referencedRelation: "guard_attendance_events"
            referencedColumns: [
              "id",
              "assignment_id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
          },
          {
            foreignKeyName: "guard_attendance_events_volunteer_id_organization_id_fkey"
            columns: ["volunteer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guard_audit_links: {
        Row: {
          audit_id: string
          company_id: string | null
          created_at: string
          event_name: string
          id: string
          organization_id: string
          shift_id: string | null
          summary: Json
        }
        Insert: {
          audit_id: string
          company_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          organization_id: string
          shift_id?: string | null
          summary: Json
        }
        Update: {
          audit_id?: string
          company_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          organization_id?: string
          shift_id?: string | null
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "guard_audit_links_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: true
            referencedRelation: "audit_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_audit_links_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_audit_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_audit_links_shift_id_organization_id_company_id_fkey"
            columns: ["shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_shifts"
            referencedColumns: ["id", "organization_id", "company_id"]
          },
        ]
      }
      guard_notification_outbox: {
        Row: {
          attempts: number
          company_id: string
          created_at: string
          event_key: string
          id: string
          next_attempt_at: string
          organization_id: string
          payload: Json
          recipient_id: string
          shift_id: string
          status: string
        }
        Insert: {
          attempts?: number
          company_id: string
          created_at?: string
          event_key: string
          id?: string
          next_attempt_at?: string
          organization_id: string
          payload: Json
          recipient_id: string
          shift_id: string
          status?: string
        }
        Update: {
          attempts?: number
          company_id?: string
          created_at?: string
          event_key?: string
          id?: string
          next_attempt_at?: string
          organization_id?: string
          payload?: Json
          recipient_id?: string
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_notification_outbox_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_notification_outbox_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_notification_outbox_shift_id_organization_id_company_fkey"
            columns: ["shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_shifts"
            referencedColumns: ["id", "organization_id", "company_id"]
          },
        ]
      }
      guard_permission_issuers: {
        Row: {
          authorized_by: string
          created_at: string
          id: string
          organization_id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          authorized_by: string
          created_at?: string
          id?: string
          organization_id: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          authorized_by?: string
          created_at?: string
          id?: string
          organization_id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_permission_issuers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_permissions: {
        Row: {
          action: string
          company_id: string
          created_at: string
          granted_by: string
          id: string
          organization_id: string
          reason: string
          revoked_at: string | null
          revoked_by: string | null
          user_id: string
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          granted_by: string
          id?: string
          organization_id: string
          reason: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id: string
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          granted_by?: string
          id?: string
          organization_id?: string
          reason?: string
          revoked_at?: string | null
          revoked_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_permissions_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_shifts: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          ends_at: string
          id: string
          mode: string
          name: string
          organization_id: string
          reason: string | null
          replaces_shift_id: string | null
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          mode: string
          name: string
          organization_id: string
          reason?: string | null
          replaces_shift_id?: string | null
          starts_at: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          mode?: string
          name?: string
          organization_id?: string
          reason?: string | null
          replaces_shift_id?: string | null
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_replacement_scope"
            columns: ["replaces_shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_shifts"
            referencedColumns: ["id", "organization_id", "company_id"]
          },
          {
            foreignKeyName: "guard_shifts_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_shifts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guard_slots: {
        Row: {
          capacity: number
          company_id: string
          created_at: string
          critical: boolean
          ends_at: string
          id: string
          mode: string
          open_applications: boolean
          organization_id: string
          required_specialties: string[]
          role_name: string
          shift_id: string
          starts_at: string
        }
        Insert: {
          capacity: number
          company_id: string
          created_at?: string
          critical?: boolean
          ends_at: string
          id?: string
          mode: string
          open_applications?: boolean
          organization_id: string
          required_specialties?: string[]
          role_name: string
          shift_id: string
          starts_at: string
        }
        Update: {
          capacity?: number
          company_id?: string
          created_at?: string
          critical?: boolean
          ends_at?: string
          id?: string
          mode?: string
          open_applications?: boolean
          organization_id?: string
          required_specialties?: string[]
          role_name?: string
          shift_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_slots_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_slots_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_slots_shift_id_organization_id_company_id_fkey"
            columns: ["shift_id", "organization_id", "company_id"]
            isOneToOne: false
            referencedRelation: "guard_shifts"
            referencedColumns: ["id", "organization_id", "company_id"]
          },
        ]
      }
      guard_swap_requests: {
        Row: {
          accepted_at: string | null
          assignment_id: string
          company_id: string
          counterpart_assignment_id: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          id: string
          organization_id: string
          original_volunteer_id: string
          reason: string | null
          replacement_volunteer_id: string
          shift_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          assignment_id: string
          company_id: string
          counterpart_assignment_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id: string
          original_volunteer_id: string
          reason?: string | null
          replacement_volunteer_id: string
          shift_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          assignment_id?: string
          company_id?: string
          counterpart_assignment_id?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          organization_id?: string
          original_volunteer_id?: string
          reason?: string | null
          replacement_volunteer_id?: string
          shift_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "guard_swap_requests_assignment_id_shift_id_organization_id_fkey"
            columns: [
              "assignment_id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
            isOneToOne: false
            referencedRelation: "guard_assignments"
            referencedColumns: [
              "id",
              "shift_id",
              "organization_id",
              "company_id",
            ]
          },
          {
            foreignKeyName: "guard_swap_requests_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_swap_requests_counterpart_assignment_id_fkey"
            columns: ["counterpart_assignment_id"]
            isOneToOne: false
            referencedRelation: "guard_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_swap_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guard_swap_requests_original_volunteer_id_organization_id_fkey"
            columns: ["original_volunteer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_swap_requests_replacement_volunteer_id_organization__fkey"
            columns: ["replacement_volunteer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      guard_templates: {
        Row: {
          archived_at: string | null
          company_id: string
          created_at: string
          created_by: string
          id: string
          name: string
          organization_id: string
          specification: Json
          version: number
        }
        Insert: {
          archived_at?: string | null
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          organization_id: string
          specification: Json
          version?: number
        }
        Update: {
          archived_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          organization_id?: string
          specification?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guard_templates_company_id_organization_id_fkey"
            columns: ["company_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "guard_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      hydrants: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          flow_lpm: number | null
          hydrant_number: string | null
          id: string
          last_inspection: string | null
          latitude: number
          longitude: number
          name: string | null
          observations: string | null
          organization_id: string
          outlets: Json
          pressure_bar: number | null
          status: string
          type: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          flow_lpm?: number | null
          hydrant_number?: string | null
          id?: string
          last_inspection?: string | null
          latitude: number
          longitude: number
          name?: string | null
          observations?: string | null
          organization_id: string
          outlets?: Json
          pressure_bar?: number | null
          status?: string
          type?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          flow_lpm?: number | null
          hydrant_number?: string | null
          id?: string
          last_inspection?: string | null
          latitude?: number
          longitude?: number
          name?: string | null
          observations?: string | null
          organization_id?: string
          outlets?: Json
          pressure_bar?: number | null
          status?: string
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
      location_pings: {
        Row: {
          accuracy: number | null
          battery_level: number | null
          captured_at: string
          created_at: string
          emergency_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          organization_id: string
          request_id: string
          speed: number | null
        }
        Insert: {
          accuracy?: number | null
          battery_level?: number | null
          captured_at?: string
          created_at?: string
          emergency_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          organization_id: string
          request_id: string
          speed?: number | null
        }
        Update: {
          accuracy?: number | null
          battery_level?: number | null
          captured_at?: string
          created_at?: string
          emergency_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          organization_id?: string
          request_id?: string
          speed?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "location_pings_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_pings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_pings_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "location_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      location_requests: {
        Row: {
          accuracy: number | null
          created_at: string
          created_by: string | null
          emergency_id: string | null
          expires_at: string
          id: string
          last_ping_at: string | null
          latitude: number | null
          longitude: number | null
          organization_id: string
          phone: string | null
          resolved_address: string | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accuracy?: number | null
          created_at?: string
          created_by?: string | null
          emergency_id?: string | null
          expires_at?: string
          id?: string
          last_ping_at?: string | null
          latitude?: number | null
          longitude?: number | null
          organization_id: string
          phone?: string | null
          resolved_address?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          accuracy?: number | null
          created_at?: string
          created_by?: string | null
          emergency_id?: string | null
          expires_at?: string
          id?: string
          last_ping_at?: string | null
          latitude?: number | null
          longitude?: number | null
          organization_id?: string
          phone?: string | null
          resolved_address?: string | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "location_requests_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "location_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      organization_landmarks: {
        Row: {
          aliases: string[]
          category: string | null
          created_at: string
          created_by: string | null
          id: string
          latitude: number
          longitude: number
          name: string
          notes: string | null
          organization_id: string
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude: number
          longitude: number
          name: string
          notes?: string | null
          organization_id: string
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          category?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          notes?: string | null
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_landmarks_organization_id_fkey"
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
          latitude: number | null
          logo_url: string | null
          longitude: number | null
          name: string
          phone: string | null
          plan: string | null
          region: string | null
          slug: string
          status: Database["public"]["Enums"]["org_status"]
          time_format: string
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name: string
          phone?: string | null
          plan?: string | null
          region?: string | null
          slug: string
          status?: Database["public"]["Enums"]["org_status"]
          time_format?: string
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
          latitude?: number | null
          logo_url?: string | null
          longitude?: number | null
          name?: string
          phone?: string | null
          plan?: string | null
          region?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["org_status"]
          time_format?: string
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
      radio_glossary_keys: {
        Row: {
          active: boolean
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          category: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_glossary_keys_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ranks: {
        Row: {
          created_at: string
          id: string
          is_authority: boolean
          level: number
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_authority?: boolean
          level?: number
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_authority?: boolean
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
      screen_pairings: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string | null
          name: string | null
          organization_id: string | null
          paired_at: string | null
          paired_by: string | null
          pin: string
          pin_expires_at: string
          revoked_at: string | null
          secret_hash: string
          view: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string | null
          organization_id?: string | null
          paired_at?: string | null
          paired_by?: string | null
          pin: string
          pin_expires_at?: string
          revoked_at?: string | null
          secret_hash: string
          view?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string | null
          organization_id?: string | null
          paired_at?: string | null
          paired_by?: string | null
          pin?: string
          pin_expires_at?: string
          revoked_at?: string | null
          secret_hash?: string
          view?: string
        }
        Relationships: [
          {
            foreignKeyName: "screen_pairings_organization_id_fkey"
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
      support_ticket_messages: {
        Row: {
          author_id: string | null
          created_at: string
          id: string
          is_support: boolean
          message: string
          organization_id: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_support?: boolean
          message: string
          organization_id: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          id?: string
          is_support?: boolean
          message?: string
          organization_id?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          category: string
          contact_email: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          organization_id: string
          priority: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at: string | null
          route: string | null
          status: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at: string
        }
        Insert: {
          category?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          organization_id: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject: string
          updated_at?: string
        }
        Update: {
          category?: string
          contact_email?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          organization_id?: string
          priority?: Database["public"]["Enums"]["support_ticket_priority"]
          resolved_at?: string | null
          route?: string | null
          status?: Database["public"]["Enums"]["support_ticket_status"]
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      vehicle_checklists: {
        Row: {
          created_at: string
          created_by: string | null
          emergency_id: string | null
          fuel_level: number | null
          id: string
          items: Json
          kind: string
          notes: string | null
          odometer: number | null
          organization_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          emergency_id?: string | null
          fuel_level?: number | null
          id?: string
          items?: Json
          kind?: string
          notes?: string | null
          odometer?: number | null
          organization_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          emergency_id?: string | null
          fuel_level?: number | null
          id?: string
          items?: Json
          kind?: string
          notes?: string | null
          odometer?: number | null
          organization_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_checklists_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_checklists_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_device_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          is_permanent: boolean
          label: string | null
          last_used_at: string | null
          organization_id: string
          revoked_at: string | null
          updated_at: string
          used_at: string | null
          used_by_device_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_permanent?: boolean
          label?: string | null
          last_used_at?: string | null
          organization_id: string
          revoked_at?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_device_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          is_permanent?: boolean
          label?: string | null
          last_used_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_device_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_device_codes_device_fk"
            columns: ["used_by_device_id"]
            isOneToOne: false
            referencedRelation: "vehicle_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_device_codes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_device_codes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_devices: {
        Row: {
          activated_at: string
          created_at: string
          id: string
          last_seen_at: string | null
          name: string
          organization_id: string
          platform: string | null
          revoked_at: string | null
          status: string
          token_hash: string
          updated_at: string
          vehicle_changed_at: string | null
          vehicle_id: string | null
        }
        Insert: {
          activated_at?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          organization_id: string
          platform?: string | null
          revoked_at?: string | null
          status?: string
          token_hash: string
          updated_at?: string
          vehicle_changed_at?: string | null
          vehicle_id?: string | null
        }
        Update: {
          activated_at?: string
          created_at?: string
          id?: string
          last_seen_at?: string | null
          name?: string
          organization_id?: string
          platform?: string | null
          revoked_at?: string | null
          status?: string
          token_hash?: string
          updated_at?: string
          vehicle_changed_at?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_devices_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string
          created_by: string | null
          doc_number: string | null
          doc_type: string
          expires_at: string | null
          file_url: string | null
          id: string
          issued_at: string | null
          notes: string | null
          organization_id: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          doc_type: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          doc_number?: string | null
          doc_type?: string
          expires_at?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          organization_id?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_last_positions: {
        Row: {
          accuracy: number | null
          captured_at: string
          device_id: string | null
          emergency_id: string | null
          heading: number | null
          latitude: number
          longitude: number
          organization_id: string
          speed: number | null
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          captured_at: string
          device_id?: string | null
          emergency_id?: string | null
          heading?: number | null
          latitude: number
          longitude: number
          organization_id: string
          speed?: number | null
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          captured_at?: string
          device_id?: string | null
          emergency_id?: string | null
          heading?: number | null
          latitude?: number
          longitude?: number
          organization_id?: string
          speed?: number | null
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_last_positions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "vehicle_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_last_positions_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_last_positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_last_positions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: true
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_maintenance: {
        Row: {
          cost: number | null
          created_at: string
          created_by: string | null
          id: string
          maintenance_type: string
          next_service_date: string | null
          next_service_odometer: number | null
          notes: string | null
          odometer: number | null
          organization_id: string
          provider: string | null
          service_date: string
          updated_at: string
          vehicle_id: string
        }
        Insert: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type: string
          next_service_date?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          organization_id: string
          provider?: string | null
          service_date?: string
          updated_at?: string
          vehicle_id: string
        }
        Update: {
          cost?: number | null
          created_at?: string
          created_by?: string | null
          id?: string
          maintenance_type?: string
          next_service_date?: string | null
          next_service_odometer?: number | null
          notes?: string | null
          odometer?: number | null
          organization_id?: string
          provider?: string | null
          service_date?: string
          updated_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_maintenance_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_operational_requests: {
        Row: {
          created_at: string
          device_id: string | null
          emergency_id: string
          emergency_vehicle_id: string | null
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          odometer_end: number | null
          organization_id: string
          reported_at: string
          requested_status: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          emergency_id: string
          emergency_vehicle_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          odometer_end?: number | null
          organization_id: string
          reported_at?: string
          requested_status: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          emergency_id?: string
          emergency_vehicle_id?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          odometer_end?: number | null
          organization_id?: string
          reported_at?: string
          requested_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_operational_requests_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "vehicle_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_operational_requests_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_operational_requests_emergency_vehicle_id_fkey"
            columns: ["emergency_vehicle_id"]
            isOneToOne: false
            referencedRelation: "emergency_vehicles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_operational_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_operational_requests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_positions: {
        Row: {
          accuracy: number | null
          captured_at: string
          created_at: string
          device_id: string | null
          emergency_id: string | null
          heading: number | null
          id: string
          latitude: number
          longitude: number
          organization_id: string
          speed: number | null
          vehicle_id: string
        }
        Insert: {
          accuracy?: number | null
          captured_at?: string
          created_at?: string
          device_id?: string | null
          emergency_id?: string | null
          heading?: number | null
          id?: string
          latitude: number
          longitude: number
          organization_id: string
          speed?: number | null
          vehicle_id: string
        }
        Update: {
          accuracy?: number | null
          captured_at?: string
          created_at?: string
          device_id?: string | null
          emergency_id?: string | null
          heading?: number | null
          id?: string
          latitude?: number
          longitude?: number
          organization_id?: string
          speed?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_positions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "vehicle_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_positions_emergency_id_fkey"
            columns: ["emergency_id"]
            isOneToOne: false
            referencedRelation: "emergencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_positions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_positions_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          capacity: number
          code: string
          company_id: string | null
          created_at: string
          fuel_level: number | null
          fuel_updated_at: string | null
          id: string
          model: string | null
          odometer: number | null
          organization_id: string
          plate: string | null
          status: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at: string
          year: number | null
        }
        Insert: {
          brand?: string | null
          capacity?: number
          code: string
          company_id?: string | null
          created_at?: string
          fuel_level?: number | null
          fuel_updated_at?: string | null
          id?: string
          model?: string | null
          odometer?: number | null
          organization_id: string
          plate?: string | null
          status?: Database["public"]["Enums"]["vehicle_status"]
          type: string
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string | null
          capacity?: number
          code?: string
          company_id?: string | null
          created_at?: string
          fuel_level?: number | null
          fuel_updated_at?: string | null
          id?: string
          model?: string | null
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
      volunteer_records: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          organization_id: string
          record_date: string
          record_type: string
          title: string
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id: string
          record_date?: string
          record_type?: string
          title: string
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          record_date?: string
          record_type?: string
          title?: string
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "volunteer_records_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "volunteer_records_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          available: boolean
          code: string | null
          company_id: string | null
          created_at: string
          email: string | null
          id: string
          invitation_sent_at: string | null
          join_date: string | null
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
          code?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          join_date?: string | null
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
          code?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          invitation_sent_at?: string | null
          join_date?: string | null
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
      demo_emergency_count: { Args: { _org_id: string }; Returns: number }
      get_demo_limits: { Args: never; Returns: Json }
      get_invitation_preview: { Args: { _token: string }; Returns: Json }
      get_member_profiles: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_my_organization_ids: { Args: never; Returns: string[] }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      guard_assign: {
        Args: { _org: string; _slot: string; _volunteer: string }
        Returns: string
      }
      guard_can: {
        Args: { _action: string; _company: string; _org: string }
        Returns: boolean
      }
      guard_confirm: {
        Args: {
          _accept: boolean
          _assignment: string
          _org: string
          _reason: string
        }
        Returns: undefined
      }
      guard_create_draft: {
        Args: {
          _company: string
          _end: string
          _mode: string
          _name: string
          _org: string
          _slots: Json
          _start: string
        }
        Returns: string
      }
      guard_create_shift: {
        Args: {
          _company: string
          _end: string
          _mode: string
          _name: string
          _org: string
          _start: string
        }
        Returns: string
      }
      guard_create_slot: {
        Args: {
          _capacity: number
          _critical: boolean
          _end: string
          _mode: string
          _org: string
          _role: string
          _shift: string
          _specialties: string[]
          _start: string
        }
        Returns: string
      }
      guard_edit_shift: {
        Args: {
          _end: string
          _mode: string
          _name: string
          _org: string
          _shift: string
          _start: string
        }
        Returns: undefined
      }
      guard_enqueue_assignment_push: {
        Args: { _assignment: string }
        Returns: undefined
      }
      guard_history: {
        Args: { _company: string; _org: string; _shift?: string }
        Returns: {
          event_name: string
          happened_at: string
          summary: Json
        }[]
      }
      guard_is_issuer: { Args: { _org: string }; Returns: boolean }
      guard_lock: { Args: { _org: string }; Returns: undefined }
      guard_manage_required: {
        Args: { _company: string; _org: string }
        Returns: undefined
      }
      guard_member: { Args: { _org: string }; Returns: boolean }
      guard_my_assignments: {
        Args: { _org: string }
        Returns: {
          assignment_id: string
          assignment_status: string
          company_id: string
          ends_at: string
          mode: string
          role_name: string
          shift_id: string
          shift_name: string
          shift_status: string
          slot_id: string
          starts_at: string
        }[]
      }
      guard_own_shift: {
        Args: { _org: string; _shift: string }
        Returns: boolean
      }
      guard_record: {
        Args: {
          _company: string
          _event: string
          _new: Json
          _old: Json
          _org: string
          _shift: string
        }
        Returns: undefined
      }
      guard_replace_shift: {
        Args: {
          _end: string
          _expected: string
          _mode: string
          _name: string
          _org: string
          _original: string
          _reason: string
          _slots: Json
          _start: string
        }
        Returns: string
      }
      guard_self: { Args: { _org: string; _vol: string }; Returns: boolean }
      guard_set_issuer: {
        Args: {
          _grant: boolean
          _org: string
          _reason: string
          _target: string
        }
        Returns: string
      }
      guard_set_permission: {
        Args: {
          _action: string
          _company: string
          _grant: boolean
          _org: string
          _reason: string
          _target: string
        }
        Returns: string
      }
      guard_supervise: { Args: { _org: string }; Returns: boolean }
      guard_transition: {
        Args: {
          _expected: string
          _next: string
          _org: string
          _reason: string
          _shift: string
        }
        Returns: undefined
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
      purge_old_vehicle_positions: { Args: never; Returns: undefined }
      register_device_token: {
        Args: { _organization_id: string; _platform: string; _token: string }
        Returns: undefined
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
      support_ticket_priority: "baja" | "media" | "alta" | "critica"
      support_ticket_status: "abierto" | "en_proceso" | "resuelto" | "cerrado"
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
      support_ticket_priority: ["baja", "media", "alta", "critica"],
      support_ticket_status: ["abierto", "en_proceso", "resuelto", "cerrado"],
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
