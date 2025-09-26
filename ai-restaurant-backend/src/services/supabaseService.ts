import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface Appointment {
  id?: string;
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  appointment_date: string;
  duration_minutes: number;
  procedure_type: string;
  dentist_id?: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  notes?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface AvailableSlot {
  id?: string;
  dentist_id?: string;
  dentist_name?: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  last_synced?: string;
}

interface CallLog {
  id?: string;
  call_id?: string;
  call_type: 'inbound' | 'outbound';
  phone_number: string;
  duration_seconds?: number;
  outcome?: string;
  recording_url?: string;
  transcript?: string;
  agent_notes?: string;
  lead_id?: string;
  appointment_id?: string;
  cost_cents?: number;
  created_at?: string;
}

interface Lead {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  status: 'new' | 'called' | 'booked' | 'not_interested' | 'callback' | 'no_answer';
  source?: string;
  call_attempts?: number;
  last_called?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY! // Use service key for backend operations
    );
  }

  // ============= Appointments =============

  async createAppointment(appointment: Appointment) {
    try {
      const { data, error } = await this.client
        .from('appointments')
        .insert({
          id: uuidv4(),
          ...appointment,
          created_by: 'ai_agent',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mark the slot as unavailable if slot_id is provided
      if (appointment.dentist_id) {
        await this.markSlotAsBooked(appointment.appointment_date);
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating appointment:', error);
      return { success: false, error: error.message };
    }
  }

  async getAppointments(filters?: {
    date?: string;
    status?: string;
    patient_phone?: string;
  }) {
    try {
      let query = this.client
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true });

      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('appointment_date', startOfDay.toISOString())
          .lte('appointment_date', endOfDay.toISOString());
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.patient_phone) {
        query = query.eq('patient_phone', filters.patient_phone);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      return { success: false, error: error.message };
    }
  }

  async updateAppointment(id: string, updates: Partial<Appointment>) {
    try {
      const { data, error } = await this.client
        .from('appointments')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating appointment:', error);
      return { success: false, error: error.message };
    }
  }

  async cancelAppointment(id: string, reason?: string) {
    return this.updateAppointment(id, {
      status: 'cancelled',
      notes: reason
    });
  }

  // ============= Available Slots =============

  async getAvailableSlots(date: string) {
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const { data, error } = await this.client
        .from('available_slots')
        .select('*')
        .eq('is_available', true)
        .gte('start_time', startOfDay.toISOString())
        .lte('start_time', endOfDay.toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching available slots:', error);
      return { success: false, error: error.message };
    }
  }

  async createAvailableSlots(slots: AvailableSlot[]) {
    try {
      const slotsWithIds = slots.map(slot => ({
        id: uuidv4(),
        ...slot,
        last_synced: new Date().toISOString()
      }));

      const { data, error } = await this.client
        .from('available_slots')
        .insert(slotsWithIds)
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating available slots:', error);
      return { success: false, error: error.message };
    }
  }

  async markSlotAsBooked(slotTime: string) {
    try {
      const { error } = await this.client
        .from('available_slots')
        .update({ is_available: false })
        .eq('start_time', slotTime);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error('Error marking slot as booked:', error);
      return { success: false, error: error.message };
    }
  }

  // ============= Call Logs =============

  async createCallLog(callLog: CallLog) {
    try {
      const { data, error } = await this.client
        .from('call_logs')
        .insert({
          id: uuidv4(),
          ...callLog,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating call log:', error);
      return { success: false, error: error.message };
    }
  }

  async getCallLogs(filters?: {
    limit?: number;
    offset?: number;
    phone?: string;
    type?: string;
    date?: string;
  }) {
    try {
      let query = this.client
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      if (filters?.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }

      if (filters?.phone) {
        query = query.eq('phone_number', filters.phone);
      }

      if (filters?.type) {
        query = query.eq('call_type', filters.type);
      }

      if (filters?.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching call logs:', error);
      return { success: false, error: error.message };
    }
  }

  async updateCallLog(id: string, updates: Partial<CallLog>) {
    try {
      const { data, error } = await this.client
        .from('call_logs')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating call log:', error);
      return { success: false, error: error.message };
    }
  }

  // ============= Leads =============

  async createLead(lead: Lead) {
    try {
      const { data, error } = await this.client
        .from('leads')
        .insert({
          id: uuidv4(),
          ...lead,
          call_attempts: 0,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error creating lead:', error);
      return { success: false, error: error.message };
    }
  }

  async getLeadsToCall() {
    try {
      const { data, error } = await this.client
        .from('leads')
        .select('*')
        .in('status', ['new', 'callback'])
        .lt('call_attempts', 3)
        .order('created_at', { ascending: true })
        .limit(50);

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error fetching leads to call:', error);
      return { success: false, error: error.message };
    }
  }

  async updateLead(id: string, updates: Partial<Lead>) {
    try {
      const { data, error } = await this.client
        .from('leads')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error('Error updating lead:', error);
      return { success: false, error: error.message };
    }
  }

  // ============= Analytics =============

  async getAnalytics(dateRange?: { start: Date; end: Date }) {
    try {
      const start = dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = dateRange?.end || new Date();

      // Get appointment stats
      const { data: appointments } = await this.client
        .from('appointments')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      // Get call stats
      const { data: calls } = await this.client
        .from('call_logs')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());

      const totalAppointments = appointments?.length || 0;
      const completedAppointments = appointments?.filter(a => a.status === 'completed').length || 0;
      const cancelledAppointments = appointments?.filter(a => a.status === 'cancelled').length || 0;

      const totalCalls = calls?.length || 0;
      const inboundCalls = calls?.filter(c => c.call_type === 'inbound').length || 0;
      const outboundCalls = calls?.filter(c => c.call_type === 'outbound').length || 0;
      const avgCallDuration = calls?.reduce((acc, c) => acc + (c.duration_seconds || 0), 0) / (totalCalls || 1);

      return {
        success: true,
        data: {
          appointments: {
            total: totalAppointments,
            completed: completedAppointments,
            cancelled: cancelledAppointments,
            completionRate: (completedAppointments / (totalAppointments || 1)) * 100
          },
          calls: {
            total: totalCalls,
            inbound: inboundCalls,
            outbound: outboundCalls,
            avgDuration: Math.round(avgCallDuration)
          }
        }
      };
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      return { success: false, error: error.message };
    }
  }

  // ============= Real-time Subscriptions =============

  subscribeToAppointments(callback: (payload: any) => void) {
    return this.client
      .channel('appointments_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, callback)
      .subscribe();
  }

  subscribeToCallLogs(callback: (payload: any) => void) {
    return this.client
      .channel('call_logs_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_logs' }, callback)
      .subscribe();
  }
}

export default new SupabaseService();