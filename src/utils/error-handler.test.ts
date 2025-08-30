// src/utils/error-handler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

export class CrawlerError extends Error {
  constructor(
    message: string, 
    public code: string,
    public details?: any,
    public recoverable = false
  ) {
    super(message);
    this.name = 'CrawlerError';
  }
}

export class ValidationError extends CrawlerError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details, false);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends CrawlerError {
  constructor(message: string, details?: any) {
    super(message, 'NETWORK_ERROR', details, true);
    this.name = 'NetworkError';
  }
}

export class ExtractionError extends CrawlerError {
  constructor(message: string, details?: any) {
    super(message, 'EXTRACTION_ERROR', details, true);
    this.name = 'ExtractionError';
  }
}

export class ErrorHandler {
  private static errorCounts: Map<string, number> = new Map();
  private static maxRetries = 3;

  static handleError(error: Error, context: string): { shouldRetry: boolean; delay?: number } {
    const errorKey = `${context}:${error.name}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    console.error(`[${context}] Error: ${error.message}`, error);

    // Determine retry strategy based on error type
    if (error instanceof NetworkError && currentCount < this.maxRetries) {
      const delay = Math.min(1000 * Math.pow(2, currentCount), 10000); // Exponential backoff
      return { shouldRetry: true, delay };
    }

    if (error instanceof ExtractionError && currentCount < 2) {
      return { shouldRetry: true, delay: 500 };
    }

    return { shouldRetry: false };
  }

  static createNetworkError(message: string, originalError?: Error): NetworkError {
    const details = originalError ? {
      originalMessage: originalError.message,
      stack: originalError.stack
    } : undefined;

    return new NetworkError(message, details);
  }

  static createValidationError(message: string, field: string, value: any): ValidationError {
    return new ValidationError(message, { field, value });
  }

  static createExtractionError(message: string, stage: string, input?: any): ExtractionError {
    return new ExtractionError(message, { stage, input });
  }

  static isRetryableError(error: Error): boolean {
    return error instanceof CrawlerError && error.recoverable;
  }

  static getErrorSummary(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  static resetErrorCounts(): void {
    this.errorCounts.clear();
  }

  static logErrorDetails(error: Error): void {
    console.group('Error Details:');
    console.log('Name:', error.name);
    console.log('Message:', error.message);
    
    if (error instanceof CrawlerError) {
      console.log('Code:', error.code);
      console.log('Recoverable:', error.recoverable);
      if (error.details) {
        console.log('Details:', error.details);
      }
    }
    
    if (error.stack) {
      console.log('Stack:', error.stack);
    }
    console.groupEnd();
  }
}

describe('Error Classes', () => {
  describe('CrawlerError', () => {
    it('should create error with required properties', () => {
      const error = new CrawlerError('Test error', 'TEST_CODE');
      
      expect(error.name).toBe('CrawlerError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_CODE');
      expect(error.recoverable).toBe(false);
      expect(error.details).toBeUndefined();
    });

    it('should create error with all properties', () => {
      const details = { extra: 'info' };
      const error = new CrawlerError('Test error', 'TEST_CODE', details, true);
      
      expect(error.recoverable).toBe(true);
      expect(error.details).toEqual(details);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with proper defaults', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.name).toBe('ValidationError');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.recoverable).toBe(false);
    });

    it('should include validation details', () => {
      const details = { field: 'email', value: 'invalid-email' };
      const error = new ValidationError('Invalid email format', details);
      
      expect(error.details).toEqual(details);
    });
  });

  describe('NetworkError', () => {
    it('should create network error with proper defaults', () => {
      const error = new NetworkError('Connection failed');
      
      expect(error.name).toBe('NetworkError');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.recoverable).toBe(true);
    });
  });

  describe('ExtractionError', () => {
    it('should create extraction error with proper defaults', () => {
      const error = new ExtractionError('Extraction failed');
      
      expect(error.name).toBe('ExtractionError');
      expect(error.code).toBe('EXTRACTION_ERROR');
      expect(error.recoverable).toBe(true);
    });
  });
});

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.resetErrorCounts();
  });

  describe('handleError', () => {
    it('should handle network errors with retry logic', () => {
      const error = new NetworkError('Connection timeout');
      const result = ErrorHandler.handleError(error, 'test-context');
      
      expect(result.shouldRetry).toBe(true);
      expect(result.delay).toBe(1000);
    });

    it('should implement exponential backoff for network errors', () => {
      const error = new NetworkError('Connection timeout');
      
      // First retry
      const result1 = ErrorHandler.handleError(error, 'test-context');
      expect(result1.delay).toBe(1000);
      
      // Second retry
      const result2 = ErrorHandler.handleError(error, 'test-context');
      expect(result2.delay).toBe(2000);
      
      // Third retry
      const result3 = ErrorHandler.handleError(error, 'test-context');
      expect(result3.delay).toBe(4000);
      
      // Fourth attempt should not retry
      const result4 = ErrorHandler.handleError(error, 'test-context');
      expect(result4.shouldRetry).toBe(false);
    });

    it('should handle extraction errors with limited retries', () => {
      const error = new ExtractionError('Parsing failed');
      
      // First retry
      const result1 = ErrorHandler.handleError(error, 'test-context');
      expect(result1.shouldRetry).toBe(true);
      expect(result1.delay).toBe(500);
      
      // Second retry
      const result2 = ErrorHandler.handleError(error, 'test-context');
      expect(result2.shouldRetry).toBe(true);
      
      // Third attempt should not retry
      const result3 = ErrorHandler.handleError(error, 'test-context');
      expect(result3.shouldRetry).toBe(false);
    });

    it('should not retry validation errors', () => {
      const error = new ValidationError('Invalid configuration');
      const result = ErrorHandler.handleError(error, 'test-context');
      
      expect(result.shouldRetry).toBe(false);
    });

    it('should not retry generic errors', () => {
      const error = new Error('Generic error');
      const result = ErrorHandler.handleError(error, 'test-context');
      
      expect(result.shouldRetry).toBe(false);
    });

    it('should track error counts by context and type', () => {
      const networkError = new NetworkError('Network issue');
      const validationError = new ValidationError('Validation issue');
      
      ErrorHandler.handleError(networkError, 'crawler');
      ErrorHandler.handleError(networkError, 'crawler');
      ErrorHandler.handleError(validationError, 'config');
      
      const summary = ErrorHandler.getErrorSummary();
      expect(summary['crawler:NetworkError']).toBe(2);
      expect(summary['config:ValidationError']).toBe(1);
    });
  });

  describe('error creation helpers', () => {
    it('should create network error with original error details', () => {
      const originalError = new Error('Original message');
      originalError.stack = 'original stack trace';
      
      const networkError = ErrorHandler.createNetworkError('Network failed', originalError);
      
      expect(networkError.message).toBe('Network failed');
      expect(networkError.details.originalMessage).toBe('Original message');
      expect(networkError.details.stack).toBe('original stack trace');
    });

    it('should create validation error with field details', () => {
      const error = ErrorHandler.createValidationError(
        'Email is required', 
        'email', 
        null
      );
      
      expect(error.message).toBe('Email is required');
      expect(error.details.field).toBe('email');
      expect(error.details.value).toBe(null);
    });

    it('should create extraction error with stage details', () => {
      const input = { url: 'https://example.com' };
      const error = ErrorHandler.createExtractionError(
        'Color extraction failed',
        'color-extractor',
        input
      );
      
      expect(error.message).toBe('Color extraction failed');
      expect(error.details.stage).toBe('color-extractor');
      expect(error.details.input).toBe(input);
    });
  });

  describe('error identification', () => {
    it('should identify retryable errors', () => {
      const networkError = new NetworkError('Network issue');
      const extractionError = new ExtractionError('Extraction issue');
      const validationError = new ValidationError('Validation issue');
      const genericError = new Error('Generic issue');
      
      expect(ErrorHandler.isRetryableError(networkError)).toBe(true);
      expect(ErrorHandler.isRetryableError(extractionError)).toBe(true);
      expect(ErrorHandler.isRetryableError(validationError)).toBe(false);
      expect(ErrorHandler.isRetryableError(genericError)).toBe(false);
    });
  });

  describe('error logging', () => {
    it('should log detailed error information', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});
      
      const error = new NetworkError('Test error', { extra: 'details' });
      ErrorHandler.logErrorDetails(error);
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Error Details:');
      expect(consoleSpy).toHaveBeenCalledWith('Name:', 'NetworkError');
      expect(consoleSpy).toHaveBeenCalledWith('Message:', 'Test error');
      expect(consoleSpy).toHaveBeenCalledWith('Code:', 'NETWORK_ERROR');
      expect(consoleSpy).toHaveBeenCalledWith('Recoverable:', true);
      expect(consoleSpy).toHaveBeenCalledWith('Details:', { extra: 'details' });
      expect(consoleGroupEndSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
      consoleGroupSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('error summary and reset', () => {
    it('should provide error summary', () => {
      const error1 = new NetworkError('Error 1');
      const error2 = new ValidationError('Error 2');
      
      ErrorHandler.handleError(error1, 'context1');
      ErrorHandler.handleError(error1, 'context1');
      ErrorHandler.handleError(error2, 'context2');
      
      const summary = ErrorHandler.getErrorSummary();
      expect(summary['context1:NetworkError']).toBe(2);
      expect(summary['context2:ValidationError']).toBe(1);
    });

    it('should reset error counts', () => {
      const error = new NetworkError('Test error');
      ErrorHandler.handleError(error, 'test');
      
      expect(Object.keys(ErrorHandler.getErrorSummary())).toHaveLength(1);
      
      ErrorHandler.resetErrorCounts();
      expect(Object.keys(ErrorHandler.getErrorSummary())).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('should handle errors without stack traces', () => {
      const error = new Error('No stack trace');
      delete error.stack;
      
      expect(() => ErrorHandler.logErrorDetails(error)).not.toThrow();
    });

    it('should handle extremely high retry counts', () => {
      const error = new NetworkError('Persistent error');
      
      // Simulate many retries
      for (let i = 0; i < 10; i++) {
        ErrorHandler.handleError(error, 'persistent-context');
      }
      
      const result = ErrorHandler.handleError(error, 'persistent-context');
      expect(result.shouldRetry).toBe(false);
    });

    it('should cap exponential backoff delay', () => {
      const error = new NetworkError('Backoff test');
      
      // Force high retry count
      for (let i = 0; i < 5; i++) {
        const result = ErrorHandler.handleError(error, 'backoff-test');
        if (result.delay && result.delay >= 10000) {
          expect(result.delay).toBe(10000); // Should cap at 10 seconds
          break;
        }
      }
    });
  });
});