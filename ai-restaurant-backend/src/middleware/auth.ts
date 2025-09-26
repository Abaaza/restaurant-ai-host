import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';

export interface AuthRequest extends Request {
  user?: any;
}

// Generate a secure JWT secret if not provided
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';

// Authentication middleware for protected routes
export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  // Skip authentication in development for easier testing
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    req.user = { id: 'dev-user', role: 'admin' };
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded;
    } catch (err) {
      // Invalid token, but continue without user
    }
  }

  next();
};

// Webhook authentication middleware
export const authenticateWebhook = (req: Request, res: Response, next: NextFunction) => {
  const webhookSecret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.ELEVENLABS_WEBHOOK_SECRET || 'development_secret';

  // Skip in development if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_WEBHOOK_AUTH === 'true') {
    return next();
  }

  if (!webhookSecret || webhookSecret !== expectedSecret) {
    return res.status(403).json({
      error: 'Invalid webhook authentication',
      message: 'Webhook secret is missing or invalid'
    });
  }

  next();
};

// Twilio signature validation
export const validateTwilioSignature = (req: Request, res: Response, next: NextFunction) => {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }

  const twilioSignature = req.headers['x-twilio-signature'] as string;

  if (!twilioSignature) {
    return res.status(403).json({ error: 'Missing Twilio signature' });
  }

  // Twilio validation will be done in the service layer
  // as it requires the full URL and request body
  next();
};

// API Key authentication for internal services
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const expectedKey = process.env.API_KEY || 'internal_api_key';

  // Skip in development
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_API_KEY === 'true') {
    return next();
  }

  if (!apiKey || apiKey !== expectedKey) {
    return res.status(403).json({
      error: 'Invalid API key',
      message: 'Please provide a valid API key'
    });
  }

  next();
};

// Generate JWT token
export const generateToken = (payload: any, expiresIn: string = '24h'): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

// Compare password with hash
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Role-based access control
export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};