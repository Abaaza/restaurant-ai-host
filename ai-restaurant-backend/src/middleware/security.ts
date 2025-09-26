import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// Generate unique request ID for tracking
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
};

// Secure error handler
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the full error internally
  console.error('Error:', {
    requestId: req.headers['x-request-id'],
    error: err.stack || err,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // In production, don't leak error details
  if (process.env.NODE_ENV === 'production') {
    const safeErrors: any = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      422: 'Validation Error',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };

    return res.status(statusCode).json({
      error: safeErrors[statusCode] || 'An error occurred',
      message: statusCode < 500 ? err.message : 'An unexpected error occurred',
      requestId: req.headers['x-request-id']
    });
  }

  // Development: send full error
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id']
  });
};

// Not found handler
export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    requestId: req.headers['x-request-id']
  });
};

// Security headers middleware
export const securityHeaders = (req: Request, res: Response, next: NextFunction) => {
  // Security headers that helmet doesn't set
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');

  next();
};

// Prevent timing attacks on string comparison
export const timingSafeCompare = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

// Log security events
export const logSecurityEvent = (event: string, details: any) => {
  console.log('[SECURITY]', {
    event,
    details,
    timestamp: new Date().toISOString()
  });
};

// Detect and prevent common attacks
export const attackDetection = (req: Request, res: Response, next: NextFunction) => {
  const suspicious = [];

  // Check for SQL injection attempts
  const sqlPattern = /(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|WHERE|FROM|EXEC|SCRIPT)/gi;
  const checkString = `${req.path} ${JSON.stringify(req.body)} ${JSON.stringify(req.query)}`;

  if (sqlPattern.test(checkString)) {
    suspicious.push('Potential SQL injection');
  }

  // Check for XSS attempts
  const xssPattern = /(<script|javascript:|onerror=|onclick=|<iframe|<object|<embed)/gi;
  if (xssPattern.test(checkString)) {
    suspicious.push('Potential XSS attack');
  }

  // Check for path traversal
  const pathTraversal = /\.\.(\/|\\)/g;
  if (pathTraversal.test(req.path)) {
    suspicious.push('Potential path traversal');
  }

  // Log but don't block (to avoid false positives)
  if (suspicious.length > 0) {
    logSecurityEvent('Suspicious Request', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      threats: suspicious,
      headers: req.headers
    });
  }

  next();
};

// Sanitize response data
export const sanitizeResponse = (data: any): any => {
  if (typeof data === 'string') {
    // Remove any accidentally included secrets
    return data
      .replace(/api[_-]?key[\s]*[:=][\s]*["']?[\w-]+["']?/gi, 'api_key=***')
      .replace(/secret[\s]*[:=][\s]*["']?[\w-]+["']?/gi, 'secret=***')
      .replace(/token[\s]*[:=][\s]*["']?[\w-]+["']?/gi, 'token=***')
      .replace(/password[\s]*[:=][\s]*["']?[\w-]+["']?/gi, 'password=***');
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeResponse);
  }

  if (data && typeof data === 'object') {
    const sanitized: any = {};
    for (const key in data) {
      // Don't send sensitive fields
      if (['password', 'token', 'secret', 'api_key', 'auth_token'].includes(key.toLowerCase())) {
        sanitized[key] = '***';
      } else {
        sanitized[key] = sanitizeResponse(data[key]);
      }
    }
    return sanitized;
  }

  return data;
};

// Override res.json to sanitize all responses
export const sanitizeJsonResponse = (req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function(data: any) {
    const sanitized = sanitizeResponse(data);
    return originalJson.call(this, sanitized);
  };

  next();
};

// IP-based rate limiting tracker
const requestCounts = new Map<string, number[]>();

export const ipRateLimiter = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const requests = requestCounts.get(ip) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      logSecurityEvent('Rate Limit Exceeded', {
        ip,
        requests: validRequests.length,
        path: req.path
      });

      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: windowMs / 1000
      });
    }

    validRequests.push(now);
    requestCounts.set(ip, validRequests);

    next();
  };
};

// Cleanup old request counts periodically
setInterval(() => {
  const now = Date.now();
  const windowMs = 60000; // 1 minute

  requestCounts.forEach((requests, ip) => {
    const validRequests = requests.filter(time => now - time < windowMs);
    if (validRequests.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, validRequests);
    }
  });
}, 60000); // Clean up every minute