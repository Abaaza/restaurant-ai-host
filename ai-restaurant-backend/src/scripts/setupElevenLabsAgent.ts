import axios from 'axios';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const WEBHOOK_BASE_URL = process.env.WEBHOOK_BASE_URL || 'http://localhost:5000';

interface AgentConfig {
  name: string;
  conversation_config: {
    agent: {
      prompt: {
        prompt: string;
      };
      first_message: string;
      language: string;
    };
  };
  platform_settings?: {
    twilio?: {
      account_sid?: string;
      auth_token?: string;
      phone_number?: string;
    };
  };
  tools?: Array<{
    type: string;
    name: string;
    description: string;
    webhook?: {
      url: string;
      method: string;
      headers?: Record<string, string>;
    };
    parameters?: Array<{
      name: string;
      type: string;
      description: string;
      required: boolean;
    }>;
  }>;
}

class ElevenLabsAgentSetup {
  private apiKey: string;
  private apiClient: any;
  private supabase: any;

  constructor() {
    this.apiKey = ELEVENLABS_API_KEY;
    this.apiClient = axios.create({
      baseURL: 'https://api.elevenlabs.io/v1',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json'
      }
    });

    this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  }

  /**
   * Create or update the AI dental receptionist agent
   */
  async setupAgent() {
    console.log('Setting up ElevenLabs AI Dental Receptionist Agent...');

    const agentConfig: AgentConfig = {
      name: 'Sarah - AI Dental Receptionist',
      conversation_config: {
        agent: {
          prompt: {
            prompt: this.getSystemPrompt()
          },
          first_message: `Thank you for calling ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}. This is Sarah, your AI receptionist. How may I assist you today?`,
          language: 'en'
        }
      },
      platform_settings: {
        twilio: {
          account_sid: process.env.TWILIO_ACCOUNT_SID,
          auth_token: process.env.TWILIO_AUTH_TOKEN,
          phone_number: process.env.TWILIO_PHONE_NUMBER
        }
      },
      tools: this.getAgentTools()
    };

    try {
      // Check if agent exists
      let agentId = process.env.ELEVENLABS_AGENT_ID;

      if (agentId) {
        // Update existing agent
        console.log(`Updating existing agent: ${agentId}`);
        await this.updateAgent(agentId, agentConfig);
      } else {
        // Create new agent
        console.log('Creating new agent...');
        const response = await this.createAgent(agentConfig);
        agentId = response.agent_id;
        console.log(`Agent created with ID: ${agentId}`);
        console.log('Please add this ID to your .env file as ELEVENLABS_AGENT_ID');
      }

      // Configure webhooks
      await this.configureWebhooks(agentId);

      console.log('Agent setup completed successfully!');
      return agentId;
    } catch (error: any) {
      console.error('Error setting up agent:', error.response?.data || error.message);
      throw error;
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
   * Configure webhooks for the agent
   */
  async configureWebhooks(agentId: string) {
    console.log('Configuring webhooks...');

    const webhookConfig = {
      url: `${WEBHOOK_BASE_URL}/api/webhooks/elevenlabs`,
      events: [
        'conversation.started',
        'conversation.ended',
        'conversation.transcript.updated',
        'tool.called',
        'conversation.error'
      ],
      headers: {
        'X-Webhook-Secret': process.env.ELEVENLABS_WEBHOOK_SECRET || 'default-secret'
      }
    };

    try {
      await this.apiClient.post(`/convai/agents/${agentId}/webhooks`, webhookConfig);
      console.log('Webhooks configured successfully');
    } catch (error: any) {
      console.error('Error configuring webhooks:', error.response?.data || error.message);
    }
  }

  /**
   * Get the system prompt for the dental receptionist
   */
  private getSystemPrompt(): string {
    return `You are Sarah, a friendly and professional AI receptionist for ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}.

YOUR PERSONALITY:
- Warm, empathetic, and patient
- Professional yet approachable
- Clear and articulate speaker
- Good listener who confirms understanding

YOUR PRIMARY RESPONSIBILITIES:
1. Answer incoming calls professionally
2. Book appointments by checking availability
3. Answer questions about the clinic and services
4. Handle dental emergencies with appropriate urgency
5. Collect and verify patient information
6. Provide information about insurance and payments
7. Transfer calls when necessary

CLINIC INFORMATION:
- Name: ${process.env.CLINIC_NAME || 'Bright Smile Dental Clinic'}
- Address: ${process.env.CLINIC_ADDRESS || '123 Main St, City, State 12345'}
- Phone: ${process.env.CLINIC_PHONE || '+1234567890'}
- Email: ${process.env.CLINIC_EMAIL || 'info@brightsmileclinic.com'}
- Hours:
  • Monday-Friday: ${process.env.CLINIC_HOURS_WEEKDAY || '9:00 AM - 6:00 PM'}
  • Saturday: ${process.env.CLINIC_HOURS_SATURDAY || '9:00 AM - 2:00 PM'}
  • Sunday: ${process.env.CLINIC_HOURS_SUNDAY || 'Closed'}
- Emergency Line: ${process.env.EMERGENCY_NUMBER || 'Call 911 for severe emergencies'}

SERVICES OFFERED:
• Regular Checkups & Cleanings ($150-200)
• Emergency Dental Care (Same-day appointments available)
• Fillings & Restorations ($200-400)
• Root Canal Treatment ($800-1500)
• Tooth Extractions ($150-400)
• Crowns & Bridges ($1000-2000 per tooth)
• Teeth Whitening ($300-600)
• Orthodontics - Braces ($3000-7000)
• Orthodontics - Invisalign ($3500-8000)
• Dental Implants ($3000-5000 per tooth)
• Periodontal Treatment
• Pediatric Dentistry

INSURANCE INFORMATION:
- We accept most major dental insurance plans including Delta Dental, MetLife, Cigna, Aetna, and BlueCross BlueShield
- We offer payment plans through CareCredit
- Cash, credit card, and check payments accepted
- New patient special: $99 for exam, cleaning, and X-rays

APPOINTMENT BOOKING PROCESS:
1. Greet the caller warmly
2. Ask for the reason for their visit
3. Collect patient information:
   - Full name
   - Phone number
   - Email (optional)
   - Date of birth (for existing patients)
   - Insurance information (if applicable)
4. Use check_availability tool to find available slots
5. Offer 2-3 appointment options
6. Confirm the appointment using book_appointment tool
7. Provide appointment confirmation number
8. Remind about any preparation needed
9. Ask if they need directions to the clinic

HANDLING DENTAL EMERGENCIES:
For the following situations, express urgency and offer same-day appointments:
- Severe tooth pain
- Knocked-out tooth (advise to keep tooth moist)
- Broken or chipped tooth with pain
- Dental abscess or facial swelling
- Bleeding that won't stop
- Lost filling or crown causing pain

For severe emergencies (facial swelling affecting breathing, uncontrolled bleeding), advise to call 911 or visit the ER immediately.

CONVERSATION GUIDELINES:
- Always start with a warm greeting
- Listen actively and don't interrupt
- Speak clearly and at a moderate pace
- Confirm important information by repeating it back
- If you don't understand, politely ask for clarification
- Use empathetic language for patients in pain
- Offer to repeat information if needed
- End calls by asking if there's anything else you can help with
- Thank them for calling and wish them a good day

WHEN TO TRANSFER CALLS:
Transfer to a human staff member for:
- Complex insurance questions
- Detailed treatment planning
- Billing disputes
- Patient complaints
- Medical history complications
- Requests specifically asking for a human

SAMPLE RESPONSES:

For appointment booking:
"I'd be happy to schedule an appointment for you. May I have your full name and phone number? What's the reason for your visit today?"

For emergency:
"I understand you're in pain, and I want to help you right away. Can you describe what you're experiencing? We have emergency slots available today."

For pricing questions:
"The cost for [service] typically ranges from $X to $Y. We accept most major insurance plans. Would you like me to check if we accept your specific insurance?"

For new patients:
"Welcome to [Clinic Name]! We're excited to have you as a new patient. We have a special offer for new patients - $99 for a comprehensive exam, cleaning, and X-rays."

REMEMBER:
- Patient confidentiality is paramount
- Be HIPAA compliant - don't discuss patient information with unauthorized persons
- Always maintain a professional demeanor
- Show empathy and understanding
- Focus on helping the patient feel comfortable and cared for`;
  }

  /**
   * Define the tools available to the agent
   */
  private getAgentTools() {
    return [
      {
        type: 'webhook',
        name: 'check_availability',
        description: 'Check available appointment slots for a given date range',
        webhook: {
          url: `${WEBHOOK_BASE_URL}/api/webhooks/tools/check-availability`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'internal-api-key'}`
          }
        },
        parameters: [
          {
            name: 'date',
            type: 'string',
            description: 'The date to check availability (YYYY-MM-DD)',
            required: true
          },
          {
            name: 'service_type',
            type: 'string',
            description: 'Type of dental service needed',
            required: false
          }
        ]
      },
      {
        type: 'webhook',
        name: 'book_appointment',
        description: 'Book an appointment for a patient',
        webhook: {
          url: `${WEBHOOK_BASE_URL}/api/webhooks/tools/book-appointment`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'internal-api-key'}`
          }
        },
        parameters: [
          {
            name: 'patient_name',
            type: 'string',
            description: 'Full name of the patient',
            required: true
          },
          {
            name: 'patient_phone',
            type: 'string',
            description: 'Patient phone number',
            required: true
          },
          {
            name: 'patient_email',
            type: 'string',
            description: 'Patient email address',
            required: false
          },
          {
            name: 'appointment_date',
            type: 'string',
            description: 'Date of appointment (YYYY-MM-DD)',
            required: true
          },
          {
            name: 'appointment_time',
            type: 'string',
            description: 'Time of appointment (HH:MM)',
            required: true
          },
          {
            name: 'service_type',
            type: 'string',
            description: 'Type of dental service',
            required: true
          },
          {
            name: 'notes',
            type: 'string',
            description: 'Additional notes or special requests',
            required: false
          }
        ]
      },
      {
        type: 'webhook',
        name: 'check_patient_record',
        description: 'Look up existing patient information',
        webhook: {
          url: `${WEBHOOK_BASE_URL}/api/webhooks/tools/check-patient`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'internal-api-key'}`
          }
        },
        parameters: [
          {
            name: 'phone_number',
            type: 'string',
            description: 'Patient phone number',
            required: false
          },
          {
            name: 'patient_name',
            type: 'string',
            description: 'Patient name',
            required: false
          }
        ]
      },
      {
        type: 'webhook',
        name: 'send_appointment_reminder',
        description: 'Send SMS appointment reminder to patient',
        webhook: {
          url: `${WEBHOOK_BASE_URL}/api/webhooks/tools/send-reminder`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.API_KEY || 'internal-api-key'}`
          }
        },
        parameters: [
          {
            name: 'phone_number',
            type: 'string',
            description: 'Patient phone number',
            required: true
          },
          {
            name: 'appointment_details',
            type: 'string',
            description: 'Appointment date, time and service',
            required: true
          }
        ]
      }
    ];
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  const setup = new ElevenLabsAgentSetup();
  setup.setupAgent()
    .then(agentId => {
      console.log('✅ Agent setup completed successfully!');
      console.log(`Agent ID: ${agentId}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Agent setup failed:', error);
      process.exit(1);
    });
}

export default ElevenLabsAgentSetup;