// src/runner/run-crawler.js
import { pathsFileExists, promptForPathsRegeneration, DEFAULT_PATHS_PATH } from '../utils/config-manager.js';
import { crawlSite } from '../crawler/site-crawler.js';
import * as telemetryManager from '../utils/telemetry-manager.js';
import cacheManager from '../utils/cache-manager.js';
import { ui } from '../utils/ui-utils.js';
import colors from '../utils/colors.js';
import fs from 'fs';
import path from 'path';
import { promptToContinue } from './prompt-utils.js';

/**
 * Run the crawler to collect site data
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {Object} stepsToRun - Object containing steps to run
 * @param {boolean} runAll - Whether to run all steps
 * @param {string} rawDir - Raw output directory
 * @returns {Promise<Object|null>} - Crawl results or null if skipped
 */
export default async function runCrawler(config, telemetry, stepsToRun, runAll, rawDir) {
  if (!(runAll || stepsToRun.crawl)) {
    ui.info('Skipping crawl step (using cached results)');
    return null;
  }
  
  ui.header('Step 1: Crawling the site');
  
  const hasPathsFile = pathsFileExists();
  let skipCrawl = false;
  
  if (hasPathsFile) {
    skipCrawl = await handleExistingPathsFile();
  }
  
  if (skipCrawl) {
    return null;
  }
  
  return await performCrawl(config, telemetry, rawDir);
}

/**
 * Handle existing paths file
 * @returns {Promise<boolean>} - Whether to skip crawl
 */
async function handleExistingPathsFile() {
  ui.info('Paths file found at: ' + DEFAULT_PATHS_PATH);
  const regenerate = await promptForPathsRegeneration();
  
  if (!regenerate) {
    ui.info('Using existing paths file, skipping crawl step');
    return true;
  }
  
  ui.info('Regenerating paths file');
  return false;
}

/**
 * Perform the actual crawl
 * @param {Object} config - Application configuration
 * @param {Object} telemetry - Telemetry object
 * @param {string} rawDir - Raw output directory
 * @returns {Promise<Object>} - Crawl results
 */
async function performCrawl(config, telemetry, rawDir) {
  const crawlSpinner = ui.createSpinner('Crawling website...');
  crawlSpinner.start();
  
  let crawlResults;
  
  console.log(`Using baseUrl: ${config.baseUrl}`);
  console.log(`About to call crawlSite with baseUrl: ${config.baseUrl}`);
  
  if (telemetry) {
    console.log('Calling crawlSite with telemetry');
    crawlResults = await telemetryManager.withTelemetry(
      async () => crawlSite(config.baseUrl, config.maxPages, { baseUrl: config.baseUrl }),
      'crawl-site',
      { baseUrl: config.baseUrl, maxPages: config.maxPages },
      telemetry
    );
  } else {
    console.log('Calling crawlSite without telemetry');
    // Pass the baseUrl and maxPages to the crawler, explicitly passing baseUrl as an option
    crawlResults = await crawlSite(config.baseUrl, config.maxPages, { baseUrl: config.baseUrl });
  }
  
  displayCrawlResults(crawlResults, crawlSpinner);
  
  if (pathsFileExists()) {
    await promptForPathsReview();
  } else {
    ui.warning('No paths file was generated. This may indicate a crawling issue.');
  }
  
  await saveCrawlResults(crawlResults, config, rawDir);
  
  return crawlResults;
}

/**
 * Display crawl results summary
 * @param {Object} crawlResults - Crawl results
 * @param {Object} crawlSpinner - Spinner object
 */
function displayCrawlResults(crawlResults, crawlSpinner) {
  const pageCount = crawlResults.pages?.length || crawlResults.crawledPages?.length || 0;
  const linkCount = crawlResults.links?.length || 0;
  const errorCount = crawlResults.errors?.length || 0;
  
  crawlSpinner.succeed(`Crawled ${pageCount} pages successfully`);
  
  ui.box(
    `Pages Crawled: ${colors.cyan(pageCount)}\n` +
    `Links Found: ${colors.cyan(linkCount)}\n` +
    `Errors: ${colors.cyan(errorCount)}`,
    { borderColor: 'green' }
  );
}

/**
 * Prompt for paths file review
 * @returns {Promise<void>}
 */
async function promptForPathsReview() {
  await promptToContinue();
  ui.info('Continuing with extraction process...');
}

/**
 * Save crawl results to file
 * @param {Object} crawlResults - Crawl results
 * @param {Object} config - Application configuration
 * @param {string} rawDir - Raw output directory
 */
async function saveCrawlResults(crawlResults, config, rawDir) {
  if (!crawlResults) return;
  
  const saveSpinner = ui.createSpinner('Saving crawl results...');
  saveSpinner.start();
  
  const outputPath = path.join(rawDir, 'crawl-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(crawlResults, null, 2));
  
  cacheManager.updateCacheForStep('crawl', config);
  
  saveSpinner.succeed(`Crawl results saved to: ${outputPath}`);
}