/**
 * Console Manager
 * 
 * An enhanced console manager with powerful features:
 * - Enabling/disabling logging based on debug mode
 * - Log level filtering (error, warn, info, debug, verbose)
 * - Interactive spinners with Ora integration
 * - Custom formatting and output handling
 * - Prefix support for context in logs
 */

import colors from './colors.js';
import oraPkg from 'ora';
const ora = oraPkg;

// Log levels with numeric values for comparison
const LOG_LEVELS = {
  SILENT: 0,   // No output
  ERROR: 1,    // Only errors
  WARN: 2,     // Errors and warnings
  INFO: 3,     // Standard information (default)
  DEBUG: 4,    // Detailed debugging information
  VERBOSE: 5   // All possible output
};

// Symbol definitions for spinner persistence
const SYMBOLS = {
  INFO: '•',
  SUCCESS: '✓',
  WARNING: '⚠',
  ERROR: '✗',
  DEBUG: '➤',
  VERBOSE: '◦',
};

class ConsoleManager {
  constructor(options = {}) {
    this.options = {
      // Whether to show colors in output
      colors: true,
      
      // Whether debug mode is enabled
      debug: process.env.NODE_ENV !== 'production',
      
      // Current log level
      logLevel: LOG_LEVELS.INFO,
      
      // Whether to include timestamps in logs
      timestamps: false,
      
      // Optional prefix for all log messages
      prefix: '',
      
      // Whether to forward logs to the original console
      forwardToConsole: false,
      
      // Whether to use spinners for interactive output
      useSpinners: process.stdout.isTTY,
      
      // Override with custom options
      ...options
    };
    
    // Store reference to the original console
    this.originalConsole = console;
    
    // Active spinner instance
    this.activeSpinner = null;
    
    // Create public methods that match the standard console API
    this.log = this._createLogMethod('log', LOG_LEVELS.INFO, colors.white, SYMBOLS.INFO);
    this.info = this._createLogMethod('info', LOG_LEVELS.INFO, colors.cyan, SYMBOLS.INFO);
    this.debug = this._createLogMethod('debug', LOG_LEVELS.DEBUG, colors.blue, SYMBOLS.DEBUG);
    this.warn = this._createLogMethod('warn', LOG_LEVELS.WARN, colors.yellow, SYMBOLS.WARNING);
    this.error = this._createLogMethod('error', LOG_LEVELS.ERROR, colors.red, SYMBOLS.ERROR);
    this.verbose = this._createLogMethod('verbose', LOG_LEVELS.VERBOSE, colors.gray, SYMBOLS.VERBOSE);
    this.success = this._createLogMethod('log', LOG_LEVELS.INFO, colors.green, SYMBOLS.SUCCESS);
    
    // Methods that should always pass through
    this.assert = this.originalConsole.assert.bind(this.originalConsole);
    this.clear = this.originalConsole.clear.bind(this.originalConsole);
    this.count = this.originalConsole.count.bind(this.originalConsole);
    this.countReset = this.originalConsole.countReset.bind(this.originalConsole);
    this.table = this.originalConsole.table.bind(this.originalConsole);
    this.time = this.originalConsole.time.bind(this.originalConsole);
    this.timeEnd = this.originalConsole.timeEnd.bind(this.originalConsole);
    this.trace = this._createLogMethod('trace', LOG_LEVELS.DEBUG, colors.magenta, SYMBOLS.DEBUG);
    this.dir = this._createLogMethod('dir', LOG_LEVELS.DEBUG, colors.blue, SYMBOLS.DEBUG);
  }
  
  /**
   * Create a spinner with the current message
   * @param {string} text - The message to display
   * @param {object} options - Additional spinner options
   * @returns {object} - The spinner instance
   */
  spinner(text, options = {}) {
    // Clear existing spinner if any
    this.clearSpinner();
    
    // Only create spinners when they're enabled and in TTY
    if (!this.options.useSpinners || !process.stdout.isTTY) {
      // In non-TTY environments, just log the start message in debug mode
      if (this.options.debug) {
        this.info(text);
      }
      
      // Return a dummy spinner
      return {
        succeed: (msg) => this.success(msg || text),
        fail: (msg) => this.error(msg || text),
        warn: (msg) => this.warn(msg || text),
        info: (msg) => this.info(msg || text),
        stop: () => {},
        clear: () => {},
        text
      };
    }
    
    // Create spinner with Ora
    this.activeSpinner = ora({
      text: this._formatMessage(text),
      spinner: 'dots',
      color: 'cyan',
      ...options
    }).start();
    
    return this.activeSpinner;
  }
  
  /**
   * Clear the active spinner if one exists
   */
  clearSpinner() {
    if (this.activeSpinner) {
      this.activeSpinner.stop();
      this.activeSpinner = null;
    }
  }
  
  /**
   * Update the logger options
   * @param {Object} newOptions - New options to apply
   */
  configure(newOptions = {}) {
    this.options = {
      ...this.options,
      ...newOptions
    };
    
    // Handle string log levels
    if (typeof this.options.logLevel === 'string') {
      const level = this.options.logLevel.toUpperCase();
      if (LOG_LEVELS[level] !== undefined) {
        this.options.logLevel = LOG_LEVELS[level];
      } else {
        this.originalConsole.warn(`Unknown log level: ${this.options.logLevel}, defaulting to INFO`);
        this.options.logLevel = LOG_LEVELS.INFO;
      }
    }
  }
  
  /**
   * Set debug mode on or off
   * @param {boolean} isEnabled - Whether debug mode is enabled
   */
  setDebug(isEnabled) {
    this.options.debug = !!isEnabled;
  }
  
  /**
   * Set the log level
   * @param {string|number} level - Log level name or numeric value
   */
  setLogLevel(level) {
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      if (LOG_LEVELS[upperLevel] !== undefined) {
        this.options.logLevel = LOG_LEVELS[upperLevel];
      } else {
        this.originalConsole.warn(`Unknown log level: ${level}, ignoring`);
      }
    } else if (typeof level === 'number') {
      if (level >= 0 && level <= 5) {
        this.options.logLevel = level;
      } else {
        this.originalConsole.warn(`Invalid log level number: ${level}, must be between 0-5`);
      }
    }
  }
  
  /**
   * Set a prefix for all log messages
   * @param {string} prefix - Prefix to add to all messages
   */
  setPrefix(prefix) {
    this.options.prefix = prefix;
  }
  
  /**
   * Create a child logger with a specific prefix
   * @param {string} prefix - Prefix for the child logger
   * @returns {ConsoleManager} A new console manager with the specified prefix
   */
  createPrefixedLogger(prefix) {
    const childPrefix = this.options.prefix 
      ? `${this.options.prefix}:${prefix}`
      : prefix;
      
    return new ConsoleManager({
      ...this.options,
      prefix: childPrefix
    });
  }
  
  /**
   * Format a message with timestamp and prefix
   * @param {string} message - The message to format
   * @param {Function} colorFn - The color function to apply
   * @returns {string} - The formatted message
   * @private
   */
  _formatMessage(message, colorFn = colors.cyan) {
    if (typeof message !== 'string') {
      return message;
    }
    
    let formattedMessage = message;
    
    // Add timestamp if enabled
    if (this.options.timestamps) {
      const timestamp = new Date().toISOString();
      const timestampStr = this.options.colors 
        ? colors.gray(`[${timestamp}]`)
        : `[${timestamp}]`;
      formattedMessage = `${timestampStr} ${formattedMessage}`;
    }
    
    // Add prefix if set
    if (this.options.prefix) {
      const prefixStr = this.options.colors 
        ? colors.cyan(`[${this.options.prefix}]`)
        : `[${this.options.prefix}]`;
      formattedMessage = `${prefixStr} ${formattedMessage}`;
    }
    
    // Apply colors if enabled and color function provided
    if (this.options.colors && colorFn) {
      formattedMessage = colorFn(formattedMessage);
    }
    
    return formattedMessage;
  }
  
  /**
   * Factory method to create logging functions
   * @private
   */
  _createLogMethod(method, level, colorFn = colors.white, symbol) {
    return (...args) => {
      // Get the message (first argument)
      const message = args[0];
      const restArgs = args.slice(1);
      
      // Skip if:
      // 1. Debug mode is off and this isn't an error/warning message, or
      // 2. The current log level is lower than this message's level
      const isErrorOrWarning = level <= LOG_LEVELS.WARN;
      if (
        (!this.options.debug && level > LOG_LEVELS.WARN) || 
        (this.options.logLevel < level)
      ) {
        // Special case: always output errors/warnings even in non-debug mode
        if (isErrorOrWarning && typeof message === 'string') {
          const formattedMessage = this._formatMessage(message, colorFn);
          this.originalConsole.error(formattedMessage, ...restArgs);
          
          // If we have an active spinner, update it to show the error/warning
          if (this.activeSpinner) {
            if (level === LOG_LEVELS.ERROR) {
              this.activeSpinner.fail(formattedMessage);
            } else if (level === LOG_LEVELS.WARN) {
              this.activeSpinner.warn(formattedMessage);
            }
          }
        }
        return;
      }
      
      // Format the message
      const formattedMessage = typeof message === 'string' 
        ? this._formatMessage(message, colorFn)
        : message;
      
      // If we have an active spinner, use stopAndPersist in debug mode to preserve output
      if (this.activeSpinner && this.options.debug) {
        this.activeSpinner.stopAndPersist({
          symbol: this.options.colors ? colorFn(symbol) : symbol,
          text: formattedMessage,
        });

        // If there are additional arguments, log them separately
        if (restArgs.length > 0) {
          this.originalConsole[method](formattedMessage, ...restArgs);
        }

        // Restart the spinner with its current text
        this.activeSpinner = ora({
          text: this.activeSpinner.text,
          spinner: 'dots',
          color: 'cyan',
        }).start();
      } else if (this.activeSpinner) {
        // No active spinner, just log normally
        //this.originalConsole[method](formattedMessage, ...restArgs);
        this.activeSpinner.text = formattedMessage;
      }
      else if (this.options.forwardToConsole) {
        // Forward to original console if enabled
        this.originalConsole[method](message, ...restArgs);
      }
    };
  }
  
  /**
   * Create a progress task with spinner
   * @param {string} initialMessage - Initial message to display
   * @param {object} options - Spinner options
   * @returns {object} - Task object with update/complete methods
   */
  task(initialMessage, options = {}) {
    const spinner = this.spinner(initialMessage, options);
    
    // Return a task object with chainable methods
    return {
      // Update the task message
      update: (message) => {
        if (spinner) {
          spinner.text = this._formatMessage(message);
        }
        return this;
      },
      
      // Complete the task successfully
      complete: (message) => {
        if (spinner) {
          spinner.succeed(this._formatMessage(message || initialMessage));
        }
        return this;
      },
      
      // Mark the task as failed
      fail: (message) => {
        if (spinner) {
          spinner.fail(this._formatMessage(message || `Failed: ${initialMessage}`));
        }
        return this;
      },
      
      // Get the raw spinner object
      spinner: () => spinner
    };
  }
}

// Create a reusable default instance
const defaultLogger = new ConsoleManager();

/**
 * Get a configured logger from application config
 * @param {Object} config - Application configuration
 * @param {string} [section=''] - Optional section name for prefixed logging
 * @returns {ConsoleManager} - Configured console manager
 */
function getLogger(config, section = '') {
  // If no config or no logging config, return default logger
  if (!config || !config.logging) {
    return section ? defaultLogger.createPrefixedLogger(section) : defaultLogger;
  }
  
  // Initialize with logging config
  const logger = new ConsoleManager({
    debug: config.logging.debug !== undefined ? config.logging.debug : true,
    logLevel: config.logging.logLevel || 'INFO',
    colors: config.logging.colors !== undefined ? config.logging.colors : true,
    timestamps: config.logging.timestamps || false,
    prefix: config.logging.prefix || ''
  });
  
  // Add section to prefix if provided
  if (section) {
    const currentPrefix = logger.options.prefix;
    const newPrefix = currentPrefix 
      ? `${currentPrefix}:${section}`
      : section;
    logger.setPrefix(newPrefix);
  }
  
  return logger;
}

// Export the class, constants, and utility functions
export { ConsoleManager, LOG_LEVELS, defaultLogger, getLogger };
export default defaultLogger;