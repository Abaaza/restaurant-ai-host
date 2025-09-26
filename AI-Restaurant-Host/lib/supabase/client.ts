import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations
export const supabaseAdmin = {
  // Appointments
  async getAvailableSlots(date: string) {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('available_slots')
      .select('*')
      .eq('is_available', true)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time', { ascending: true })

    return { data, error }
  },

  async bookAppointment(appointmentData: any) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointmentData)
      .select()
      .single()

    if (data && !error && appointmentData.slot_id) {
      // Mark slot as unavailable
      try {
        await (supabase as any)
          .from('available_slots')
          .update({ is_available: false })
          .eq('id', appointmentData.slot_id)
      } catch (e) {
        console.error('Error updating slot availability:', e)
      }
    }

    return { data, error }
  },

  async getAppointments(filters?: any) {
    let query = supabase
      .from('appointments')
      .select('*, dentists(*)')
      .order('appointment_date', { ascending: true })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }

    if (filters?.date) {
      const startOfDay = new Date(filters.date)
      startOfDay.setHours(0, 0, 0, 0)

      const endOfDay = new Date(filters.date)
      endOfDay.setHours(23, 59, 59, 999)

      query = query
        .gte('appointment_date', startOfDay.toISOString())
        .lte('appointment_date', endOfDay.toISOString())
    }

    const { data, error } = await query
    return { data, error }
  },

  // Call logs
  async getCallLogs(limit = 50) {
    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  async createCallLog(callData: any) {
    const { data, error } = await supabase
      .from('call_logs')
      .insert(callData)
      .select()
      .single()

    return { data, error }
  },

  // Patients
  async searchPatients(searchTerm: string) {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .limit(10)

    return { data, error }
  },

  // Analytics
  async getAnalytics(dateRange: { start: Date; end: Date }) {
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())

    const { data: calls, error: callsError } = await supabase
      .from('call_logs')
      .select('*')
      .gte('created_at', dateRange.start.toISOString())
      .lte('created_at', dateRange.end.toISOString())

    if (appointmentsError || callsError) {
      return { error: appointmentsError || callsError }
    }

    // Calculate metrics
    const totalAppointments = appointments?.length || 0
    const totalCalls = calls?.length || 0
    const successfulBookings = appointments?.filter((a: any) => a.status === 'scheduled').length || 0
    const avgCallDuration = calls?.reduce((acc: number, call: any) => acc + (call.duration_seconds || 0), 0) / (totalCalls || 1)

    return {
      data: {
        totalAppointments,
        totalCalls,
        successfulBookings,
        avgCallDuration,
        conversionRate: totalCalls > 0 ? (successfulBookings / totalCalls) * 100 : 0
      },
      error: null
    }
  },

  // Real-time subscriptions
  subscribeToCallLogs(callback: (payload: any) => void) {
    return supabase
      .channel('call_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, callback)
      .subscribe()
  },

  subscribeToAppointments(callback: (payload: any) => void) {
    return supabase
      .channel('appointments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, callback)
      .subscribe()
  }
}