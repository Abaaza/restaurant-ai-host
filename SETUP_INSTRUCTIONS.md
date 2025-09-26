# Restaurant AI Host - Setup Instructions

## GitHub Repository
✅ Repository created: https://github.com/Abaaza/restaurant-ai-host

## Quick Start Guide

### 1. Clone the Repository
```bash
git clone https://github.com/Abaaza/restaurant-ai-host.git
cd restaurant-ai-host
```

### 2. Install Dependencies

#### Frontend
```bash
cd AI-Restaurant-Host
npm install
cp .env.example .env.local
# Edit .env.local with your API keys
```

#### Backend
```bash
cd ../ai-restaurant-backend
npm install
cp .env.example .env
# Edit .env with your API keys
```

### 3. Configure ElevenLabs Agent

1. **Go to ElevenLabs Dashboard**: https://elevenlabs.io/app/conversational-ai
2. **Select your "Order taking and booking" agent**
3. **Configure the agent with these settings**:

#### Basic Configuration
- **Name**: The Golden Fork AI Host
- **First Message**: "Thank you for calling The Golden Fork. I'm your AI host. How may I assist you today? I can help with reservations, answer questions about our menu, or provide information about our restaurant."

#### System Prompt
```
You are an AI host for The Golden Fork, an upscale restaurant. Your role is to:
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

Always be polite, professional, and enthusiastic about helping guests.
```

#### Voice Settings
- **Voice**: Rachel (or your preferred professional voice)
- **Stability**: 0.5
- **Similarity Boost**: 0.75
- **Style**: 0.3
- **Use Speaker Boost**: Enabled

#### Custom Tools (Webhooks)
Add these tools with your backend URL (after deployment):

1. **check_availability**
   - URL: `https://your-backend.com/webhooks/tools/check-availability`
   - Description: Check table availability for a given date, time, and party size

2. **book_reservation**
   - URL: `https://your-backend.com/webhooks/tools/book-reservation`
   - Description: Book a table reservation

3. **check_guest**
   - URL: `https://your-backend.com/webhooks/tools/check-guest`
   - Description: Look up guest information and preferences

4. **get_menu_info**
   - URL: `https://your-backend.com/webhooks/tools/get-menu-info`
   - Description: Get information about menu items, prices, and dietary options

5. **add_to_waitlist**
   - URL: `https://your-backend.com/webhooks/tools/add-to-waitlist`
   - Description: Add guest to waitlist when no tables are available

#### Advanced Settings
- **Temperature**: 0.7
- **Responsiveness**: 1
- **Interruption Sensitivity**: 0.5
- **Enable Backchannel**: Yes
- **Boosted Keywords**: reservation, table, party size, menu, dietary, allergies, special occasion

### 4. Set Up Supabase Database

1. **Create a new Supabase project**: https://supabase.com
2. **Go to SQL Editor**
3. **Run the schema**: Copy and paste the contents of `restaurant_schema.sql`
4. **Get your credentials**:
   - Project URL: Settings → API → Project URL
   - Anon Key: Settings → API → Project API keys → anon/public
   - Service Role Key: Settings → API → Project API keys → service_role

### 5. Update Environment Variables

#### Frontend (.env.local)
```env
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-key
DEEPGRAM_API_KEY=your-deepgram-key
OPENAI_API_KEY=sk-your-openai-key
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id
```

#### Backend (.env)
```env
PORT=5000
NODE_ENV=development
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id
WEBHOOK_BASE_URL=http://localhost:5000
```

### 6. Start the Application

#### Terminal 1 - Backend
```bash
cd ai-restaurant-backend
npm run dev
```

#### Terminal 2 - Frontend
```bash
cd AI-Restaurant-Host
npm run dev
```

### 7. Test the System

1. **Open the application**: http://localhost:3000
2. **Go to Test Interface**: http://localhost:3000/test
3. **Try these test scenarios**:
   - "I'd like to make a reservation for 4 people tomorrow at 7 PM"
   - "What vegetarian options do you have?"
   - "Do you have tables available for tonight?"
   - "I need a table for a birthday celebration"
   - "What are your hours on Sunday?"

## Testing with ElevenLabs

### Option 1: Test via ElevenLabs Dashboard
1. Go to your agent in ElevenLabs dashboard
2. Click "Test Agent" button
3. Try voice conversations

### Option 2: Test via Web Interface
1. Go to http://localhost:3000/test
2. Use Chat Mode for text testing
3. Use Voice Mode for voice testing

## Important Notes

1. **API Keys**: Never commit real API keys. Use environment variables.
2. **Webhook URLs**: Update the ElevenLabs agent webhooks after deploying the backend
3. **Database**: The schema includes 14 pre-configured tables and sample menu items
4. **Voice**: The system works through the web interface, no phone integration needed

## Troubleshooting

### Backend not connecting to Supabase
- Check SUPABASE_URL and keys in .env
- Ensure the database schema has been applied

### ElevenLabs agent not responding
- Verify ELEVENLABS_API_KEY is correct
- Check agent ID matches your created agent
- Ensure webhook URLs are accessible

### Frontend voice not working
- Check browser microphone permissions
- Verify DEEPGRAM_API_KEY is set
- Check browser console for errors

## Deployment

### Deploy Backend to AWS Lambda
```bash
cd ai-restaurant-backend
npm run deploy
# Update ElevenLabs webhooks with the Lambda URL
```

### Deploy Frontend to Vercel
```bash
cd AI-Restaurant-Host
npx vercel
# Follow prompts to deploy
```

## Support

For issues or questions:
- GitHub Issues: https://github.com/Abaaza/restaurant-ai-host/issues
- ElevenLabs Docs: https://elevenlabs.io/docs

---

## Features Checklist

✅ Restaurant reservation system
✅ Table availability checking
✅ Guest management
✅ Menu inquiry handling
✅ Multi-language support (EN/IT)
✅ Real-time dashboard
✅ Test interface
✅ Voice conversations via ElevenLabs
✅ No Twilio dependency
✅ Clean codebase with no sensitive data

The system is ready for development and testing!