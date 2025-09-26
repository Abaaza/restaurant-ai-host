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
      dentists: {
        Row: {
          id: string
          name: string
          specialization: string | null
          email: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          specialization?: string | null
          email?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          specialization?: string | null
          email?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      available_slots: {
        Row: {
          id: string
          dentist_id: string | null
          dentist_name: string | null
          start_time: string
          end_time: string
          is_available: boolean
          slot_type: string
          last_synced: string
          created_at: string
        }
        Insert: {
          id?: string
          dentist_id?: string | null
          dentist_name?: string | null
          start_time: string
          end_time: string
          is_available?: boolean
          slot_type?: string
          last_synced?: string
          created_at?: string
        }
        Update: {
          id?: string
          dentist_id?: string | null
          dentist_name?: string | null
          start_time?: string
          end_time?: string
          is_available?: boolean
          slot_type?: string
          last_synced?: string
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          patient_name: string
          patient_phone: string
          patient_email: string | null
          appointment_date: string
          duration_minutes: number
          procedure_type: string
          dentist_id: string | null
          slot_id: string | null
          status: string
          confirmation_sent: boolean
          reminder_sent: boolean
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_name: string
          patient_phone: string
          patient_email?: string | null
          appointment_date: string
          duration_minutes?: number
          procedure_type?: string
          dentist_id?: string | null
          slot_id?: string | null
          status?: string
          confirmation_sent?: boolean
          reminder_sent?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_name?: string
          patient_phone?: string
          patient_email?: string | null
          appointment_date?: string
          duration_minutes?: number
          procedure_type?: string
          dentist_id?: string | null
          slot_id?: string | null
          status?: string
          confirmation_sent?: boolean
          reminder_sent?: boolean
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      call_logs: {
        Row: {
          id: string
          call_id: string | null
          call_type: string
          phone_number: string
          duration_seconds: number | null
          outcome: string | null
          recording_url: string | null
          transcript: string | null
          agent_notes: string | null
          lead_id: string | null
          appointment_id: string | null
          cost_cents: number | null
          created_at: string
        }
        Insert: {
          id?: string
          call_id?: string | null
          call_type: string
          phone_number: string
          duration_seconds?: number | null
          outcome?: string | null
          recording_url?: string | null
          transcript?: string | null
          agent_notes?: string | null
          lead_id?: string | null
          appointment_id?: string | null
          cost_cents?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string | null
          call_type?: string
          phone_number?: string
          duration_seconds?: number | null
          outcome?: string | null
          recording_url?: string | null
          transcript?: string | null
          agent_notes?: string | null
          lead_id?: string | null
          appointment_id?: string | null
          cost_cents?: number | null
          created_at?: string
        }
      }
      patients: {
        Row: {
          id: string
          name: string
          phone: string
          email: string | null
          date_of_birth: string | null
          address: string | null
          insurance_info: Json | null
          medical_history: Json | null
          preferred_dentist_id: string | null
          last_visit: string | null
          next_appointment_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string | null
          date_of_birth?: string | null
          address?: string | null
          insurance_info?: Json | null
          medical_history?: Json | null
          preferred_dentist_id?: string | null
          last_visit?: string | null
          next_appointment_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string | null
          date_of_birth?: string | null
          address?: string | null
          insurance_info?: Json | null
          medical_history?: Json | null
          preferred_dentist_id?: string | null
          last_visit?: string | null
          next_appointment_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      waiting_list: {
        Row: {
          id: string
          patient_name: string
          patient_phone: string
          patient_email: string | null
          preferred_dates: Json | null
          procedure_type: string | null
          urgency: string
          notes: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          patient_name: string
          patient_phone: string
          patient_email?: string | null
          preferred_dates?: Json | null
          procedure_type?: string | null
          urgency?: string
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          patient_name?: string
          patient_phone?: string
          patient_email?: string | null
          preferred_dates?: Json | null
          procedure_type?: string | null
          urgency?: string
          notes?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      clinic_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          description: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          description?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          description?: string | null
          updated_at?: string
        }
      }
    }
  }
}