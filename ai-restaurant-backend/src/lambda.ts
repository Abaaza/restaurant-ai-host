import serverless from 'serverless-http';
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';

// Import routes
import healthRouter from './routes/health';
import webhooksRouter from './routes/webhooks';
import appointmentsRouter from './routes/appointments';
import callLogsRouter from './routes/call-logs';

const app = express();

// Basic rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Skip morgan logging in Lambda environment
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('combined'));
}
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(limiter);

// Routes
app.use('/api/health', healthRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/call-logs', callLogsRouter);
app.use('/webhooks', webhooksRouter);

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Export the serverless handler
export const handler = serverless(app);