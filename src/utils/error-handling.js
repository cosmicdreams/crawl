/**
 * Error Handling Chain of Responsibility Pattern
 * 
 * Provides consistent, categorized error handling with proper user experience
 * and recovery strategies.
 */

/**
 * Base error types for classification
 */
export class AppError extends Error {
  constructor(message, code = 'GENERIC_ERROR', context = null) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();
  }
}

export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', { field, value });
  }
}

export class NetworkError extends AppError {
  constructor(message, url = null, statusCode = null) {
    super(message, 'NETWORK_ERROR', { url, statusCode });
  }
}

export class FileSystemError extends AppError {
  constructor(message, path = null, operation = null) {
    super(message, 'FILESYSTEM_ERROR', { path, operation });
  }
}

export class ConfigurationError extends AppError {
  constructor(message, configKey = null, configValue = null) {
    super(message, 'CONFIGURATION_ERROR', { configKey, configValue });
  }
}

/**
 * Base error handler in Chain of Responsibility pattern
 */
export class ErrorHandler {
  constructor(next = null) {
    this.next = next;
  }

  handle(error, context = {}) {
    if (this.canHandle(error)) {
      return this.handleError(error, context);
    } else if (this.next) {
      return this.next.handle(error, context);
    } else {
      // Fallback handler
      return this.handleUnknownError(error, context);
    }
  }

  canHandle(error) {
    throw new Error('canHandle() must be implemented by concrete handler');
  }

  handleError(error, context) {
    throw new Error('handleError() must be implemented by concrete handler');
  }

  handleUnknownError(error, context) {
    console.error('❌ An unexpected error occurred:');
    console.error(`   ${error.message}`);
    if (context.debug) {
      console.error(`   Stack: ${error.stack}`);
    }
    return { shouldExit: true, exitCode: 1 };
  }
}

/**
 * Handles validation errors (user input problems)
 */
export class ValidationErrorHandler extends ErrorHandler {
  canHandle(error) {
    return error instanceof ValidationError || 
           error.code === 'VALIDATION_ERROR' ||
           error.message.includes('Invalid URL') ||
           error.message.includes('must be between');
  }

  handleError(error, context) {
    console.error('⚠️  Input Validation Error:');
    console.error(`   ${error.message}`);
    
    if (error.context?.field) {
      console.error(`   Field: ${error.context.field}`);
    }
    
    console.error('');
    console.error('💡 Please check your input and try again.');
    console.error('   Use --help for usage information.');
    
    return { shouldExit: true, exitCode: 1 };
  }
}

/**
 * Handles network and connectivity errors
 */
export class NetworkErrorHandler extends ErrorHandler {
  canHandle(error) {
    return error instanceof NetworkError ||
           error.code === 'NETWORK_ERROR' ||
           error.code === 'ECONNREFUSED' ||
           error.code === 'ENOTFOUND' ||
           error.code === 'ETIMEDOUT' ||
           error.message.includes('fetch failed') ||
           error.message.includes('timeout');
  }

  handleError(error, context) {
    console.error('🌐 Network Error:');
    console.error(`   ${error.message}`);
    
    if (error.context?.url) {
      console.error(`   URL: ${error.context.url}`);
    }
    
    console.error('');
    console.error('💡 Troubleshooting suggestions:');
    console.error('   • Check your internet connection');
    console.error('   • Verify the URL is accessible');
    console.error('   • Try again in a few moments');
    
    return { shouldExit: true, exitCode: 2 };
  }
}

/**
 * Handles file system and permission errors
 */
export class FileSystemErrorHandler extends ErrorHandler {
  canHandle(error) {
    return error instanceof FileSystemError ||
           error.code === 'FILESYSTEM_ERROR' ||
           error.code === 'ENOENT' ||
           error.code === 'EACCES' ||
           error.code === 'EPERM' ||
           error.message.includes('permission denied') ||
           error.message.includes('no such file');
  }

  handleError(error, context) {
    console.error('📁 File System Error:');
    console.error(`   ${error.message}`);
    
    if (error.context?.path) {
      console.error(`   Path: ${error.context.path}`);
    }
    
    console.error('');
    console.error('💡 Possible solutions:');
    console.error('   • Check file/directory permissions');
    console.error('   • Ensure the path exists');
    console.error('   • Try running with appropriate permissions');
    
    return { shouldExit: true, exitCode: 3 };
  }
}

/**
 * Handles configuration and setup errors
 */
export class ConfigurationErrorHandler extends ErrorHandler {
  canHandle(error) {
    return error instanceof ConfigurationError ||
           error.code === 'CONFIGURATION_ERROR' ||
           error.message.includes('Configuration file not found') ||
           error.message.includes('No baseUrl');
  }

  handleError(error, context) {
    console.error('⚙️  Configuration Error:');
    console.error(`   ${error.message}`);
    
    if (error.context?.configKey) {
      console.error(`   Config key: ${error.context.configKey}`);
    }
    
    console.error('');
    console.error('💡 Configuration help:');
    console.error('   • Check your configuration file syntax');
    console.error('   • Ensure required fields are present');
    console.error('   • Use --help for configuration options');
    
    return { shouldExit: true, exitCode: 4 };
  }
}

/**
 * Handles application runtime errors
 */
export class ApplicationErrorHandler extends ErrorHandler {
  canHandle(error) {
    return error instanceof AppError ||
           error.name?.includes('Error') ||
           true; // Catch-all for any remaining errors
  }

  handleError(error, context) {
    console.error('💥 Application Error:');
    console.error(`   ${error.message}`);
    
    if (context.operation) {
      console.error(`   During: ${context.operation}`);
    }
    
    if (context.debug || context.verbose) {
      console.error('');
      console.error('🔍 Debug information:');
      console.error(`   Error type: ${error.name}`);
      console.error(`   Error code: ${error.code || 'N/A'}`);
      console.error(`   Stack trace:`);
      console.error(error.stack);
    } else {
      console.error('');
      console.error('💡 Run with --verbose for detailed error information');
    }
    
    return { shouldExit: true, exitCode: 5 };
  }
}

/**
 * Main error handling facade
 */
export class ErrorHandlingChain {
  constructor() {
    // Build the chain of responsibility
    this.handler = new ValidationErrorHandler(
      new NetworkErrorHandler(
        new FileSystemErrorHandler(
          new ConfigurationErrorHandler(
            new ApplicationErrorHandler()
          )
        )
      )
    );
  }

  handle(error, context = {}) {
    return this.handler.handle(error, context);
  }

  /**
   * Handle error and optionally exit process
   */
  handleAndExit(error, context = {}) {
    const result = this.handle(error, context);
    
    if (result.shouldExit) {
      process.exit(result.exitCode);
    }
    
    return result;
  }
}

// Singleton instance for global use
export const errorHandler = new ErrorHandlingChain();