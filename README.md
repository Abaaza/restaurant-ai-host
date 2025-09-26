# Restaurant AI Host 🍴

An intelligent AI-powered restaurant reservation and host system that handles table bookings, guest inquiries, and provides information about your restaurant through natural voice conversations.

## Features

- **AI Voice Host**: Natural conversation interface powered by ElevenLabs
- **Smart Reservations**: Intelligent table booking with availability checking
- **Guest Management**: Track guest preferences and visit history
- **Multi-language Support**: English and Italian languages
- **Real-time Dashboard**: Monitor reservations and restaurant status
- **Menu Inquiries**: Answer questions about menu items and dietary options
- **Waitlist Management**: Handle busy periods with automated waitlist

## Tech Stack

### Frontend
- **Next.js 15.4.6** - React framework with App Router
- **TypeScript 5.8.3** - Type safety
- **Tailwind CSS 3.4.17** - Styling with custom restaurant theme
- **Radix UI** - Accessible component primitives
- **Framer Motion** - Animations
- **Recharts** - Analytics visualization

### Backend
- **Express 5.1.0** - Node.js web framework
- **TypeScript 5.9.2** - Type safety
- **Supabase** - PostgreSQL database
- **ElevenLabs** - AI voice agent
- **JWT** - Authentication

### AI & Voice
- **ElevenLabs Conversational AI** - Voice agent for natural conversations
- **Deepgram** - Speech-to-text/text-to-speech
- **OpenAI GPT** - Enhanced conversation capabilities

## Project Structure

```
Restaurant-AI-Host/
├── AI-Restaurant-Host/          # Frontend Next.js application
│   ├── app/                     # App router pages
│   │   ├── (dashboard)/        # Dashboard routes
│   │   │   ├── reservations/   # Reservation management
│   │   │   ├── analytics/      # Analytics dashboard
│   │   │   └── settings/       # Configuration
│   │   └── test/               # Test interface
│   ├── components/             # React components
│   └── lib/                    # Utilities and services
│
├── ai-restaurant-backend/       # Backend Express API
│   ├── src/
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   └── webhooks/          # ElevenLabs webhooks
│   └── setup-restaurant-agent.js  # Agent configuration
│
└── restaurant_schema.sql       # Database schema
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- ElevenLabs account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/restaurant-ai-host.git
cd Restaurant-AI-Host
```

2. Install frontend dependencies:
```bash
cd AI-Restaurant-Host
npm install
```

3. Install backend dependencies:
```bash
cd ../ai-restaurant-backend
npm install
```

### Environment Setup

1. Frontend configuration (`AI-Restaurant-Host/.env.local`):
```env
# Deepgram API
NEXT_PUBLIC_DEEPGRAM_API_KEY=your-deepgram-key
DEEPGRAM_API_KEY=your-deepgram-key

# OpenAI
OPENAI_API_KEY=your-openai-key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5000/api

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id

# Restaurant Info
NEXT_PUBLIC_RESTAURANT_NAME="The Golden Fork"
```

2. Backend configuration (`ai-restaurant-backend/.env`):
```env
# Server
PORT=5000
NODE_ENV=development

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# ElevenLabs
ELEVENLABS_API_KEY=your-elevenlabs-key
ELEVENLABS_AGENT_ID=your-agent-id

# Restaurant Info
RESTAURANT_NAME=The Golden Fork
RESTAURANT_ADDRESS=123 Main Street, Downtown, NY 10001
RESTAURANT_PHONE=+1 (555) 123-4567
```

### Database Setup

1. Create a new Supabase project
2. Run the schema SQL file:
```bash
psql -h your-supabase-host -U postgres -d your-database < restaurant_schema.sql
```

### ElevenLabs Agent Setup

1. Go to [ElevenLabs Conversational AI](https://elevenlabs.io/app/conversational-ai)
2. Create a new agent or use existing "Order taking and booking" agent
3. Configure using settings in `ai-restaurant-backend/setup-restaurant-agent.js`
4. Copy the Agent ID to your `.env` files

### Running the Application

1. Start the backend server:
```bash
cd ai-restaurant-backend
npm run dev
```

2. Start the frontend development server:
```bash
cd AI-Restaurant-Host
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Testing

### Test Interface
Navigate to [http://localhost:3000/test](http://localhost:3000/test) to access the testing interface where you can:
- Test voice conversations
- Simulate reservations
- Check availability
- Test menu inquiries

### Test Scenarios
- "I'd like to make a reservation for 4 people tomorrow at 7 PM"
- "Do you have any tables available tonight?"
- "What vegetarian options do you have?"
- "I need a table for a birthday celebration"
- "What are your hours on Sunday?"

## Deployment

### AWS Deployment
```bash
# Frontend
cd AI-Restaurant-Host
npm run build
npm run deploy:aws

# Backend
cd ai-restaurant-backend
npm run deploy
```

### Environment Variables for Production
Update the `.env.production` files with your production API endpoints and keys.

## Features in Detail

### Reservation Management
- Real-time table availability checking
- Party size accommodation (1-12 guests)
- Special requests and dietary restrictions
- Automated confirmations and reminders

### Guest Experience
- Natural voice conversations
- Multi-language support (English/Italian)
- Instant responses to common questions
- Personalized recommendations

### Analytics Dashboard
- Daily reservation metrics
- Peak hours analysis
- Guest satisfaction tracking
- Revenue insights

### Table Management
- 14 preconfigured tables
- Multiple locations (main, bar, patio, private)
- Dynamic availability updates
- Waitlist automation

## API Endpoints

### Public Endpoints
- `GET /api/health` - System health check
- `POST /api/reservations` - Create reservation
- `GET /api/availability` - Check table availability

### Webhook Endpoints
- `POST /webhooks/tools/check-availability` - AI tool for availability
- `POST /webhooks/tools/book-reservation` - AI tool for booking
- `POST /webhooks/tools/get-menu-info` - AI tool for menu queries

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.

## Support

For support, email info@goldenfork.com or open an issue in the GitHub repository.

## Acknowledgments

- Built with Next.js and Express
- Voice AI powered by ElevenLabs
- Database by Supabase
- UI components from Radix UI and shadcn/ui

---

**The Golden Fork** - Smart Restaurant Management System 🍴✨