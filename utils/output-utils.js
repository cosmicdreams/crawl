/**
 * Utility functions for consistent console output formatting in the crawler
 */
import ora from 'ora';
import chalk from 'chalk';

// Single active spinner instance and current ID
let activeSpinner = null;
let currentId = null;

/**
 * Creates and manages a single spinner with consistent formatting
 */
class SpinnerManager {
  /**
   * Create a new spinner or update an existing one
   * @param {string} id - Unique ID for referencing this spinner later
   * @param {string} message - The message to display
   * @param {Object} options - Additional options for the spinner
   * @param {string} options.type - Message type: 'info', 'success', 'warning', 'error'
   * @param {string} options.spinner - The spinner type (dots, line, etc.)
   * @param {string} options.color - Color override (default: based on type)
   * @param {boolean} options.persist - Whether to keep spinner visible after completion
   * @returns {Object} - The spinner instance
   */
  static update(id, message, options = {}) {
    const {
      type = 'info',
      spinner = 'dots',
      color,
      persist = false,
    } = options;

    // Determine color based on type if not explicitly provided
    const messageColor = color ||
      (type === 'success' ? 'green' :
        type === 'warning' ? 'yellow' :
          type === 'error' ? 'red' : 'blue');

    // Format message with appropriate color
    const formattedMessage = chalk[messageColor](message);

    // Stop any existing spinner
    /*if (activeSpinner && (id !== currentId || ['success', 'warning', 'error'].includes(type))) {
      activeSpinner.stop();
      activeSpinner = null;
    }*/

    // Create a new spinner or update the existing one
    if (!activeSpinner) {
      activeSpinner = ora({
        text: formattedMessage,
        spinner: spinner,
        color: messageColor,
      });

      currentId = id;

      // Handle different completion states
      if (type === 'success') {
        activeSpinner.succeed(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      } else if (type === 'warning') {
        activeSpinner.warn(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      } else if (type === 'error') {
        activeSpinner.fail(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      } else if (!activeSpinner.isSpinning) {
        activeSpinner.start();
      }
    } else {
      // Update existing spinner with new ID prefix
      activeSpinner.text = formattedMessage;
      currentId = id;

      // Handle different completion states
      /*if (type === 'success') {
        activeSpinner.succeed(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      } else if (type === 'warning') {
        activeSpinner.warn(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      } else if (type === 'error') {
        activeSpinner.fail(formattedMessage);
        if (!persist) {
          activeSpinner = null;
          currentId = null;
        }
      }*/
    }

    return activeSpinner;
  }

  /**
   * Create a spinner with info (blue) styling
   * @param {string} id - Unique ID for this spinner
   * @param {string} message - Message to display
   * @param {Object} options - Additional spinner options
   * @returns {Object} - The spinner instance
   */
  static info(id, message, options = {}) {
    return this.update(id, message, { ...options, type: 'info' });
  }

  /**
   * Create or update a spinner with success (green) styling
   * @param {string} id - Unique ID for this spinner
   * @param {string} message - Message to display
   * @param {Object} options - Additional spinner options
   * @returns {Object} - The spinner instance
   */
  static success(id, message, options = {}) {
    return this.update(id, message, { ...options, type: 'success' });
  }

  /**
   * Create or update a spinner with warning (yellow) styling
   * @param {string} id - Unique ID for this spinner
   * @param {string} message - Message to display
   * @param {Object} options - Additional spinner options
   * @returns {Object} - The spinner instance
   */
  static warning(id, message, options = {}) {
    return this.update(id, message, { ...options, type: 'warning' });
  }

  /**
   * Create or update a spinner with error (red) styling
   * @param {string} id - Unique ID for this spinner
   * @param {string} message - Message to display
   * @param {Object} options - Additional spinner options
   * @returns {Object} - The spinner instance
   */
  static error(id, message, options = {}) {
    return this.update(id, message, { ...options, type: 'error' });
  }

  /**
   * Successfully complete a spinner
   * @param {string} id - The ID of the spinner to complete
   * @param {string} message - Optional completion message
   */
  static succeed(id, message) {
    if (activeSpinner && currentId === id) {
      activeSpinner.succeed(message || activeSpinner.text);
      activeSpinner = null;
      currentId = null;
    }
  }

  /**
   * Fail a spinner
   * @param {string} id - The ID of the spinner to fail
   * @param {string} message - Optional failure message
   */
  static fail(id, message) {
    if (activeSpinner && currentId === id) {
      activeSpinner.fail(message || activeSpinner.text);
      activeSpinner = null;
      currentId = null;
    }
  }

  /**
   * Get the active spinner
   * @returns {Object|null} - The active spinner or null
   */
  static getActive() {
    return activeSpinner;
  }

  /**
   * Create a global spinner for use across multiple modules
   * @param {string} id - Unique ID for this spinner
   * @param {string} message - Initial message to display
   * @param {Object} options - Additional spinner options
   * @returns {Object} - The spinner manager object with methods to control the spinner
   */
  static createGlobalSpinner(id, message, options = {}) {
    // Create an initial spinner
    const spinner = this.info(id, message, { ...options, persist: true });

    // Return an object with methods to control this specific spinner
    return {
      id,
      update: (msg) => this.update(id, msg),
      info: (msg) => this.warning(id, msg),
      success: (msg) => this.success(id, msg),
      warning: (msg) => this.warning(id, msg),
      error: (msg) => this.error(id, msg),
      fail: (msg) => this.fail(id, msg),
    };
  }
}

/**
 * Create formatted box output for summaries
 * @param {string} title - Box title
 * @param {string[]} lines - Array of lines to include in the box
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted box output
 */
function createSummaryBox(title, lines = [], options = {}) {
  const {
    titleColor = 'green',
    borderColor = 'white',
    padding = 1,
  } = options;

  // Calculate max line length
  const contentWidth = Math.max(
    title.length,
    ...lines.map(line => {
      // Strip ANSI color codes for length calculation
      return line.replace(/\u001b\[\d+m/g, '').length;
    }),
  );

  // Create border
  const border = chalk[borderColor]('═'.repeat(contentWidth + (padding * 2)));

  // Format title with color
  const formattedTitle = chalk.bold[titleColor](title);

  // Build box
  const box = [
    '',
    formattedTitle,
    border,
    ...lines,
    '',
  ];

  return box.join('\n');
}

export {
  SpinnerManager,
  createSummaryBox,
};
