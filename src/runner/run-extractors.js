// src/runner/run-extractors.js
import { ui } from '../utils/ui-utils.js';
import * as telemetryManager from '../utils/telemetry-manager.js';
import cacheManager from '../utils/cache-manager.js';
import path from 'path';

// Import the extractors from the extractor-exports module
import { extractors } from './extractor-exports.js';

/**
 * Run the extractors to analyze site design tokens
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {Object} stepsToRun - Object containing steps to run
 * @param {boolean} runAll - Whether to run all steps
 * @returns {Promise<void>}
 */
export default async function runExtractors(config, telemetry, stepsToRun, runAll) {
  ui.header('Step 2: Running extractors');
  
  for (const extractorName of config.extractorsToRun) {
    if (!extractors[extractorName]) {
      ui.warning(`Extractor "${extractorName}" not found. Skipping.`);
      continue;
    }
    
    if (!(runAll || stepsToRun[extractorName])) {
      ui.info(`Skipping ${extractorName} extractor (using cached results)`);
      continue;
    }
    
    await runExtractor(extractorName, config, telemetry);
  }
}

/**
 * Run a specific extractor
 * @param {string} extractorName - Name of the extractor to run
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @returns {Promise<void>}
 */
async function runExtractor(extractorName, config, telemetry) {
  const extractorSpinner = ui.createSpinner(`Running ${extractorName} extractor...`);
  extractorSpinner.start();
  
  try {
    const result = await executeExtractor(extractorName, config, telemetry);
    
    /*if (result) {
      displayExtractorResults(result, extractorName, extractorSpinner);
    }*/
    
    cacheManager.updateCacheForStep(extractorName, config);
  } catch (error) {
    extractorSpinner.fail(`Error running ${extractorName} extractor: ${error.message}`);
    ui.error(error.stack);
  }
}

/**
 * Execute an extractor with or without telemetry
 * @param {string} extractorName - Name of the extractor to run
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @returns {Promise<Object>} - Extraction results
 */
async function executeExtractor(extractorName, config, telemetry) {
  if (telemetry) {
    // Create custom config with telemetry settings
    const extractorConfig = {
      ...config,
      telemetry: {
        ...config.telemetry,
        outputDir: path.join(config.telemetry.outputDir, extractorName)
      }
    };
    
    const extractorFunction = extractors[extractorName].run;
    
    return await telemetryManager.withTelemetry(
      () => extractorFunction(extractorConfig),
      `extract-${extractorName}`,
      { extractorName },
      telemetry
    );
  } else {
    // Direct call without telemetry
    const extractorFunction = extractors[extractorName].run;
    return await extractorFunction(config);
  }
}

/**
 * Display extractor results in UI
 * @param {Object} result - Extraction results
 * @param {string} extractorName - Name of the extractor
 * @param {Object} extractorSpinner - Spinner object
 */
function displayExtractorResults(result, extractorName, extractorSpinner) {
  const summary = `Extracted ${Object.keys(result).length} ${extractorName} patterns`;
  extractorSpinner.succeed(summary);

  const resultBox = Object.entries(result)
    .map(([key, value]) => `${key}: ${value === 'boolean' ? value.toString() : value.length}`)
    .join('\n');
  
  ui.box(resultBox, { borderColor: 'green' });
}

// Export the extractors object for use in other modules
export { extractors };