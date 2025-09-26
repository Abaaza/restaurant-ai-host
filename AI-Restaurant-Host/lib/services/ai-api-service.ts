interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AIResponse {
  response: string;
  type: string;
  intent?: string;
  metadata?: any;
  reservation?: any;
  error?: string;
  isTrauma?: boolean;
  requiresER?: boolean;
  instructions?: string[];
}

interface ProcessContext {
  conversationId: string;
  history: ConversationMessage[];
  type: string;
  isVoice: boolean;
}

export class AIApiService {
  private conversationId: string;
  private conversationHistory: ConversationMessage[];
  private apiBaseUrl: string;

  constructor() {
    this.conversationId = Date.now().toString();
    this.conversationHistory = [];
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  }

  async processMessage(message: string): Promise<AIResponse> {
    try {
      // Add to conversation history
      this.conversationHistory.push({ role: 'user', content: message });
      
      // Keep only last 10 messages for context
      if (this.conversationHistory.length > 10) {
        this.conversationHistory = this.conversationHistory.slice(-10);
      }

      // Use Next.js API route for AI processing
      const response = await fetch(`${this.apiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: {
            conversationId: this.conversationId,
            history: this.conversationHistory,
            type: 'receptionist',
            isVoice: true
          } as ProcessContext
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Add AI response to history
      const responseText = data.message || data.response;
      this.conversationHistory.push({ 
        role: 'assistant', 
        content: responseText 
      });

      // Check if reservation was created
      if (data.reservation) {
        console.log('Reservation created:', data.reservation);
      }

      return {
        response: responseText,
        type: data.intent || 'general',
        intent: data.intent,
        metadata: data,
        reservation: data.reservation,
        isTrauma: data.isTrauma,
        requiresER: data.requiresER,
        instructions: data.instructions
      };
    } catch (error) {
      console.error('AI API Error:', error);
      
      // Fallback to a simple response if API fails
      return {
        response: "I apologize, I'm having trouble processing your request. Could you please try again?",
        type: 'error',
        error: (error as Error).message
      };
    }
  }

  resetConversation(): void {
    this.conversationId = Date.now().toString();
    this.conversationHistory = [];
  }

  getConversationHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  getConversationId(): string {
    return this.conversationId;
  }
}

// Create singleton instance
export const aiApiService = new AIApiService();
export default aiApiService;