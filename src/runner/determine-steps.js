// src/runner/determine-steps.js
import cacheManager from '../utils/cache-manager.js';
import { pathsFileExists } from '../utils/config-manager.js';
import { ui } from '../utils/ui-utils.js';

import { promptToContinue } from './prompt-utils.js';

/**
 * Determine which steps need to be run based on cache and user input
 * @param {object} config - Application configuration
 * @param {object} options - Command line options
 * @returns {object} - Object containing steps to run and runAll flag
 */
export default async function determineStepsToRun(config, options) {
  // Check if paths.json exists
  const hasPathsFile = pathsFileExists();

  // Determine which steps to run based on cache and user input
  let stepsToRun = {};
  let runAll = options.force;

  if (!options.force && !options.yes) {
    // Analyze what steps need to run
    const stepAnalysis = cacheManager.analyzeStepsToRun(config);

    // If paths.json was just created, prompt the user to review it before analyzing cache
    if (!hasPathsFile && pathsFileExists()) {
      await promptToContinue();
      ui.info('Continuing with extraction process...');
    }

    // Prompt user for what to run
    const userChoice = await cacheManager.promptUser(stepAnalysis, config);
    runAll = userChoice.runAll;
    stepsToRun = userChoice.steps;
  } else if (options.yes) {
    // Skip cache prompt but still respect cache
    const stepAnalysis = cacheManager.analyzeStepsToRun(config);
    Object.entries(stepAnalysis).forEach(([step, analysis]) => {
      if (analysis.needsRun) {
        stepsToRun[step] = true;
      }
    });
  } else if (options.force) {
    // Force running all steps
    stepsToRun = {
      crawl: true,
      typography: true,
      colors: true,
      spacing: true,
      borders: true,
      animations: true,
      tokens: true,
      reports: true
    };
  }

  return { stepsToRun, runAll };
}