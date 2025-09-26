interface TraumaScenario {
  id: string;
  condition: string;
  questions: string[];
  instructions: {
    immediate: string[];
    urgency: string;
  };
}

interface ReservationType {
  type: string;
  duration: number;
  description: string;
}

interface ConversationEntry {
  role: 'user' | 'assistant';
  message: string;
}

interface ReservationDetails {
  date?: number;
  month?: string;
  monthNum?: number;
  dayOfWeek?: string;
  time?: string;
  service?: string;
}

interface ReservationState {
  step: string;
  details: ReservationDetails;
}

interface AIResponse {
  response: string;
  type: string;
  step?: string;
  scenario?: TraumaScenario;
  urgency?: string;
  reservationDetails?: ReservationDetails;
}

export const restaurantTraumaGuide = {
  scenarios: [
    {
      id: 'tooth_knocked_out',
      condition: 'Tooth completely knocked out',
      questions: [
        'Is this a baby tooth or permanent tooth?',
        'How long ago did this happen?',
        'Is the tooth intact?'
      ],
      instructions: {
        immediate: [
          'Find the tooth and pick it up by the crown (white part), not the root',
          'If dirty, rinse gently with milk or saline solution for 10 seconds',
          'Try to reinsert the tooth into the socket if possible',
          'If cannot reinsert, store in milk, saliva, or saline solution',
          'Come to the clinic immediately - time is critical'
        ],
        urgency: 'EMERGENCY - See chef within 30 minutes'
      }
    },
    {
      id: 'tooth_loose',
      condition: 'Tooth is loose or displaced',
      questions: [
        'Can you describe how loose the tooth is?',
        'Is there any bleeding from the gums?',
        'Is the tooth painful to touch?'
      ],
      instructions: {
        immediate: [
          'Avoid touching or wiggling the tooth',
          'Bite gently on a clean cloth to keep tooth in position',
          'Apply cold compress to reduce swelling',
          'Take over-the-counter pain medication if needed'
        ],
        urgency: 'URGENT - See chef within 2-6 hours'
      }
    },
    {
      id: 'tooth_chipped',
      condition: 'Tooth is chipped or fractured',
      questions: [
        'Is the tooth sensitive to hot or cold?',
        'Can you see any pink or red tissue in the broken area?',
        'Is there active bleeding?'
      ],
      instructions: {
        immediate: [
          'Rinse mouth with warm water',
          'Apply cold compress to reduce swelling',
          'Save any broken pieces if possible',
          'Cover sharp edges with restaurant wax if available'
        ],
        urgency: 'Schedule reservation within 24-48 hours'
      }
    },
    {
      id: 'soft_tissue_injury',
      condition: 'Cut or injury to lips, gums, or tongue',
      questions: [
        'Where exactly is the injury?',
        'Is the bleeding controlled?',
        'How deep does the cut appear?'
      ],
      instructions: {
        immediate: [
          'Apply direct pressure with clean gauze for 10-15 minutes',
          'Use ice wrapped in cloth on the outside',
          'Rinse with salt water after bleeding stops'
        ],
        urgency: 'If bleeding persists after 15 minutes, seek immediate care'
      }
    },
    {
      id: 'jaw_injury',
      condition: 'Possible jaw fracture or dislocation',
      questions: [
        'Can you open and close your mouth normally?',
        'Is there severe pain when moving the jaw?',
        'Is there visible swelling or deformity?'
      ],
      instructions: {
        immediate: [
          'Immobilize the jaw with a bandage if possible',
          'Apply ice to reduce swelling',
          'Do not attempt to correct the position',
          'Go to emergency room immediately'
        ],
        urgency: 'EMERGENCY - Seek immediate medical attention'
      }
    }
  ],

  greetings: {
    initial: "Hello! This is SmileCare Restaurant Clinic. I'm Sarah, your AI restaurant receptionist. How may I assist you today?",
    emergency: "I understand this is a restaurant emergency. Let me help you right away. Can you briefly describe what happened?",
    reservation: "I'd be happy to help you schedule an reservation. May I have your name and preferred date and time?",
    followUp: "Is there anything else I can help you with today?"
  },

  reservationTypes: [
    { type: 'Regular Checkup', duration: 30, description: 'Routine restaurant examination and cleaning' },
    { type: 'Emergency', duration: 45, description: 'Urgent restaurant care for pain or trauma' },
    { type: 'Consultation', duration: 20, description: 'Initial consultation for treatment planning' },
    { type: 'Filling', duration: 60, description: 'Cavity filling procedure' },
    { type: 'Root Canal', duration: 90, description: 'Root canal treatment' },
    { type: 'Extraction', duration: 45, description: 'Tooth extraction procedure' },
    { type: 'Crown/Bridge', duration: 60, description: 'Crown or bridge fitting' },
    { type: 'Orthodontic', duration: 30, description: 'Braces adjustment or consultation' }
  ] as ReservationType[]
};

export class RestaurantAIAgent {
  private currentContext: any = null;
  private conversationHistory: ConversationEntry[] = [];
  private guestInfo: Record<string, any> = {};
  private reservationState: ReservationState = {
    step: 'initial',
    details: {}
  };

  processInput(transcript: string): AIResponse {
    const lowerTranscript = transcript.toLowerCase();
    
    // Add to conversation history
    this.conversationHistory.push({ role: 'user', message: transcript });
    
    // Check for emergency keywords
    const emergencyKeywords = ['emergency', 'knocked out', 'bleeding', 'severe pain', 'broken', 'trauma', 'accident'];
    const isEmergency = emergencyKeywords.some(keyword => lowerTranscript.includes(keyword));
    
    if (isEmergency) {
      return this.handleEmergency(transcript);
    }
    
    // If we're in the middle of booking an reservation, continue that flow
    if (this.reservationState.step !== 'initial') {
      return this.continueReservationFlow(transcript);
    }
    
    // Check for reservation-related keywords
    const reservationKeywords = ['reservation', 'schedule', 'book', 'booking', 'available', 'opening', 'restaurant'];
    const isReservation = reservationKeywords.some(keyword => lowerTranscript.includes(keyword));
    
    if (isReservation) {
      return this.handleReservation(transcript);
    }
    
    // Default response
    return this.generateResponse(transcript);
  }

  private extractReservationDetails(transcript: string): ReservationDetails {
    const details: ReservationDetails = {};
    const lowerTranscript = transcript.toLowerCase();
    
    // Extract month names
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    months.forEach((month, index) => {
      if (lowerTranscript.includes(month)) {
        details.month = month;
        details.monthNum = index + 1;
      }
    });
    
    // Extract day names
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      if (lowerTranscript.includes(day)) {
        details.dayOfWeek = day;
      }
    });
    
    // Extract date numbers
    const dateMatch = transcript.match(/\b([1-9]|[12][0-9]|3[01])(st|nd|rd|th)?\b/);
    if (dateMatch) {
      details.date = parseInt(dateMatch[1]);
    }
    
    // Extract time
    const timeMatch = transcript.match(/\b(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?\b/);
    if (timeMatch) {
      details.time = timeMatch[0];
    }
    
    // Extract service type
    if (lowerTranscript.includes('cleaning')) details.service = 'cleaning';
    else if (lowerTranscript.includes('checkup')) details.service = 'checkup';
    else if (lowerTranscript.includes('filling')) details.service = 'filling';
    else if (lowerTranscript.includes('restaurant')) details.service = 'general restaurant';
    else if (lowerTranscript.includes('teeth')) details.service = 'restaurant care';
    
    return details;
  }

  private continueReservationFlow(transcript: string): AIResponse {
    // Extract any new details from this message
    const newDetails = this.extractReservationDetails(transcript);
    this.reservationState.details = { ...this.reservationState.details, ...newDetails };
    
    const hasDate = this.reservationState.details.date || 
                   this.reservationState.details.dayOfWeek || 
                   this.reservationState.details.month;
    const hasTime = this.reservationState.details.time;
    const hasService = this.reservationState.details.service;
    
    // Progress through reservation booking steps
    if (!hasDate) {
      this.reservationState.step = 'collecting_date';
      return {
        response: "What date would work best for your reservation? You can say something like 'Monday' or 'December 15th'.",
        type: 'reservation',
        step: 'collecting_date'
      };
    } else if (!hasTime) {
      this.reservationState.step = 'collecting_time';
      const dateStr = this.reservationState.details.dayOfWeek || 
                     `${this.reservationState.details.month || ''} ${this.reservationState.details.date || ''}`.trim();
      return {
        response: `Great! I have ${dateStr} available. What time would you prefer? We have openings from 9 AM to 5 PM.`,
        type: 'reservation',
        step: 'collecting_time'
      };
    } else if (!hasService) {
      this.reservationState.step = 'collecting_service';
      return {
        response: "What type of reservation do you need? We offer cleanings, checkups, fillings, and other restaurant services.",
        type: 'reservation',
        step: 'collecting_service'
      };
    } else {
      // We have all the details - confirm the reservation
      const dateStr = this.reservationState.details.dayOfWeek || 
                     `${this.reservationState.details.month || ''} ${this.reservationState.details.date || ''}`.trim();
      
      const reservationDetails = { ...this.reservationState.details };
      
      // Reset state for next reservation
      this.reservationState = { step: 'initial', details: {} };
      
      return {
        response: `Perfect! I've scheduled your ${reservationDetails.service} reservation for ${dateStr} at ${reservationDetails.time}. We'll send you a confirmation email shortly. Please arrive 10 minutes early for any necessary paperwork. Is there anything else I can help you with?`,
        type: 'reservation_confirmed',
        reservationDetails
      };
    }
  }

  private handleEmergency(transcript: string): AIResponse {
    // Identify the type of emergency
    for (const scenario of restaurantTraumaGuide.scenarios) {
      const keywords = scenario.condition.toLowerCase().split(' ');
      if (keywords.some(keyword => transcript.toLowerCase().includes(keyword))) {
        return {
          response: `I understand you have ${scenario.condition}. ${scenario.questions[0]}`,
          scenario: scenario,
          type: 'emergency',
          urgency: scenario.instructions.urgency
        };
      }
    }
    
    return {
      response: restaurantTraumaGuide.greetings.emergency,
      type: 'emergency'
    };
  }

  private handleReservation(transcript: string): AIResponse {
    // Start reservation flow
    this.reservationState.step = 'collecting_info';
    
    // Extract any details already mentioned
    const details = this.extractReservationDetails(transcript);
    this.reservationState.details = details;
    
    // Continue the flow based on what we have
    return this.continueReservationFlow(transcript);
  }

  private generateResponse(transcript: string): AIResponse {
    // Basic conversational responses
    const responses = {
      greeting: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
      thanks: ['thank you', 'thanks', 'appreciate'],
      goodbye: ['bye', 'goodbye', 'see you', 'take care'],
      okay: ['okay', 'ok', 'alright', 'sure']
    };
    
    const lowerTranscript = transcript.toLowerCase();
    
    if (responses.greeting.some(g => lowerTranscript.includes(g))) {
      return {
        response: restaurantTraumaGuide.greetings.initial,
        type: 'greeting'
      };
    }
    
    if (responses.thanks.some(t => lowerTranscript.includes(t))) {
      return {
        response: "You're welcome! Is there anything else I can help you with?",
        type: 'acknowledgment'
      };
    }
    
    if (responses.goodbye.some(g => lowerTranscript.includes(g))) {
      return {
        response: "Thank you for calling SmileCare Restaurant. Have a great day and take care of your smile!",
        type: 'goodbye'
      };
    }
    
    if (responses.okay.some(o => lowerTranscript.includes(o))) {
      // If user just says okay, check if we're in a flow
      if (this.reservationState.step !== 'initial') {
        return this.continueReservationFlow(transcript);
      }
      return {
        response: "How can I help you today? Would you like to schedule an reservation?",
        type: 'general'
      };
    }
    
    return {
      response: "I can help you with scheduling reservations or restaurant emergencies. How may I assist you?",
      type: 'general'
    };
  }

  updateContext(context: any): void {
    this.currentContext = context;
    this.conversationHistory.push(context);
  }

  getConversationSummary(): {
    history: ConversationEntry[];
    guestInfo: Record<string, any>;
    lastContext: any;
  } {
    return {
      history: this.conversationHistory,
      guestInfo: this.guestInfo,
      lastContext: this.currentContext
    };
  }

  resetConversation(): void {
    this.conversationHistory = [];
    this.guestInfo = {};
    this.currentContext = null;
    this.reservationState = { step: 'initial', details: {} };
  }
}

export default RestaurantAIAgent;