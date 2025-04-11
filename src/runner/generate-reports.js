// src/runner/generate-reports.js
import * as telemetryManager from '../utils/telemetry-manager.js';
import cacheManager from '../utils/cache-manager.js';
import { generateMarkdownReport, generateReports as generateHTMLReports } from './generator-exports.js';

/**
 * Generate reports from design tokens
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {Object} tokens - Design tokens
 * @param {Object} stepsToRun - Object containing steps to run
 * @param {boolean} runAll - Whether to run all steps
 * @returns {Promise<void>}
 */
export default async function generateReports(config, telemetry, tokens, stepsToRun, runAll) {
  if (!(runAll || stepsToRun.reports)) {
    console.log('\n=== Step 4: Generating reports [SKIPPED] ===');
    console.log('Using existing reports.');
    return;
  }
  
  await generateMarkdownReports(config, telemetry, tokens);
  await generateHTMLReportsWrapper(config, telemetry);
}

/**
 * Generate markdown reports from design tokens
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {Object} tokens - Design tokens
 * @returns {Promise<void>}
 */
async function generateMarkdownReports(config, telemetry, tokens) {
  console.log('\n=== Step 4: Generating markdown report ===');
  
  if (!tokens || Object.keys(tokens).length === 0) {
    console.log('Skipping markdown report generation because no tokens were generated.');
    return;
  }
  
  try {
    // Make sure tokens has the expected structure
    const validTokens = {
      typography: tokens.typography || {},
      colors: tokens.colors || {},
      spacing: tokens.spacing || {},
      borders: tokens.borders || {},
      animations: tokens.animations || {}
    };
    
    // Generate markdown report
    if (telemetry) {
      await telemetryManager.withTelemetry(
        () => generateMarkdownReport(validTokens),
        'generate-markdown-report',
        {},
        telemetry
      );
    } else {
      await generateMarkdownReport(validTokens);
    }
    
    console.log('Markdown report generated successfully.');
  } catch (error) {
    handleReportError(error, 'markdown-report', telemetry);
  }
}

/**
 * Generate HTML reports
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @returns {Promise<void>}
 */
async function generateHTMLReportsWrapper(config, telemetry) {
  console.log('\n=== Step 5: Generating HTML reports ===');
  
  try {
    if (telemetry) {
      await telemetryManager.withTelemetry(
        () => generateHTMLReports(config),
        'generate-html-reports',
        {},
        telemetry
      );
    } else {
      await generateHTMLReports(config);
    }
    
    console.log('HTML reports generated successfully.');
    cacheManager.updateCacheForStep('reports', config);
  } catch (error) {
    handleReportError(error, 'html-reports', telemetry);
  }
}

/**
 * Handle report generation error
 * @param {Error} error - Error object
 * @param {string} reportType - Type of report
 * @param {Object} telemetry - Telemetry object
 */
function handleReportError(error, reportType, telemetry) {
  console.error(`Error generating ${reportType}:`, error.message);
  
  if (telemetry) {
    telemetry.recordMetric(`${reportType}-error`, 0, {
      error: error.message,
      stack: error.stack
    });
  }
}