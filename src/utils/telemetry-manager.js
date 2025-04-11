/**
 * Telemetry Manager
 *
 * Provides functionality for collecting performance metrics and telemetry data
 * to help identify bottlenecks and optimize the extraction process.
 */

import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Default configuration
const defaultConfig = {
  // Whether telemetry is enabled
  enabled: true,

  // Directory to store telemetry reports
  outputDir: path.join(process.cwd(), 'results', 'telemetry'),

  // Whether to log telemetry data to console
  logToConsole: true,

  // Whether to write telemetry data to file
  writeToFile: true,

  // Minimum duration in milliseconds to record
  minDuration: 5,

  // Whether to include timestamps
  includeTimestamps: true,

  // Whether to include memory usage
  includeMemoryUsage: true
};

// Store active timers
const timers = new Map();

// Store metrics
const metrics = [];

/**
 * Initialize telemetry with custom configuration
 * @param {Object} customConfig - Custom configuration
 * @returns {Object} Telemetry instance
 */
export function initTelemetry(customConfig = {}) {
  const config = { ...defaultConfig, ...customConfig };

  // Create output directory if it doesn't exist
  if (config.writeToFile && !fs.existsSync(config.outputDir)) {
    fs.mkdirSync(config.outputDir, { recursive: true });
  }

  return {
    startTimer: (operationName, metadata = {}) => startTimer(operationName, metadata),
    stopTimer: (timerId, additionalMetadata = {}) => stopTimer(timerId, additionalMetadata),
    recordMetric: (operationName, duration, metadata = {}) => recordMetric(operationName, duration, metadata),
    getMetrics: () => getMetrics(),
    generateReport: (reportName, customConfig = {}) => generateReport(reportName, customConfig)
  };
}

/**
 * Start a timer for an operation
 * @param {string} operationName - Name of the operation
 * @param {Object} metadata - Additional metadata
 * @returns {string} Timer ID
 */
export function startTimer(operationName, metadata = {}) {
  const timerId = `${operationName}-${Date.now()}`;
  timers.set(timerId, {
    startTime: performance.now(),
    operationName,
    metadata
  });
  return timerId;
}

/**
 * Stop a timer and record the metric
 * @param {string} timerId - Timer ID
 * @param {Object} additionalMetadata - Additional metadata
 * @returns {Object} Metric data
 */
export function stopTimer(timerId, additionalMetadata = {}) {
  const timer = timers.get(timerId);
  if (!timer) {
    throw new Error(`Timer ${timerId} not found`);
  }

  const duration = performance.now() - timer.startTime;
  const metadata = { ...timer.metadata, ...additionalMetadata };

  return recordMetric(timer.operationName, duration, metadata);
}

/**
 * Record a metric
 * @param {string} operationName - Name of the operation
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Metric data
 */
export function recordMetric(operationName, duration, metadata = {}) {
  const metric = {
    operationName,
    duration,
    timestamp: new Date().toISOString(),
    ...metadata
  };

  metrics.push(metric);
  return metric;
}

/**
 * Get all recorded metrics
 * @returns {Array} Array of metrics
 */
export function getMetrics() {
  return [...metrics];
}

/**
 * Generate a telemetry report
 * @param {string} reportName - Name of the report
 * @param {Object} customConfig - Custom configuration
 * @returns {Object} Report data
 */
export function generateReport(reportName, customConfig = {}) {
  const config = { ...defaultConfig, ...customConfig };
  const report = {
    name: reportName,
    timestamp: new Date().toISOString(),
    summary: {
      totalOperations: metrics.length,
      totalDuration: metrics.reduce((sum, m) => sum + m.duration, 0),
      averageDuration: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
      slowestOperation: metrics.reduce((slowest, m) => m.duration > slowest.duration ? m : slowest, { duration: 0 })
    },
    metrics: [...metrics]
  };

  if (config.writeToFile) {
    const reportPath = path.join(config.outputDir, `${reportName}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  }

  return report;
}

/**
 * Run a function with telemetry
 * @param {Function} fn - Function to run
 * @param {string} operationName - Name of the operation
 * @param {Object} metadata - Additional metadata
 * @param {Object} telemetry - Telemetry instance
 * @returns {Promise<any>} Function result
 */
export async function withTelemetry(fn, operationName, metadata = {}, telemetry) {
  const timerId = telemetry.startTimer(operationName, metadata);
  try {
    const result = await fn();
    telemetry.stopTimer(timerId);
    return result;
  } catch (error) {
    telemetry.stopTimer(timerId, { error: error.message });
    throw error;
  }
}

// Export default as an object containing all functions
export default {
  initTelemetry,
  startTimer,
  stopTimer,
  recordMetric,
  getMetrics,
  generateReport,
  withTelemetry
};
