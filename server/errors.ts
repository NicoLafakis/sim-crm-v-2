/**
 * Custom error classes for application-specific errors
 */

export class BaseAppError extends Error {
  code: string;
  context?: Record<string, any>;
  status?: number;

  constructor(code: string, message: string, context?: Record<string, any>, status?: number) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.status = status;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class GenerateDataError extends BaseAppError {
  constructor(code: string, message: string, context?: Record<string, any>) {
    super(code, message, context, 424);
  }
}

export class TemplateReferenceError extends BaseAppError {
  constructor(code: string, message: string, context?: Record<string, any>) {
    super(code, message, context, 404);
  }
}

export class ValidationError extends BaseAppError {
  constructor(code: string, message: string, context?: Record<string, any>) {
    super(code, message, context, 400);
  }
}