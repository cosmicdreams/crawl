// src/runner/setup-config.js
import path from 'path';

import * as configManager from '../utils/config-manager.js';
import * as telemetryManager from '../utils/telemetry-manager.js';
import { ui } from '../utils/ui-utils.js';

/**
 * Set up the configuration for the application
 * @param {object} options - Command line options
 * @returns {object} - Configuration and telemetry objects
 */
export default async function setupConfig(options) {
  const fileConfig = await configManager.initConfig();
  console.log('Loaded config file with baseUrl:', fileConfig.baseUrl);

  // Map CLI options to config properties
  if (options.url) {
    options.baseUrl = options.url;
    console.log('Command line URL specified:', options.baseUrl);
  }

  const config = configManager.mergeWithOptions(fileConfig, options);
  console.log('Final merged config baseUrl:', config.baseUrl);

  // Set additional config options
  config.extractorsToRun = options.only ? options.only.split(',') : getDefaultExtractors();
  config.format = options.format || 'css';
  config.withComponents = options.withComponents || false;

  // Handle relative paths in config
  normalizeConfigPaths(config);

  // Initialize telemetry
  let telemetry = setupTelemetry(config);

  return { config, telemetry };
}

/**
 * Set up telemetry configuration and initialization
 * @param {object} config - Application configuration
 * @returns {object | null} - Telemetry object if enabled, null otherwise
 */
function setupTelemetry(config) {
  // Ensure telemetry configuration is set
  if (!config.telemetry) {
    config.telemetry = {
      enabled: true,
      outputDir: path.join(process.cwd(), 'results/telemetry'),
      logToConsole: true,
      writeToFile: true,
      minDuration: 5,
      includeTimestamps: true,
      includeMemoryUsage: true
    };
  } else if (!config.telemetry.outputDir) {
    config.telemetry.outputDir = path.join(process.cwd(), 'results/telemetry');
  }

  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
    ui.info('Telemetry collection enabled');
  }

  return telemetry;
}

/**
 * Normalize paths in config to absolute paths
 * @param {object} config - Application configuration
 */
function normalizeConfigPaths(config) {
  // Handle relative outputDir paths
  if (config.outputDir && (config.outputDir.startsWith('./') || config.outputDir.startsWith('../'))) {
    config.outputDir = path.resolve(process.cwd(), config.outputDir);
  }
}

/**
 * Get the default list of extractors
 * @returns {string[]} - Array of extractor names
 */
function getDefaultExtractors() {
  return ['typography', 'colors', 'spacing', 'borders', 'animations'];
}