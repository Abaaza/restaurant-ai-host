import dotenv from 'dotenv';
// Load environment variables FIRST before any other imports that might use them
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import WebSocket from 'ws';
import rateLimit from 'express-rate-limit';

// Import middleware
import { authenticateToken, optionalAuth, authenticateWebhook, authenticateApiKey } from './middleware/auth';
import { sanitizeInput } from './middleware/validation';
import { requestId, securityHeaders, errorHandler, notFound, sanitizeJsonResponse, attackDetection, ipRateLimiter } from './middleware/security';

// Import routers
import elevenLabsRouter from './routes/elevenlabs';
import reservationsRouter from './routes/reservations';
import availabilityRouter from './routes/availability';
import callLogsRouter from './routes/callLogs';
import outboundRouter from './routes/outbound';
import webhooksRouter, { setupWebSocketBridge } from './routes/webhooks';
import healthRouter from './routes/health';

// Import services
import { OutboundCallScheduler } from './services/outboundScheduler';
import { initializeDatabase } from './config/database';

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting configurations
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window for sensitive endpoints
  message: 'Too many attempts, please try again later',
  skipSuccessfulRequests: true,
});

// Security middleware - applied first
app.use(requestId); // Add request ID for tracking
app.use(securityHeaders); // Add security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to avoid blocking legitimate requests
  crossOriginEmbedderPolicy: false
}));

// CORS configuration - fixed for production
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://d14x5j6jjv9uj0.cloudfront.net'
    ];

    // In production, strictly enforce CORS
    if (process.env.NODE_ENV === 'production') {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    } else {
      // Development: allow all for easier testing
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.raw({ type: 'application/json' })); // For webhook verification

// Security middleware
// app.use(sanitizeInput); // Temporarily disabled - causing issues with query params
app.use(attackDetection); // Detect potential attacks
app.use(sanitizeJsonResponse); // Sanitize all JSON responses

// Apply general rate limiting to all routes
app.use(generalLimiter);

// Public routes (no authentication required)
app.use('/api/health', healthRouter);

// Protected API Routes - require authentication
// Note: In development, set SKIP_AUTH=true in .env to bypass authentication
app.use('/api/elevenlabs', optionalAuth, elevenLabsRouter);
app.use('/api/reservations', optionalAuth, reservationsRouter);
app.use('/api/availability', optionalAuth, availabilityRouter);
app.use('/api/call-logs', optionalAuth, callLogsRouter);
app.use('/api/outbound', optionalAuth, outboundRouter);

// Webhook Routes - use webhook authentication
// Apply strict rate limiting to webhook endpoints
app.use('/webhooks', strictLimiter, webhooksRouter);

// 404 handler - must be after all routes
app.use(notFound);

// Error handling - must be last
app.use(errorHandler);

// Initialize services
async function startServer() {
  try {
    // Initialize database connection - disabled for now until we get real Supabase keys
    // await initializeDatabase();
    console.log('⚠️ Database connection skipped - using placeholder keys');

    // Start outbound call scheduler - disabled for now until we get real Twilio keys
    // const scheduler = new OutboundCallScheduler();
    // await scheduler.start();
    console.log('⚠️ Outbound scheduler skipped - using placeholder keys');

    // Create HTTP server
    const server = createServer(app);

    // Setup WebSocket server
    const wss = new WebSocket.Server({ server, path: '/websocket' });
    setupWebSocketBridge(wss);
    console.log('✅ WebSocket server configured');

    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 AI Dental Backend running on port ${PORT}`);
      console.log(`📞 Twilio Phone: ${process.env.TWILIO_PHONE_NUMBER}`);
      console.log(`🎙️ ElevenLabs Agent: ${process.env.ELEVENLABS_AGENT_ID}`);
      console.log(`🏥 Clinic: ${process.env.CLINIC_NAME}`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}/websocket`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

startServer();// trigger restart
 
