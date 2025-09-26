import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

// Get appointments for a specific date range
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, status } = req.query;

    let query = supabase
      .from('appointments')
      .select(`
        *,
        dentists (
          id,
          name,
          specialization
        ),
        patients (
          id,
          name,
          phone,
          email
        )
      `)
      .order('appointment_date', { ascending: true });

    // Filter by date
    if (date) {
      const dateStr = date as string;
      query = query
        .gte('appointment_date', `${dateStr}T00:00:00`)
        .lte('appointment_date', `${dateStr}T23:59:59`);
    } else if (startDate && endDate) {
      query = query
        .gte('appointment_date', startDate as string)
        .lte('appointment_date', endDate as string);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status as string);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching appointments:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single appointment
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        dentists (
          id,
          name,
          specialization
        ),
        patients (
          id,
          name,
          phone,
          email,
          medical_history
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching appointment:', error);
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new appointment
router.post('/', async (req: Request, res: Response) => {
  try {
    const appointmentData = req.body;

    // First check if patient exists, if not create one
    let patientId = appointmentData.patient_id;

    if (!patientId && appointmentData.patient_phone) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', appointmentData.patient_phone)
        .single();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const { data: newPatient, error: patientError } = await supabase
          .from('patients')
          .insert({
            name: appointmentData.patient_name,
            phone: appointmentData.patient_phone,
            email: appointmentData.patient_email
          })
          .select()
          .single();

        if (patientError) {
          console.error('Error creating patient:', patientError);
          return res.status(500).json({ error: 'Failed to create patient' });
        }

        patientId = newPatient.id;
      }
    }

    // Create the appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        ...appointmentData,
        patient_id: patientId,
        created_by: 'frontend'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating appointment:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update an appointment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('appointments')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating appointment:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete an appointment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting appointment:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available slots for a specific date
router.get('/slots/available', async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const { data, error } = await supabase
      .from('available_slots')
      .select('*')
      .gte('start_time', `${date}T00:00:00`)
      .lte('start_time', `${date}T23:59:59`)
      .eq('is_available', true)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching available slots:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;