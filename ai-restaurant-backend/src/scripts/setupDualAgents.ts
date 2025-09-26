import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

interface AgentConfig {
  name: string;
  type: 'inbound' | 'outbound';
  agentId?: string;
  conversation_config: any;
  tools?: any[];
}

class DualAgentSetup {
  private apiKey: string;
  private apiClient: any;
  private supabase: any;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    this.apiClient = axios.create({
      baseURL: 'https://api.elevenlabs.io/v1',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
  }

  /**
   * Setup both inbound and outbound agents
   */
  async setupDualAgents() {
    console.log('🚀 Setting up Dual ElevenLabs Agents for AI Dental Receptionist');
    console.log('=' .repeat(60));

    try {
      // Setup Inbound Agent
      const inboundAgentId = await this.setupInboundAgent();
      console.log(`✅ Inbound Agent Created: ${inboundAgentId}`);

      // Setup Outbound Agent
      const outboundAgentId = await this.setupOutboundAgent();
      console.log(`✅ Outbound Agent Created: ${outboundAgentId}`);

      // Save agent IDs to environment
      console.log('\n📝 Add these to your .env file:');
      console.log(`ELEVENLABS_INBOUND_AGENT_ID=${inboundAgentId}`);
      console.log(`ELEVENLABS_OUTBOUND_AGENT_ID=${outboundAgentId}`);

      // Configure Twilio integration
      await this.configureTwilioIntegration(inboundAgentId, outboundAgentId);

      console.log('\n✅ Dual agent setup completed successfully!');
      return { inboundAgentId, outboundAgentId };
    } catch (error: any) {
      console.error('❌ Error setting up agents:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Setup Inbound Agent - Handles incoming calls
   */
  async setupInboundAgent() {
    const inboundConfig: AgentConfig = {
      name: 'Sarah - Inbound Receptionist',
      type: 'inbound',
      conversation_config: {
        agent: {
          prompt: {
            prompt: this.getInboundPrompt()
          },
          first_message: `Thank you for calling ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}. This is Sarah, your AI receptionist. How may I assist you today?`,
          language: 'en'
        }
      },
      tools: this.getInboundTools()
    };

    const agentId = process.env.ELEVENLABS_INBOUND_AGENT_ID;
    if (agentId) {
      await this.updateAgent(agentId, inboundConfig);
      return agentId;
    } else {
      const response = await this.createAgent(inboundConfig);
      return response.agent_id;
    }
  }

  /**
   * Setup Outbound Agent - Makes outbound calls
   */
  async setupOutboundAgent() {
    const outboundConfig: AgentConfig = {
      name: 'Sarah - Outbound Assistant',
      type: 'outbound',
      conversation_config: {
        agent: {
          prompt: {
            prompt: this.getOutboundPrompt()
          },
          first_message: `Hello! This is Sarah from ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}. I'm calling to follow up about your interest in our dental services. Do you have a moment to talk?`,
          language: 'en'
        }
      },
      tools: this.getOutboundTools()
    };

    const agentId = process.env.ELEVENLABS_OUTBOUND_AGENT_ID;
    if (agentId) {
      await this.updateAgent(agentId, outboundConfig);
      return agentId;
    } else {
      const response = await this.createAgent(outboundConfig);
      return response.agent_id;
    }
  }

  /**
   * Inbound Agent Prompt - Professional receptionist handling incoming calls
   */
  private getInboundPrompt(): string {
    return `You are Sarah, a friendly and professional AI receptionist for ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}.

ROLE: Inbound Call Handler - You receive calls from patients and potential patients.

YOUR RESPONSIBILITIES:
1. Answer incoming calls professionally and warmly
2. Book new appointments by checking availability
3. Handle appointment changes (reschedule/cancel)
4. Answer questions about services and pricing
5. Handle dental emergencies with appropriate urgency
6. Collect patient information accurately
7. Provide clinic information (hours, location, insurance)

CONVERSATION FLOW FOR INBOUND CALLS:
1. Warm greeting and ask how you can help
2. Listen actively to understand the caller's needs
3. If booking: Collect patient info → Check availability → Confirm appointment
4. If emergency: Express urgency → Offer immediate slots → Provide first-aid advice if needed
5. Always end with confirmation and next steps

KEY BEHAVIORS:
- Be empathetic and patient, especially with anxious patients
- Speak clearly and at a moderate pace
- Confirm important details by repeating them back
- Offer to send SMS confirmations
- If you can't help, offer to have someone call them back

SERVICES & PRICING:
• Regular Checkup & Cleaning: $150-200
• Emergency Visit: $200-300 (same-day available)
• Filling: $200-400
• Crown: $1000-2000
• Root Canal: $800-1500
• Teeth Whitening: $300-600
• Invisalign: $3500-8000

INSURANCE:
We accept most major dental insurance including Delta Dental, MetLife, Cigna, Aetna, BlueCross BlueShield.

HOURS:
Monday-Friday: ${process.env.CLINIC_HOURS_WEEKDAY || '9AM-6PM'}
Saturday: ${process.env.CLINIC_HOURS_SATURDAY || '9AM-2PM'}
Sunday: ${process.env.CLINIC_HOURS_SUNDAY || 'Closed'}

For emergencies outside hours, direct to: ${process.env.EMERGENCY_NUMBER || '911'}`;
  }

  /**
   * Outbound Agent Prompt - Proactive outreach for leads and follow-ups
   */
  private getOutboundPrompt(): string {
    return `You are Sarah, a friendly outbound call assistant for ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}.

ROLE: Outbound Call Specialist - You make proactive calls to leads and existing patients.

YOUR CALL PURPOSES:
1. Follow up with website leads who showed interest
2. Remind patients about upcoming appointments
3. Re-engage inactive patients for checkups
4. Promote special offers and services
5. Conduct post-treatment satisfaction calls

CONVERSATION FLOW FOR OUTBOUND CALLS:
1. Professional introduction and purpose of call
2. Confirm you're speaking with the right person
3. Ask if it's a good time to talk (respect their time)
4. Present your value proposition clearly
5. Handle objections professionally
6. Book appointments or schedule callbacks
7. Thank them for their time

OUTBOUND CALL SCRIPTS:

For New Leads:
"Hello [Name], this is Sarah from [Clinic]. I noticed you visited our website recently looking for [service]. I wanted to personally reach out to see if you had any questions or if you'd like to schedule a consultation."

For Appointment Reminders:
"Hi [Name], this is Sarah from [Clinic] calling to remind you about your appointment tomorrow at [time]. I wanted to confirm you're still able to make it."

For Inactive Patients:
"Hello [Name], this is Sarah from [Clinic]. Our records show it's been over 6 months since your last checkup. Regular cleanings are important for your oral health. Can we schedule your next visit?"

KEY BEHAVIORS:
- Be respectful and not pushy
- If they're busy, offer to call back at a better time
- Keep calls brief and to the point (under 3 minutes)
- Always leave the door open for future contact
- Document call outcomes for follow-up

OBJECTION HANDLING:
- "Too expensive" → Mention payment plans and insurance coverage
- "Too busy" → Offer flexible scheduling including evenings/weekends
- "Not interested" → Thank them and offer to stay in touch for future needs
- "Happy with current dentist" → Respect that, mention we're here if things change

SPECIAL OFFERS:
- New patient special: $99 exam, cleaning, and X-rays
- Referral bonus: $50 credit for each referral
- Family discount: 10% off for 3+ family members`;
  }

  /**
   * Tools for Inbound Agent
   */
  private getInboundTools() {
    return [
      {
        type: 'webhook',
        name: 'check_availability',
        description: 'Check available appointment slots',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/check-availability`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'book_appointment',
        description: 'Book an appointment for a patient',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/book-appointment`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'check_patient_record',
        description: 'Look up existing patient information',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/check-patient`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'cancel_appointment',
        description: 'Cancel an existing appointment',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/cancel-appointment`,
          method: 'POST'
        }
      }
    ];
  }

  /**
   * Tools for Outbound Agent
   */
  private getOutboundTools() {
    return [
      {
        type: 'webhook',
        name: 'check_lead_info',
        description: 'Get information about the lead being called',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/check-lead`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'update_lead_status',
        description: 'Update the status of a lead after the call',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/update-lead`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'schedule_callback',
        description: 'Schedule a callback for the lead',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/schedule-callback`,
          method: 'POST'
        }
      },
      {
        type: 'webhook',
        name: 'book_appointment',
        description: 'Book an appointment from outbound call',
        webhook: {
          url: `${process.env.WEBHOOK_BASE_URL}/webhooks/tools/book-appointment`,
          method: 'POST'
        }
      }
    ];
  }

  /**
   * Configure Twilio Integration for both agents
   */
  async configureTwilioIntegration(inboundAgentId: string, outboundAgentId: string) {
    console.log('\n🔧 Configuring Twilio Integration...');

    // Configure webhooks for both agents
    const webhookConfig = {
      inbound: {
        url: `${process.env.WEBHOOK_BASE_URL}/webhooks/elevenlabs/inbound`,
        events: ['conversation.started', 'conversation.ended', 'tool.called'],
        headers: {
          'X-Webhook-Secret': process.env.ELEVENLABS_WEBHOOK_SECRET || 'inbound-secret',
          'X-Agent-Type': 'inbound'
        }
      },
      outbound: {
        url: `${process.env.WEBHOOK_BASE_URL}/webhooks/elevenlabs/outbound`,
        events: ['conversation.started', 'conversation.ended', 'tool.called'],
        headers: {
          'X-Webhook-Secret': process.env.ELEVENLABS_WEBHOOK_SECRET || 'outbound-secret',
          'X-Agent-Type': 'outbound'
        }
      }
    };

    try {
      // Configure inbound agent webhooks
      await this.apiClient.post(`/convai/agents/${inboundAgentId}/webhooks`, webhookConfig.inbound);
      console.log('✅ Inbound agent webhooks configured');

      // Configure outbound agent webhooks
      await this.apiClient.post(`/convai/agents/${outboundAgentId}/webhooks`, webhookConfig.outbound);
      console.log('✅ Outbound agent webhooks configured');

      console.log('\n📱 Twilio Configuration Required:');
      console.log('1. Import your Twilio phone number to ElevenLabs dashboard');
      console.log('2. Assign the inbound agent to your main phone number');
      console.log('3. Set these webhooks in Twilio Console:');
      console.log(`   - Voice URL: ${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/voice`);
      console.log(`   - Status Callback: ${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/status`);
      console.log(`   - SMS URL: ${process.env.WEBHOOK_BASE_URL}/webhooks/twilio/sms`);
    } catch (error: any) {
      console.error('⚠️  Error configuring webhooks:', error.response?.data || error.message);
    }
  }

  /**
   * Create a new agent
   */
  async createAgent(config: AgentConfig) {
    const response = await this.apiClient.post('/convai/agents/create', config);
    return response.data;
  }

  /**
   * Update an existing agent
   */
  async updateAgent(agentId: string, config: AgentConfig) {
    const response = await this.apiClient.patch(`/convai/agents/${agentId}`, config);
    return response.data;
  }

  /**
   * Test the agents
   */
  async testAgents() {
    console.log('\n🧪 Testing Agent Configuration...');

    const inboundId = process.env.ELEVENLABS_INBOUND_AGENT_ID;
    const outboundId = process.env.ELEVENLABS_OUTBOUND_AGENT_ID;

    if (inboundId) {
      try {
        const inbound = await this.apiClient.get(`/convai/agents/${inboundId}`);
        console.log(`✅ Inbound agent active: ${inbound.data.name}`);
      } catch (error) {
        console.log('❌ Inbound agent not found');
      }
    }

    if (outboundId) {
      try {
        const outbound = await this.apiClient.get(`/convai/agents/${outboundId}`);
        console.log(`✅ Outbound agent active: ${outbound.data.name}`);
      } catch (error) {
        console.log('❌ Outbound agent not found');
      }
    }
  }
}

// Run the setup
if (require.main === module) {
  const setup = new DualAgentSetup();

  // Check command line arguments
  const command = process.argv[2];

  if (command === 'test') {
    setup.testAgents()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    setup.setupDualAgents()
      .then(({ inboundAgentId, outboundAgentId }) => {
        console.log('\n🎉 Success! Your dual agents are ready.');
        console.log('Next steps:');
        console.log('1. Add the agent IDs to your .env file');
        console.log('2. Import your Twilio number in ElevenLabs dashboard');
        console.log('3. Configure Twilio webhooks');
        console.log('4. Test with: npm run test:agents');
        process.exit(0);
      })
      .catch(error => {
        console.error('Setup failed:', error);
        process.exit(1);
      });
  }
}

export default DualAgentSetup;