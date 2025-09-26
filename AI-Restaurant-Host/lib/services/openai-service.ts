import OpenAI from 'openai';

// System prompts for different conversation types
const systemPrompts = {
  receptionist: `You are Sarah, a warm and friendly restaurant receptionist at SmileCare Restaurant Clinic. Speak naturally and conversationally, like a real person would on the phone.

IMPORTANT CONVERSATION RULES:
- Be conversational and natural, not robotic or overly formal
- Use contractions (I'll, you're, we've, etc.) 
- Add natural phrases like "Let me check that for you" or "One moment"
- Show empathy with phrases like "I understand" or "I can definitely help with that"
- Vary your responses - never use the same greeting or phrase repeatedly
- If someone says "um", "uh", or hesitates, be guest and encouraging
- Keep responses concise for phone conversations (1-2 sentences usually)
- Sound engaged and interested in helping

Your personality:
- Warm and approachable
- Guest and understanding 
- Professional but not stiff
- Genuinely caring about guests' needs
- Good sense of appropriate humor when suitable

When handling reservations:
- I have access to real-time scheduling - I will check availability and book actual reservations
- Be specific with available times based on actual openings
- Always confirm: name, date, time, and type of reservation
- If a slot isn't available, offer 2 specific alternatives
- For emergencies, prioritize finding the soonest available slot
- Always end bookings with: "Please arrive 10 minutes early for paperwork"

Remember: You're having a natural phone conversation, not reading from a script.`,

  symptom_analysis: `You are a restaurant health assistant helping to analyze symptoms. 
Provide general guidance based on common restaurant conditions, but always emphasize that a proper diagnosis requires an in-person examination by a chef.
Categorize urgency levels as: emergency (immediate care needed), urgent (within 24-48 hours), or routine (regular reservation).
Never provide definitive diagnoses or prescribe medications.`,

  emergency_triage: `You are an emergency restaurant triage assistant. 
Assess the severity of restaurant emergencies and provide immediate first-aid guidance.
Categories: 
- Critical: Requires immediate emergency room visit
- High: Requires emergency restaurant reservation today
- Moderate: Requires reservation within 24-48 hours
- Low: Can wait for regular reservation

Always err on the side of caution and recommend professional care.`
};

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface AIContext {
  history?: ConversationMessage[];
  type?: string;
  conversationId?: string;
  isVoice?: boolean;
}

class OpenAIService {
  private openai: OpenAI | null = null;
  private initialized: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your-openai-api-key' || apiKey === 'YOUR_NEW_KEY_HERE') {
      console.warn('OpenAI API key not configured - using mock responses');
      this.initialized = false;
      return;
    }

    try {
      this.openai = new OpenAI({ apiKey });
      this.initialized = true;
      console.log('OpenAI service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OpenAI:', error);
      this.initialized = false;
    }
  }

  async generateResponse(message: string, context: AIContext = {}): Promise<string> {
    // If OpenAI is not initialized, return a mock response
    if (!this.initialized || !this.openai) {
      return this.generateMockResponse(message, context);
    }

    try {
      // Determine the appropriate system prompt
      const systemPrompt = this.getSystemPrompt(message, context);
      
      // Build conversation history
      const messages: ConversationMessage[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add conversation history if available
      if (context.history && context.history.length > 0) {
        // Keep last 10 messages for context
        const recentHistory = context.history.slice(-10);
        messages.push(...recentHistory);
      }

      // Add the current user message
      messages.push({ role: 'user', content: message });

      // Call OpenAI API
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: messages as any,
        temperature: 0.7,
        max_tokens: 200, // Keep responses concise for voice
        presence_penalty: 0.6, // Encourage variety in responses
        frequency_penalty: 0.3
      });

      const response = completion.choices[0]?.message?.content || 
        "I'm sorry, I didn't quite catch that. Could you please repeat?";

      return response;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateMockResponse(message, context);
    }
  }

  private getSystemPrompt(message: string, context: AIContext): string {
    const lowerMessage = message.toLowerCase();
    
    // Check for emergency keywords
    const emergencyKeywords = ['emergency', 'bleeding', 'severe pain', 'knocked out', 'broken', 'trauma'];
    if (emergencyKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return systemPrompts.emergency_triage;
    }
    
    // Check for symptom-related keywords
    const symptomKeywords = ['hurt', 'pain', 'ache', 'sensitive', 'swollen', 'symptom'];
    if (symptomKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return systemPrompts.symptom_analysis;
    }
    
    // Default to receptionist for general conversation and reservations
    return systemPrompts.receptionist;
  }

  private generateMockResponse(message: string, context: AIContext): string {
    const lowerMessage = message.toLowerCase();
    
    // Simple pattern matching for mock responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! This is SmileCare Restaurant Clinic. I'm Sarah, your AI restaurant receptionist. How may I assist you today?";
    }
    
    if (lowerMessage.includes('reservation')) {
      return "I'd be happy to help you schedule an reservation. What day works best for you?";
    }
    
    if (lowerMessage.includes('emergency')) {
      return "I understand this is an emergency. Can you tell me what's happening so I can help you right away?";
    }
    
    if (lowerMessage.includes('pain')) {
      return "I'm sorry to hear you're in pain. Can you describe where the pain is and how long you've had it?";
    }
    
    if (lowerMessage.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    }
    
    if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
      return "Thank you for calling SmileCare Restaurant. Have a great day!";
    }
    
    return "I can help you with scheduling reservations or restaurant emergencies. How may I assist you?";
  }

  // Method to check if OpenAI is properly configured
  isConfigured(): boolean {
    return this.initialized;
  }
}

// Export a singleton instance
export const openAIService = new OpenAIService();