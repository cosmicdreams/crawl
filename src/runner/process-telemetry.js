// src/runner/process-telemetry.js
import path from 'path';

/**
 * Process telemetry data and generate reports
 * @param {object} config - Application configuration
 * @param {object} telemetry - Telemetry object
 * @returns {Promise<void>}
 */
export default async function processTelemetry(config, telemetry) {
  if (!telemetry) return;

  console.log('\n=== Generating Telemetry Report ===');

  try {
    const report = telemetry.generateReport('design-token-extraction', {
      writeToFile: true,
      outputDir: path.join(config.outputDir, 'telemetry')
    });

    displayTelemetrySummary(report, config);
  } catch (error) {
    console.error('Error generating telemetry report:', error.message);
  }
}

/**
 * Display telemetry summary in console
 * @param {object} report - Telemetry report
 * @param {object} config - Application configuration
 */
function displayTelemetrySummary(report, config) {
  console.log(`Telemetry report generated successfully.`);
  console.log(`Total operations: ${report.summary.operationCount}`);
  console.log(`Total duration: ${(report.duration / 1000).toFixed(2)}s`);

  if (report.summary.slowestOperation) {
    console.log(`Slowest operation: ${report.summary.slowestOperation.operationName} (${report.summary.slowestOperation.duration.toFixed(2)}ms)`);
  }

  console.log(`Telemetry reports saved to: ${path.join(config.outputDir, 'telemetry')}`);
}