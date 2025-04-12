// src/runner/index.js
import { ui } from '../utils/ui-utils.js';

import setupConfig from './setup-config.js';
import setupDirectories from './setup-directories.js';
import determineStepsToRun from './determine-steps.js';
import runCrawler from './run-crawler.js';
import runExtractors from './run-extractors.js';
import generateTokens from './generate-tokens.js';
import generateReports from './generate-reports.js';
import processTelemetry from './process-telemetry.js';

/**
 * Main function to run the design token extraction process
 * @param {object} options - Command line options
 */
export async function run(options) {
  // Display logo and welcome message
  ui.logo();
  ui.header('Design Token Extraction Process');

  // 1. Config setup
  const { config, telemetry } = await setupConfig(options);

  // 2. Directory setup
  const { rawDir, cssDir, tokensDir, reportsDir, screenshotsDir } = await setupDirectories(config);

  // 3. Determine steps to run
  const { stepsToRun, runAll } = await determineStepsToRun(config, options);

  // 4. Run crawler
  const crawlResults = await runCrawler(config, telemetry, stepsToRun, runAll, rawDir);

  // 5. Run extractors
  await runExtractors(config, telemetry, stepsToRun, runAll);

  // 6. Generate tokens
  const tokens = await generateTokens(config, telemetry, stepsToRun, runAll);

  // 7. Generate reports
  await generateReports(config, telemetry, tokens, stepsToRun, runAll);

  // 8. Handle component identification (if enabled)
  if (config.withComponents) {
    console.log('\n=== Step 6: Component identification ===');
    console.log('Component identification is not yet implemented.');
    console.log('This feature will be available in a future version.');
  }

  // 9. Generate telemetry report
  if (telemetry) {
    await processTelemetry(config, telemetry);
  }

  console.log('\nDesign token extraction completed!');
  console.log(`Results saved to: ${config.outputDir}`);
}