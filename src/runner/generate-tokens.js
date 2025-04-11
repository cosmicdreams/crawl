// src/runner/generate-tokens.js
import path from 'path';
import fs from 'fs';
import * as telemetryManager from '../utils/telemetry-manager.js';
import cacheManager from '../utils/cache-manager.js';
import { generateDesignTokens } from './generator-exports.js';

/**
 * Generate design tokens from extracted data
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {Object} stepsToRun - Object containing steps to run
 * @param {boolean} runAll - Whether to run all steps
 * @returns {Promise<Object>} - Generated tokens
 */
export default async function generateTokens(config, telemetry, stepsToRun, runAll) {
  if (!(runAll || stepsToRun.tokens)) {
    console.log('\n=== Step 3: Generating design tokens [SKIPPED] ===');
    console.log('Using existing design tokens.');
    return loadExistingTokens(config);
  }
  
  console.log('\n=== Step 3: Generating design tokens ===');
  
  try {
    const tokens = await executeTokenGeneration(config, telemetry);
    console.log('Design tokens generated successfully.');
    cacheManager.updateCacheForStep('tokens', config);
    return tokens;
  } catch (error) {
    handleTokenGenerationError(error, telemetry);
    return createEmptyTokens();
  }
}

/**
 * Execute token generation with or without telemetry
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @returns {Promise<Object>} - Generated tokens
 */
async function executeTokenGeneration(config, telemetry) {
  if (telemetry) {
    return await telemetryManager.withTelemetry(
      () => generateDesignTokens(config),
      'generate-tokens',
      {},
      telemetry
    );
  } else {
    return await generateDesignTokens(config);
  }
}

/**
 * Handle token generation error
 * @param {Error} error - Error object
 * @param {Object} telemetry - Telemetry object
 */
function handleTokenGenerationError(error, telemetry) {
  console.error('Error generating design tokens:', error.message);
  
  if (telemetry) {
    telemetry.recordMetric('tokens-generation-error', 0, {
      error: error.message,
      stack: error.stack
    });
  }
}

/**
 * Load existing tokens from file
 * @param {Object} config - Application configuration
 * @returns {Object} - Loaded tokens or empty token structure
 */
function loadExistingTokens(config) {
  try {
    const tokensFile = path.join(config.outputDir, 'tokens/tokens.json');
    if (fs.existsSync(tokensFile)) {
      return JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading existing tokens:', error.message);
  }
  
  return createEmptyTokens();
}

/**
 * Create an empty token structure
 * @returns {Object} - Empty token structure
 */
function createEmptyTokens() {
  return {
    typography: {},
    colors: {},
    spacing: {},
    borders: {},
    animations: {}
  };
}