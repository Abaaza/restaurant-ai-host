import axios, { AxiosInstance } from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface ElevenLabsConfig {
  apiKey: string;
  agentId: string;
  webhookUrl?: string;
}

interface PhoneCallRequest {
  phoneNumber: string;
  metadata?: Record<string, any>;
  initialMessage?: string;
}

interface ConversationData {
  customer_id: string;
  agent_id: string;
  call_id: string;
  conversation_id: string;
  metadata?: Record<string, any>;
}

export class ElevenLabsService {
  private client: AxiosInstance;
  private config: ElevenLabsConfig;

  constructor() {
    this.config = {
      apiKey: process.env.ELEVENLABS_API_KEY!,
      agentId: process.env.ELEVENLABS_AGENT_ID!,
      webhookUrl: `${process.env.WEBHOOK_BASE_URL}/webhooks/elevenlabs`
    };

    this.client = axios.create({
      baseURL: 'https://api.elevenlabs.io/v1',
      headers: {
        'xi-api-key': this.config.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create a phone call with the AI agent
   */
  async createPhoneCall(request: PhoneCallRequest) {
    try {
      const response = await this.client.post('/convai/conversation/create_phone_call', {
        agent_id: this.config.agentId,
        customer: {
          number: request.phoneNumber
        },
        metadata: {
          ...request.metadata,
          call_id: uuidv4(),
          timestamp: new Date().toISOString()
        },
        webhook_url: this.config.webhookUrl
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error creating phone call:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get agent details
   */
  async getAgent() {
    try {
      const response = await this.client.get(`/convai/agents/${this.config.agentId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching agent:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Update agent configuration
   */
  async updateAgent(updates: any) {
    try {
      const response = await this.client.patch(`/convai/agents/${this.config.agentId}`, updates);
      return response.data;
    } catch (error: any) {
      console.error('Error updating agent:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  async getConversation(conversationId: string) {
    try {
      const response = await this.client.get(`/convai/conversations/${conversationId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching conversation:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get conversation transcript
   */
  async getTranscript(conversationId: string) {
    try {
      const response = await this.client.get(`/convai/conversations/${conversationId}/transcript`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching transcript:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get conversation audio recording
   */
  async getRecording(conversationId: string) {
    try {
      const response = await this.client.get(`/convai/conversations/${conversationId}/audio`, {
        responseType: 'arraybuffer'
      });
      return response.data;
    } catch (error: any) {
      console.error('Error fetching recording:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Configure agent prompt with dental clinic information
   */
  async configureAgentPrompt() {
    const systemPrompt = `You are Sarah, a friendly and professional AI receptionist for ${process.env.CLINIC_NAME}.

Your primary responsibilities:
1. Answer incoming calls professionally
2. Book appointments by checking availability
3. Answer questions about the clinic
4. Handle dental emergencies appropriately
5. Collect patient information

Clinic Information:
- Name: ${process.env.CLINIC_NAME}
- Address: ${process.env.CLINIC_ADDRESS}
- Phone: ${process.env.CLINIC_PHONE}
- Email: ${process.env.CLINIC_EMAIL}
- Hours:
  - Monday-Friday: ${process.env.CLINIC_HOURS_WEEKDAY}
  - Saturday: ${process.env.CLINIC_HOURS_SATURDAY}
  - Sunday: ${process.env.CLINIC_HOURS_SUNDAY}
- Emergency Line: ${process.env.EMERGENCY_NUMBER}

Services Offered:
- Regular Checkups & Cleanings
- Emergency Dental Care
- Fillings & Restorations
- Root Canal Treatment
- Tooth Extractions
- Crowns & Bridges
- Teeth Whitening
- Orthodontics (Braces/Invisalign)

When booking appointments:
1. Ask for patient's name and phone number
2. Ask for preferred date and time
3. Ask about the reason for visit
4. Check availability using the check_availability tool
5. Confirm the appointment using book_appointment tool
6. Provide confirmation details

For dental emergencies:
1. Express empathy and urgency
2. Ask about the nature of the emergency
3. Provide immediate care instructions
4. Offer emergency appointment slots
5. If severe, advise visiting emergency room

Always:
- Be empathetic and patient
- Speak clearly and at moderate pace
- Confirm important information
- Offer to repeat information if needed
- End calls professionally`;

    return this.updateAgent({
      prompt: {
        prompt: systemPrompt
      },
      first_message: `Thank you for calling ${process.env.CLINIC_NAME}. This is Sarah, your AI receptionist. How may I assist you today?`,
      language: 'en'
    });
  }

  /**
   * Create WebSocket connection for real-time conversation
   */
  createWebSocketConnection(sessionId: string) {
    const wsUrl = `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${this.config.agentId}`;

    // Return WebSocket URL and headers for client connection
    return {
      url: wsUrl,
      headers: {
        'xi-api-key': this.config.apiKey
      },
      sessionId
    };
  }

  /**
   * Process webhook data from ElevenLabs
   */
  processWebhook(data: any) {
    const eventType = data.type;

    switch (eventType) {
      case 'conversation.started':
        console.log('Conversation started:', data.conversation_id);
        break;

      case 'conversation.ended':
        console.log('Conversation ended:', data.conversation_id);
        // Process call summary, update database, etc.
        break;

      case 'conversation.transcript.updated':
        console.log('Transcript updated:', data.transcript);
        break;

      case 'tool.called':
        console.log('Tool called:', data.tool_name, data.parameters);
        // Handle tool calls (booking, checking availability, etc.)
        break;

      default:
        console.log('Unknown webhook event:', eventType);
    }

    return data;
  }
}

export default new ElevenLabsService();