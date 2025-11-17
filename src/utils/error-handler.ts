// src/utils/error-handler.ts
import { logger } from './logger.js';
import type { Response } from 'express';

export interface ApiError {
  status: number;
  error: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

/**
 * Standardized error types
 */
export class ValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConfigurationError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Standardized error response handler for API endpoints
 */
export function handleApiError(
  error: unknown, 
  res: Response, 
  context: string,
  defaultStatus = 500
): void {
  let status = defaultStatus;
  let errorType = 'Internal Server Error';
  let message = 'An unexpected error occurred';

  if (error instanceof ValidationError) {
    status = 400;
    errorType = 'Validation Error';
    message = error.message;
  } else if (error instanceof NotFoundError) {
    status = 404;
    errorType = 'Not Found';
    message = error.message;
  } else if (error instanceof ConfigurationError) {
    status = 500;
    errorType = 'Configuration Error';
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Log the error with context
  logger.error(`${context}: ${errorType}`, {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context,
    status
  });

  // Send standardized error response
  const response: ApiError = {
    status,
    error: errorType,
    message,
    ...(error instanceof ValidationError || error instanceof ConfigurationError 
      ? { details: error.details } 
      : {})
  };

  res.status(status).json(response);
}

/**
 * Standardized error handler for client-side operations
 */
export function handleClientError(error: unknown, operation: string): ApiResponse<never> {
  const message = error instanceof Error ? error.message : 'Unknown error';
  
  logger.error(`Client operation failed: ${operation}`, {
    error: message,
    stack: error instanceof Error ? error.stack : undefined
  });

  return { error: message };
}

/**
 * Utility to safely extract error message
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Unknown error occurred';
}

/**
 * Utility to check if error is operational (expected) vs programming error
 */
export function isOperationalError(error: unknown): boolean {
  return error instanceof ValidationError ||
         error instanceof NotFoundError ||
         error instanceof ConfigurationError;
}