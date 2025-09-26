import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Phone number sanitization
export const sanitizePhone = (phone: string): string => {
  // Remove all non-digits except + at the beginning
  const cleaned = phone.replace(/[^\d+]/g, '');
  // Ensure it starts with + for international format
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
};

// Email sanitization
export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

// Text input sanitization (prevent XSS)
export const sanitizeText = (text: string): string => {
  return text
    .replace(/[<>]/g, '') // Remove HTML brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
};

// SQL injection prevention
export const sanitizeSQLInput = (input: string): string => {
  // Remove common SQL keywords and special characters
  return input
    .replace(/['";\\]/g, '')
    .replace(/(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|WHERE|FROM)/gi, '')
    .trim();
};

// Validation schemas

// Appointment validation schema
export const appointmentSchema = Joi.object({
  patient_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(/^[a-zA-Z\s'-]+$/)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 100 characters',
      'string.pattern.base': 'Name can only contain letters, spaces, hyphens and apostrophes'
    }),

  patient_phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Please provide a valid phone number'
    }),

  patient_email: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Please provide a valid email address'
    }),

  appointment_date: Joi.string()
    .isoDate()
    .required()
    .custom((value, helpers) => {
      const date = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (date < today) {
        return helpers.error('date.future');
      }
      return value;
    })
    .messages({
      'date.future': 'Appointment date must be in the future'
    }),

  appointment_time: Joi.string()
    .pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Time must be in HH:MM format'
    }),

  service_type: Joi.string()
    .valid('cleaning', 'checkup', 'filling', 'root_canal', 'extraction', 'crown', 'emergency', 'consultation', 'orthodontic')
    .optional()
    .default('checkup'),

  procedure_type: Joi.string()
    .optional(),

  notes: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

// Lead validation schema
export const leadSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required(),

  phone: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),

  email: Joi.string()
    .email()
    .optional(),

  source: Joi.string()
    .valid('website', 'phone', 'referral', 'social_media', 'google', 'other')
    .optional(),

  notes: Joi.string()
    .max(500)
    .optional()
});

// Availability check schema
export const availabilitySchema = Joi.object({
  date: Joi.string()
    .isoDate()
    .required(),

  service_type: Joi.string()
    .valid('cleaning', 'checkup', 'filling', 'root_canal', 'extraction', 'crown', 'emergency', 'consultation', 'orthodontic')
    .optional()
});

// Patient lookup schema
export const patientLookupSchema = Joi.object({
  phone_number: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional(),

  patient_name: Joi.string()
    .min(2)
    .max(100)
    .optional(),

  email: Joi.string()
    .email()
    .optional()
}).or('phone_number', 'patient_name', 'email');

// SMS message schema
export const smsSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),

  message: Joi.string()
    .min(1)
    .max(1600) // SMS character limit
    .required()
});

// Phone call schema
export const phoneCallSchema = Joi.object({
  to: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .required(),

  agentId: Joi.string()
    .optional(),

  metadata: Joi.object()
    .optional()
});

// Webhook event schema
export const webhookEventSchema = Joi.object({
  type: Joi.string()
    .required(),

  conversation_id: Joi.string()
    .optional(),

  metadata: Joi.object()
    .optional(),

  // Allow additional fields for different webhook types
}).unknown(true);

// Sanitize all text fields in an object
export const sanitizeObject = (obj: any): any => {
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

// Middleware to sanitize all incoming data
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  if (req.params) {
    req.params = sanitizeObject(req.params);
  }

  next();
};