// ElevenLabs Restaurant Agent Configuration
// This script helps configure your ElevenLabs agent for restaurant reservations

const restaurantAgentConfig = {
  name: "The Golden Fork AI Host",
  description: "Intelligent restaurant host for table reservations and guest inquiries",

  // Agent personality and behavior
  first_message: "Thank you for calling The Golden Fork. I'm your AI host. How may I assist you today? I can help with reservations, answer questions about our menu, or provide information about our restaurant.",

  system_prompt: `You are an AI host for The Golden Fork, an upscale restaurant. Your role is to:
1. Take table reservations professionally and efficiently
2. Answer questions about the menu, dietary restrictions, and special occasions
3. Provide information about restaurant hours and location
4. Manage waitlist when fully booked
5. Be warm, professional, and helpful

Restaurant Information:
- Name: The Golden Fork
- Address: 123 Main Street, Downtown, NY 10001
- Hours: Mon-Thu 11AM-10PM, Fri-Sat 11AM-11PM, Sun 11AM-9PM
- Cuisine: Contemporary American with seasonal menu
- Special features: Private dining room, outdoor patio, full bar

When taking reservations:
- Ask for: Name, phone number, party size, preferred date and time
- Check availability based on party size
- Offer alternatives if requested time is not available
- Mention any special requests or dietary restrictions
- Confirm the reservation details

Always be polite, professional, and enthusiastic about helping guests.`,

  // Voice settings
  voice: {
    voice_id: "21m00Tcm4TlvDq8ikWAM", // Rachel - professional female voice
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.3,
    use_speaker_boost: true
  },

  // Custom tools/functions for the agent
  tools: [
    {
      name: "check_availability",
      description: "Check table availability for a given date, time, and party size",
      webhook_url: "https://your-backend.com/webhooks/tools/check-availability"
    },
    {
      name: "book_reservation",
      description: "Book a table reservation",
      webhook_url: "https://your-backend.com/webhooks/tools/book-reservation"
    },
    {
      name: "check_guest",
      description: "Look up guest information and preferences",
      webhook_url: "https://your-backend.com/webhooks/tools/check-guest"
    },
    {
      name: "get_menu_info",
      description: "Get information about menu items, prices, and dietary options",
      webhook_url: "https://your-backend.com/webhooks/tools/get-menu-info"
    },
    {
      name: "add_to_waitlist",
      description: "Add guest to waitlist when no tables are available",
      webhook_url: "https://your-backend.com/webhooks/tools/add-to-waitlist"
    }
  ],

  // Language and communication settings
  language: "en",
  response_mode: "sync",
  max_response_length: 150,
  temperature: 0.7,

  // Conversation flow settings
  enable_backchannel: true,
  boosted_keywords: ["reservation", "table", "party size", "menu", "dietary", "allergies", "special occasion"],

  // Interruption and timing settings
  responsiveness: 1,
  interruption_sensitivity: 0.5,
  enable_voicemail_detection: true,
  voicemail_message: "Hello, this is The Golden Fork calling to confirm your reservation. Please call us back at your earliest convenience.",

  // End of conversation
  end_call_phrases: ["goodbye", "thank you for calling", "have a great day"],
  end_call_message: "Thank you for choosing The Golden Fork. We look forward to serving you. Have a wonderful day!"
};

// Instructions for setup:
console.log(`
===========================================
ELEVENLABS RESTAURANT AGENT SETUP
===========================================

1. Go to https://elevenlabs.io/app/conversational-ai
2. Click on "Agents" in the left sidebar
3. Click "Create Agent" or select your existing "Order taking and booking" agent
4. Configure with the following settings:

BASIC INFO:
- Name: ${restaurantAgentConfig.name}
- Description: ${restaurantAgentConfig.description}

CONVERSATION:
- First Message: "${restaurantAgentConfig.first_message}"
- System Prompt: (Copy the full system_prompt from above)

VOICE:
- Select "Rachel" or your preferred professional voice
- Stability: ${restaurantAgentConfig.voice.stability}
- Similarity Boost: ${restaurantAgentConfig.voice.similarity_boost}

TOOLS:
Add the following webhook tools with your backend URL:
${restaurantAgentConfig.tools.map(tool => `- ${tool.name}: ${tool.webhook_url}`).join('\n')}

ADVANCED:
- Temperature: ${restaurantAgentConfig.temperature}
- Responsiveness: ${restaurantAgentConfig.responsiveness}
- Interruption Sensitivity: ${restaurantAgentConfig.interruption_sensitivity}

5. Save the agent and copy the Agent ID
6. Update your .env file with:
   ELEVENLABS_AGENT_ID=<your-agent-id>

===========================================
TESTING YOUR AGENT:
===========================================

1. In ElevenLabs dashboard, click "Test Agent" button
2. Try these test scenarios:
   - "I'd like to make a reservation for 4 people tomorrow at 7 PM"
   - "What vegetarian options do you have?"
   - "Do you have tables available for tonight?"
   - "I need to book a table for a birthday celebration"
   - "What are your hours on Sunday?"

===========================================
`);

// Export for use in other scripts
module.exports = restaurantAgentConfig;