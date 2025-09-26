import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import elevenLabsService from '../services/elevenlabsService';
import twilioService from '../services/twilioService';
import supabaseService from '../services/supabaseService';
import reservationService from '../services/reservationService';
import WebSocket from 'ws';

const router = Router();

// Twilio webhook validation middleware
const twilioWebhookAuth = (req: Request, res: Response, next: Function) => {
  const twilioSignature = req.headers['x-twilio-signature'] as string;
  const url = `${process.env.WEBHOOK_BASE_URL}${req.originalUrl}`;
  const params = req.body;

  if (process.env.NODE_ENV === 'production' && !twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    twilioSignature,
    url,
    params
  )) {
    return res.status(403).json({ error: 'Invalid Twilio signature' });
  }
  next();
};

// ElevenLabs webhook validation
const elevenLabsWebhookAuth = (req: Request, res: Response, next: Function) => {
  const webhookSecret = req.headers['x-webhook-secret'];
  if (process.env.NODE_ENV === 'production' && webhookSecret !== process.env.ELEVENLABS_WEBHOOK_SECRET) {
    return res.status(403).json({ error: 'Invalid webhook secret' });
  }
  next();
};

// ============= ElevenLabs Webhooks =============

/**
 * Webhook for ElevenLabs conversation events
 */
router.post('/elevenlabs', elevenLabsWebhookAuth, async (req: Request, res: Response) => {
  try {
    const event = req.body;
    console.log('ElevenLabs webhook received:', event.type);

    switch (event.type) {
      case 'conversation.started':
        await handleConversationStarted(event);
        break;

      case 'conversation.ended':
        await handleConversationEnded(event);
        break;

      case 'tool.called':
        await handleToolCall(event);
        break;

      case 'transcript.updated':
        await handleTranscriptUpdate(event);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('ElevenLabs webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function handleConversationStarted(event: any) {
  const { conversation_id, metadata } = event;

  // Create initial call log
  await supabaseService.createCallLog({
    call_id: conversation_id,
    call_type: metadata?.call_type || 'inbound',
    phone_number: metadata?.phone_number || 'unknown',
    outcome: 'in_progress',
    lead_id: metadata?.lead_id
  });
}

async function handleConversationEnded(event: any) {
  const { conversation_id, duration, transcript, metadata } = event;

  // Update call log with final details
  await supabaseService.updateCallLog(conversation_id, {
    duration_seconds: duration,
    transcript: transcript,
    outcome: metadata?.outcome || 'completed'
  });

  // If this was an outbound lead call, update the lead status
  if (metadata?.lead_id) {
    await supabaseService.updateLead(metadata.lead_id, {
      status: metadata?.outcome === 'booked' ? 'booked' : 'called',
      last_called: new Date().toISOString(),
      notes: metadata?.notes
    });
  }
}

async function handleToolCall(event: any) {
  const { tool_name, parameters, conversation_id } = event;

  let result;
  switch (tool_name) {
    case 'check_availability':
      result = await reservationService.checkAvailability(parameters.date);
      break;

    case 'book_reservation':
      result = await reservationService.bookAppointment({
        ...parameters,
        created_by: 'ai_agent',
        conversation_id
      });
      break;

    case 'get_guest_info':
      result = await reservationService.getPatientInfo(parameters.phone);
      break;

    default:
      console.log('Unknown tool:', tool_name);
  }

  return result;
}

async function handleTranscriptUpdate(event: any) {
  const { conversation_id, transcript } = event;

  // Store transcript updates if needed
  console.log('Transcript update for:', conversation_id);
}

// ============= Twilio Webhooks =============

/**
 * Webhook for incoming Twilio voice calls
 */
router.post('/twilio/voice', twilioWebhookAuth, async (req: Request, res: Response) => {
  try {
    const { From, To, CallSid, CallStatus } = req.body;

    console.log('Incoming call:', { From, To, CallSid, CallStatus });

    // Log the incoming call
    await supabaseService.createCallLog({
      call_id: CallSid,
      call_type: 'inbound',
      phone_number: From,
      outcome: 'transferring_to_ai'
    });

    // Transfer to ElevenLabs AI agent
    const twiml = twilioService.generateElevenLabsConnection();

    res.type('text/xml');
    res.send(twiml);
  } catch (error: any) {
    console.error('Twilio voice webhook error:', error);
    res.status(500).send('Error processing call');
  }
});

/**
 * Webhook for Twilio call status updates
 */
router.post('/twilio/status', twilioWebhookAuth, async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, RecordingUrl } = req.body;

    console.log('Call status update:', { CallSid, CallStatus, CallDuration });

    // Update call log
    await supabaseService.updateCallLog(CallSid, {
      duration_seconds: parseInt(CallDuration || '0'),
      recording_url: RecordingUrl,
      outcome: CallStatus
    });

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Twilio status webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook for incoming SMS messages
 */
router.post('/twilio/sms', twilioWebhookAuth, async (req: Request, res: Response) => {
  try {
    const { From, Body, MessageSid } = req.body;
    const message = Body.toLowerCase().trim();

    console.log('Incoming SMS:', { From, Body, MessageSid });

    let response = '';

    // Handle reservation confirmations/cancellations
    if (message === 'confirm') {
      const reservation = await reservationService.confirmAppointmentByPhone(From);
      response = reservation.success
        ? 'Your reservation has been confirmed. See you soon!'
        : 'No pending reservations found. Please call us for assistance.';
    } else if (message === 'cancel') {
      const reservation = await reservationService.cancelAppointmentByPhone(From);
      response = reservation.success
        ? 'Your reservation has been cancelled. Call us to reschedule.'
        : 'No reservations found. Please call us for assistance.';
    } else if (message === 'reschedule') {
      response = `To reschedule, please call us at ${process.env.CLINIC_PHONE}`;
    } else {
      response = `Thank you for contacting ${process.env.CLINIC_NAME}. For reservations, please call ${process.env.CLINIC_PHONE}`;
    }

    // Send response
    await twilioService.sendSMS({
      to: From,
      body: response
    });

    res.status(200).send('');
  } catch (error: any) {
    console.error('Twilio SMS webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook for connecting Twilio to ElevenLabs
 */
router.post('/twilio/connect-elevenlabs', twilioWebhookAuth, async (req: Request, res: Response) => {
  try {
    const { CallSid, From } = req.body;

    // Create ElevenLabs phone call
    const result = await elevenLabsService.createPhoneCall({
      phoneNumber: From,
      metadata: {
        twilio_call_sid: CallSid,
        call_type: 'inbound'
      }
    });

    if (result.success) {
      // Generate TwiML to connect the call
      const twiml = twilioService.generateElevenLabsConnection();
      res.type('text/xml');
      res.send(twiml);
    } else {
      // Fallback to error message
      const twiml = twilioService.generateVoiceResponse(
        'We apologize, but our AI assistant is temporarily unavailable. Please try again later.'
      );
      res.type('text/xml');
      res.send(twiml);
    }
  } catch (error: any) {
    console.error('Connect to ElevenLabs error:', error);
    const twiml = twilioService.generateVoiceResponse(
      'An error occurred. Please try again later.'
    );
    res.type('text/xml');
    res.send(twiml);
  }
});

// ============= Tool Webhooks for ElevenLabs =============

/**
 * Tool Webhook: Check Availability
 */
router.post('/tools/check-availability', async (req: Request, res: Response) => {
  try {
    const { date, service_type } = req.body;

    // Query available slots from Supabase
    const slots = await reservationService.checkAvailability(date);

    // Format response for ElevenLabs
    const response = {
      available: slots.length > 0,
      slots: slots.map((slot: any) => ({
        time: slot.start_time,
        dentist: slot.dentist_name,
        duration: slot.duration_minutes
      })),
      message: slots.length > 0
        ? `I have ${slots.length} available slots on ${date}. ${slots.slice(0, 3).map((s: any) => `${s.start_time} with Dr. ${s.dentist_name}`).join(', ')}`
        : `I'm sorry, we don't have any available slots on ${date}. Would you like me to check another date?`
    };

    res.json(response);
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

/**
 * Tool Webhook: Book Appointment
 */
router.post('/tools/book-reservation', async (req: Request, res: Response) => {
  try {
    const {
      guest_name,
      guest_phone,
      guest_email,
      reservation_date,
      reservation_time,
      service_type,
      notes
    } = req.body;

    // Book the reservation
    const result = await reservationService.bookAppointment({
      guest_name,
      guest_phone,
      guest_email,
      reservation_date,
      reservation_time,
      service_type,
      procedure_type: service_type,
      notes,
      created_by: 'ai_agent',
      conversation_id: req.body.conversation_id
    });

    if (result.success && (result as any).reservation) {
      const reservation = (result as any).reservation;
      // Send confirmation SMS
      await twilioService.sendSMS({
        to: guest_phone,
        body: `Your reservation at ${process.env.CLINIC_NAME} is confirmed for ${reservation_date} at ${reservation_time}. Confirmation #${reservation.id}. Reply CANCEL to cancel.`
      });

      res.json({
        success: true,
        reservation_id: reservation.id,
        message: `Perfect! I've booked your reservation for ${reservation_date} at ${reservation_time}. You'll receive a confirmation text shortly. Your confirmation number is ${reservation.id}.`
      });
    } else {
      throw new Error((result as any).error || 'Failed to book reservation');
    }
  } catch (error) {
    console.error('Error booking reservation:', error);
    res.status(500).json({
      success: false,
      message: 'I\'m sorry, I couldn\'t complete the booking. Please try again or call us directly.'
    });
  }
});

/**
 * Tool Webhook: Check Patient Record
 */
router.post('/tools/check-guest', async (req: Request, res: Response) => {
  try {
    const { phone_number, guest_name } = req.body;

    const result = await reservationService.getPatientInfo(phone_number || guest_name);

    if (result.success && result.guest) {
      res.json({
        found: true,
        guest: {
          name: result.guest.name,
          last_visit: result.guest.lastVisit,
          upcoming_reservations: result.guest.upcomingAppointments
        },
        message: `Yes, I found your record. ${result.guest.upcomingAppointments?.length > 0 ? 'You have upcoming reservations.' : 'You don\'t have any upcoming reservations.'}`
      });
    } else {
      res.json({
        found: false,
        message: 'I couldn\'t find your record. No problem, I can still help you book an reservation as a new guest.'
      });
    }
  } catch (error) {
    console.error('Error checking guest record:', error);
    res.status(500).json({ error: 'Failed to check guest record' });
  }
});

/**
 * Tool Webhook: Send Reminder
 */
router.post('/tools/send-reminder', async (req: Request, res: Response) => {
  try {
    const { phone_number, reservation_details } = req.body;

    await twilioService.sendSMS({
      to: phone_number,
      body: `Reminder: ${reservation_details}. Reply CONFIRM to confirm or CANCEL to cancel.`
    });

    res.json({
      success: true,
      message: 'I\'ve sent a reminder to your phone.'
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// ============= Health Check =============

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    webhooks: {
      elevenlabs: 'active',
      twilio: 'active',
      tools: ['check-availability', 'book-reservation', 'check-guest', 'send-reminder']
    }
  });
});

/**
 * WebSocket Bridge for Twilio-ElevenLabs Media Streams
 */
export function setupWebSocketBridge(wss: WebSocket.Server) {
  wss.on('connection', (ws: WebSocket, req: any) => {
    if (req.url === '/websocket/twilio-elevenlabs') {
      console.log('New WebSocket connection for Twilio-ElevenLabs bridge');

      // Create connection to ElevenLabs
      const elevenLabsWs = new WebSocket(`wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${process.env.ELEVENLABS_AGENT_ID}`, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!
        }
      });

      // Bridge Twilio -> ElevenLabs
      ws.on('message', (data) => {
        if (elevenLabsWs.readyState === WebSocket.OPEN) {
          elevenLabsWs.send(data);
        }
      });

      // Bridge ElevenLabs -> Twilio
      elevenLabsWs.on('message', (data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Handle disconnections
      ws.on('close', () => {
        elevenLabsWs.close();
      });

      elevenLabsWs.on('close', () => {
        ws.close();
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('Twilio WebSocket error:', error);
        elevenLabsWs.close();
      });

      elevenLabsWs.on('error', (error) => {
        console.error('ElevenLabs WebSocket error:', error);
        ws.close();
      });
    }
  });
}

export default router;