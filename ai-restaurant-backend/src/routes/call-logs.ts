import { Router, Request, Response } from 'express';
import { supabase } from '../services/supabase';

const router = Router();

// Get call logs with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate, outcome, type, patientId } = req.query;

    let query = supabase
      .from('call_logs')
      .select(`
        *,
        patients (
          id,
          name,
          phone,
          email
        ),
        appointments (
          id,
          appointment_date,
          procedure_type,
          status
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by date
    if (date) {
      const dateStr = date as string;
      query = query
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);
    } else if (startDate && endDate) {
      query = query
        .gte('created_at', startDate as string)
        .lte('created_at', endDate as string);
    }

    // Filter by outcome
    if (outcome) {
      query = query.eq('outcome', outcome as string);
    }

    // Filter by call type
    if (type) {
      query = query.eq('call_type', type as string);
    }

    // Filter by patient
    if (patientId) {
      query = query.eq('patient_id', patientId as string);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching call logs:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a single call log
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('call_logs')
      .select(`
        *,
        patients (
          id,
          name,
          phone,
          email,
          medical_history
        ),
        appointments (
          id,
          appointment_date,
          procedure_type,
          status,
          notes
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching call log:', error);
      return res.status(404).json({ error: 'Call log not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new call log
router.post('/', async (req: Request, res: Response) => {
  try {
    const callLogData = req.body;

    // First check if patient exists by phone number
    let patientId = callLogData.patient_id;

    if (!patientId && callLogData.phone_number) {
      const { data: existingPatient } = await supabase
        .from('patients')
        .select('id')
        .eq('phone', callLogData.phone_number)
        .single();

      if (existingPatient) {
        patientId = existingPatient.id;
      }
    }

    // Create the call log
    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        ...callLogData,
        patient_id: patientId,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a call log
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from('call_logs')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating call log:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json(data);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a call log
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('call_logs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting call log:', error);
      return res.status(500).json({ error: error.message });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get call statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const { date, startDate, endDate } = req.query;

    let query = supabase
      .from('call_logs')
      .select('id, call_type, outcome, duration_seconds, sentiment_score');

    // Filter by date
    if (date) {
      const dateStr = date as string;
      query = query
        .gte('created_at', `${dateStr}T00:00:00`)
        .lte('created_at', `${dateStr}T23:59:59`);
    } else if (startDate && endDate) {
      query = query
        .gte('created_at', startDate as string)
        .lte('created_at', endDate as string);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('created_at', thirtyDaysAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching call statistics:', error);
      return res.status(500).json({ error: error.message });
    }

    // Calculate statistics
    const totalCalls = data?.length || 0;
    const inboundCalls = data?.filter(c => c.call_type === 'inbound').length || 0;
    const outboundCalls = data?.filter(c => c.call_type === 'outbound').length || 0;
    const appointmentsBooked = data?.filter(c => c.outcome === 'appointment_booked').length || 0;
    const avgDuration = totalCalls > 0
      ? data?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) / totalCalls
      : 0;
    const avgSentiment = totalCalls > 0
      ? data?.reduce((sum, c) => sum + (c.sentiment_score || 0), 0) / totalCalls
      : 0;

    res.json({
      totalCalls,
      inboundCalls,
      outboundCalls,
      appointmentsBooked,
      conversionRate: totalCalls > 0 ? (appointmentsBooked / totalCalls) * 100 : 0,
      avgDurationSeconds: Math.round(avgDuration),
      avgSentimentScore: Number(avgSentiment.toFixed(2))
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;