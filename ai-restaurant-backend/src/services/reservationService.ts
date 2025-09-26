import supabaseService from './supabaseService';
import twilioService from './twilioService';
import { addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns';

interface BookingRequest {
  patient_name: string;
  patient_phone: string;
  patient_email?: string;
  appointment_date: string;
  appointment_time: string;
  procedure_type?: string;
  service_type?: string;
  notes?: string;
  created_by?: string;
  conversation_id?: string;
}

interface TimeSlot {
  start_time: string;
  end_time: string;
  available: boolean;
  dentist?: string;
}

export class AppointmentService {
  /**
   * Check availability for a specific date
   */
  async checkAvailability(date: string): Promise<TimeSlot[]> {
    try {
      // Get available slots from database
      const { data: slots } = await supabaseService.getAvailableSlots(date);

      // Get existing appointments for the date
      const { data: appointments } = await supabaseService.getAppointments({ date });

      // Generate time slots for the day (9 AM to 6 PM, 30-minute intervals)
      const timeSlots: TimeSlot[] = [];
      const startHour = 9;
      const endHour = 18;
      const intervalMinutes = 30;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += intervalMinutes) {
          const slotTime = new Date(date);
          slotTime.setHours(hour, minute, 0, 0);

          const endTime = addMinutes(slotTime, intervalMinutes);

          // Check if slot is in available_slots and not booked
          const isAvailable = this.isSlotAvailable(
            slotTime,
            endTime,
            slots || [],
            appointments || []
          );

          timeSlots.push({
            start_time: format(slotTime, 'HH:mm'),
            end_time: format(endTime, 'HH:mm'),
            available: isAvailable,
            dentist: this.getAvailableDentist(slotTime, slots || [])
          });
        }
      }

      return timeSlots;
    } catch (error: any) {
      console.error('Error checking availability:', error);
      throw error;
    }
  }

  /**
   * Book an appointment
   */
  async bookAppointment(request: BookingRequest) {
    try {
      // Parse date and time
      const appointmentDateTime = this.parseDateTime(
        request.appointment_date,
        request.appointment_time
      );

      // Check if slot is available
      const availability = await this.checkAvailability(request.appointment_date);
      const requestedSlot = availability.find(
        slot => slot.start_time === request.appointment_time
      );

      if (!requestedSlot || !requestedSlot.available) {
        return {
          success: false,
          error: 'The requested time slot is not available'
        };
      }

      // Determine duration based on procedure type
      const duration = this.getProcedureDuration(request.procedure_type);

      // Create appointment
      const appointment = await supabaseService.createAppointment({
        patient_name: request.patient_name,
        patient_phone: request.patient_phone,
        patient_email: request.patient_email,
        appointment_date: appointmentDateTime.toISOString(),
        duration_minutes: duration,
        procedure_type: request.procedure_type,
        status: 'scheduled',
        notes: request.notes,
        created_by: request.created_by || 'ai_agent'
      });

      if (appointment.success && appointment.data) {
        // Send confirmation SMS
        await this.sendAppointmentConfirmation(appointment.data);

        // Schedule reminder (24 hours before)
        await this.scheduleReminder(appointment.data);

        return {
          success: true,
          appointment: appointment.data,
          message: `Appointment booked for ${format(appointmentDateTime, 'PPpp')}`
        };
      }

      return appointment;
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get patient information by phone number
   */
  async getPatientInfo(phoneNumber: string) {
    try {
      // Get patient's appointment history
      const { data: appointments } = await supabaseService.getAppointments({
        patient_phone: phoneNumber
      });

      if (!appointments || appointments.length === 0) {
        return {
          success: false,
          message: 'No patient records found'
        };
      }

      // Get most recent appointment
      const latestAppointment = appointments[0];

      return {
        success: true,
        patient: {
          name: latestAppointment.patient_name,
          phone: latestAppointment.patient_phone,
          email: latestAppointment.patient_email,
          lastVisit: latestAppointment.appointment_date,
          totalAppointments: appointments.length,
          upcomingAppointments: appointments.filter(
            a => new Date(a.appointment_date) > new Date() && a.status === 'scheduled'
          )
        }
      };
    } catch (error: any) {
      console.error('Error fetching patient info:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Confirm appointment by phone number
   */
  async confirmAppointmentByPhone(phoneNumber: string) {
    try {
      // Find the next upcoming appointment for this phone number
      const { data: appointments } = await supabaseService.getAppointments({
        patient_phone: phoneNumber,
        status: 'scheduled'
      });

      if (!appointments || appointments.length === 0) {
        return { success: false, message: 'No appointments found' };
      }

      // Find the next upcoming appointment
      const upcomingAppointment = appointments.find(
        a => new Date(a.appointment_date) > new Date()
      );

      if (!upcomingAppointment) {
        return { success: false, message: 'No upcoming appointments' };
      }

      // Update appointment status
      const result = await supabaseService.updateAppointment(
        upcomingAppointment.id!,
        { status: 'confirmed' }
      );

      return result;
    } catch (error: any) {
      console.error('Error confirming appointment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel appointment by phone number
   */
  async cancelAppointmentByPhone(phoneNumber: string) {
    try {
      // Find the next upcoming appointment
      const { data: appointments } = await supabaseService.getAppointments({
        patient_phone: phoneNumber,
        status: 'scheduled'
      });

      if (!appointments || appointments.length === 0) {
        return { success: false, message: 'No appointments found' };
      }

      const upcomingAppointment = appointments.find(
        a => new Date(a.appointment_date) > new Date()
      );

      if (!upcomingAppointment) {
        return { success: false, message: 'No upcoming appointments' };
      }

      // Cancel the appointment
      const result = await supabaseService.cancelAppointment(
        upcomingAppointment.id!,
        'Cancelled by patient via SMS'
      );

      // Free up the slot
      if (result.success) {
        await this.freeUpSlot(upcomingAppointment.appointment_date);
      }

      return result;
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send appointment confirmation SMS
   */
  private async sendAppointmentConfirmation(appointment: any) {
    try {
      const appointmentDate = new Date(appointment.appointment_date);
      const formattedDate = format(appointmentDate, 'PPP');
      const formattedTime = format(appointmentDate, 'p');

      await twilioService.sendAppointmentConfirmation(
        appointment.patient_phone,
        {
          patientName: appointment.patient_name,
          date: formattedDate,
          time: formattedTime,
          service: appointment.procedure_type
        }
      );
    } catch (error) {
      console.error('Error sending confirmation SMS:', error);
    }
  }

  /**
   * Schedule appointment reminder
   */
  private async scheduleReminder(appointment: any) {
    // This would integrate with a job scheduler like Bull or node-cron
    // For now, we'll just log it
    console.log('Reminder scheduled for appointment:', appointment.id);
  }

  /**
   * Helper: Check if a time slot is available
   */
  private isSlotAvailable(
    startTime: Date,
    endTime: Date,
    availableSlots: any[],
    appointments: any[]
  ): boolean {
    // Check if slot exists in available_slots
    const slotExists = availableSlots.some(slot => {
      const slotStart = new Date(slot.start_time);
      return slotStart.getTime() === startTime.getTime() && slot.is_available;
    });

    if (!slotExists && availableSlots.length > 0) {
      return false;
    }

    // Check if there's no conflicting appointment
    const hasConflict = appointments.some(apt => {
      const aptStart = new Date(apt.appointment_date);
      const aptEnd = addMinutes(aptStart, apt.duration_minutes);

      return (
        apt.status !== 'cancelled' &&
        ((startTime >= aptStart && startTime < aptEnd) ||
          (endTime > aptStart && endTime <= aptEnd) ||
          (startTime <= aptStart && endTime >= aptEnd))
      );
    });

    return !hasConflict;
  }

  /**
   * Helper: Get available dentist for a slot
   */
  private getAvailableDentist(time: Date, slots: any[]): string | undefined {
    const slot = slots.find(s => {
      const slotTime = new Date(s.start_time);
      return slotTime.getTime() === time.getTime();
    });

    return slot?.dentist_name;
  }

  /**
   * Helper: Parse date and time strings
   */
  private parseDateTime(dateStr: string, timeStr: string): Date {
    const date = new Date(dateStr);
    const [hours, minutes] = timeStr.split(':').map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Helper: Get procedure duration in minutes
   */
  private getProcedureDuration(procedureType: string): number {
    const durations: Record<string, number> = {
      'checkup': 30,
      'cleaning': 45,
      'filling': 60,
      'root_canal': 90,
      'extraction': 45,
      'crown': 60,
      'emergency': 45,
      'consultation': 20,
      'orthodontic': 30
    };

    return durations[procedureType.toLowerCase().replace(/\s+/g, '_')] || 30;
  }

  /**
   * Helper: Free up a cancelled appointment slot
   */
  private async freeUpSlot(appointmentDate: string) {
    // This would update the available_slots table
    // Implementation depends on your slot management strategy
    console.log('Freeing up slot for:', appointmentDate);
  }
}

export default new AppointmentService();