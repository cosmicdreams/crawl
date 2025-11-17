/**
 * Logging Strategy Pattern Implementation
 * 
 * Provides different logging strategies for various output modes (verbose, default, quiet)
 * while maintaining type safety and interface consistency.
 */

/**
 * Base logging strategy interface
 */
export class LoggingStrategy {
  constructor(baseLogger) {
    this.baseLogger = baseLogger;
  }

  // Override these methods in concrete strategies
  info(message, context) {
    throw new Error('info() must be implemented by concrete strategy');
  }

  success(message, context) {
    throw new Error('success() must be implemented by concrete strategy');
  }

  error(message, context) {
    throw new Error('error() must be implemented by concrete strategy');
  }

  // Delegate other logging methods to base logger
  debug(message, context) {
    return this.baseLogger.debug(message, context);
  }

  warn(message, context) {
    return this.baseLogger.warn(message, context);
  }
}

/**
 * Verbose logging strategy - shows all log messages with timestamps
 */
export class VerboseLoggingStrategy extends LoggingStrategy {
  info(message, context) {
    return this.baseLogger.info(message, context);
  }

  success(message, context) {
    return this.baseLogger.success(message, context);
  }

  error(message, context) {
    return this.baseLogger.error(message, context);
  }
}

/**
 * Default logging strategy - shows errors and user-facing messages, hides INFO/SUCCESS logs
 */
export class DefaultLoggingStrategy extends LoggingStrategy {
  info(message, context) {
    // Silent - default mode hides INFO logs
    return;
  }

  success(message, context) {
    // Silent - default mode hides SUCCESS logs
    return;
  }

  error(message, context) {
    // Always show errors in all modes with clean formatting
    console.error(`Error: ${message}`);
    if (context) {
      console.error(context);
    }
  }
}

/**
 * Quiet logging strategy - minimal output for essential info only
 */
export class QuietLoggingStrategy extends LoggingStrategy {
  info(message, context) {
    // Completely silent for info messages in quiet mode
    return;
  }

  success(message, context) {
    // Completely silent for success messages in quiet mode  
    return;
  }

  error(message, context) {
    // Always show errors in all modes with clean formatting
    console.error(`Error: ${message}`);
    if (context) {
      console.error(context);
    }
  }
}

/**
 * Logger facade that delegates to a strategy
 */
export class StrategyLogger {
  constructor(strategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  info(message, context) {
    return this.strategy.info(message, context);
  }

  success(message, context) {
    return this.strategy.success(message, context);
  }

  error(message, context) {
    return this.strategy.error(message, context);
  }

  debug(message, context) {
    return this.strategy.debug(message, context);
  }

  warn(message, context) {
    return this.strategy.warn(message, context);
  }
}

/**
 * Factory for creating logging strategies
 */
export class LoggingStrategyFactory {
  static create(mode, baseLogger) {
    switch (mode) {
      case 'verbose':
        return new VerboseLoggingStrategy(baseLogger);
      case 'quiet':
        return new QuietLoggingStrategy(baseLogger);
      case 'default':
      default:
        return new DefaultLoggingStrategy(baseLogger);
    }
  }
}