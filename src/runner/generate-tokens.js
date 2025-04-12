// src/runner/generate-tokens.js
import path from 'path';
import fs from 'fs';

import * as telemetryManager from '../utils/telemetry-manager.js';
import cacheManager from '../utils/cache-manager.js';

import { generateDesignTokens } from './generator-exports.js';

/**
 * Generate design tokens from extracted data
 * @param {object} config - Application configuration
 * @param {object} telemetry - Telemetry object
 * @param {object} stepsToRun - Object containing steps to run
 * @param {boolean} runAll - Whether to run all steps
 * @returns {Promise<object>} - Generated tokens
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
 * @param {object} config - Application configuration
 * @param {object} telemetry - Telemetry object
 * @returns {Promise<object>} - Generated tokens
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
 * @param {object} telemetry - Telemetry object
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
 * @param {object} config - Application configuration
 * @returns {object} - Loaded tokens or empty token structure
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
 * @returns {object} - Empty token structure
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