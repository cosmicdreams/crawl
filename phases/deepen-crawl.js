/**
 * Run the deepen crawl phase
 * @param {string} baseUrl - Base URL to crawl
 * @param {number} maxDepth - Maximum crawl depth
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { chromium } from 'playwright';
import { isFileUrl, isInternalUrl, normalizeUrl } from '../utils/url-utils.js';
import { extractLinks, isPageInvalid } from '../utils/page-utils.js';
import { CONFIG } from '../utils/config-utils.js';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PATHS_FILE = path.join(OUTPUT_DIR, 'paths.json');
const MAX_RETRIES = CONFIG.crawl_settings?.max_retries || 2;

/**
 * Run the deepen crawl phase
 * @param {string} baseUrl - Base URL to crawl
 * @param {number} maxDepth - Maximum crawl depth
 * @param {Object} spinner - Optional spinner instance passed from the main process
 */
async function deepenCrawl(baseUrl = CONFIG.base_url, maxDepth = CONFIG.crawl_settings?.max_depth || 3, spinner = null) {
  // Check if paths.json exists
  if (!fs.existsSync(PATHS_FILE)) {
    spinner.fail(`Error: ${PATHS_FILE} not found. Run initial crawl first.`);
    return;
  }

  // Load existing paths data
  let pathsData;
  try {
    pathsData = JSON.parse(fs.readFileSync(PATHS_FILE, 'utf8'));
  } catch (error) {
    spinner.fail(`Error reading paths file: ${error.message}`);
    return;
  }

  // Get existing paths
  const existingUrls = new Set(pathsData.all_paths.map(item => item.url));
  const existingProblemPaths = new Map(pathsData.problem_paths.map(item => [item.url, item]));
  const skippedFileUrls = new Set(pathsData.skipped_file_urls || []);
  const externalLinks = new Set(pathsData.external_links || []);

  // Find the max depth in existing paths
  const currentMaxDepth = Math.max(...pathsData.all_paths.map(item => item.depth));

  // Initialize process tracking
  const newlyFoundUrls = new Set();
  const problemPaths = [];

  const browser = await chromium.launch();
  let page = await browser.newPage();

  // Set timeout from config
  page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);

  /**
   * Creates a new page if the current one is invalid
   * @returns {Promise<import('playwright').Page>} - A valid page instance
   */
  async function ensureValidPage() {
    if (await isPageInvalid(page)) {
      try {
        await page.close().catch(() => {}); // Attempt to close gracefully, ignore errors
      } catch (e) {
        // Ignore close errors
      }
      page = await browser.newPage();
      page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);
    }
    return page;
  }

  try {
    // Find paths to crawl (those at the current max depth)
    const pathsToCrawl = pathsData.all_paths.filter(item => item.depth === currentMaxDepth);
    //console.log("\n"`Found ${chalk.bold(pathsToCrawl.length)} paths at depth ${currentMaxDepth} to crawl deeper`);

    // Track progress
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const totalToCrawl = pathsToCrawl.length;

    // Process each path at the current max depth
    for (const pathItem of pathsToCrawl) {
      processedCount++;
      const percentComplete = Math.round((processedCount / totalToCrawl) * 100);

      // Update the spinner with new text
      spinner.color = 'blue';
      spinner.text = `[${processedCount}/${totalToCrawl} - ${percentComplete}%] Visiting: ${chalk.yellow(pathItem.url)}`;
      // Ensure we have a valid page
      page = await ensureValidPage();

      let retryCount = 0;
      let success = false;
      let linksFound = 0;
      let newUrlsFound = 0;

      while (retryCount <= MAX_RETRIES && !success) {
        try {
          // Visit the URL
          await page.goto(pathItem.url, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.crawl_settings?.timeout || 45000,
          });

          // Extract links
          const links = await extractLinks(page);
          linksFound = links.length;

          // Process links
          for (const link of links) {
            if (isInternalUrl(link, baseUrl)) {
              if (isFileUrl(link)) {
                skippedFileUrls.add(link);
                continue;
              }

              const normalizedUrl = normalizeUrl(link);

              // Skip if already known
              if (existingUrls.has(normalizedUrl) || newlyFoundUrls.has(normalizedUrl)) {
                continue;
              }

              // Add to our collection
              newlyFoundUrls.add(normalizedUrl);
              newUrlsFound++;
            } else {
              // Track external links
              externalLinks.add(link);
            }
          }

          // Mark success
          success = true;
          successCount++;

        } catch (error) {
          retryCount++;

          if (retryCount <= MAX_RETRIES) {
            //console.log(`  Retry ${retryCount}/${MAX_RETRIES} for ${pathItem.url}: ${error.message}`);
            // Ensure we have a fresh page for the next try
            page = await ensureValidPage();
          } else {
            console.error(`Failed to process ${pathItem.url} after ${MAX_RETRIES} retries: ${error.message}`);

            // Record the problem
            problemPaths.push({
              url: pathItem.url,
              error_type: error.name || 'Unknown',
              error_message: error.message || 'No details available',
              severity: 'high',
              retries: retryCount,
            });
          }
        }
      }
    }

    // Add newly found URLs to all_paths
    const newPathItems = Array.from(newlyFoundUrls).map(url => ({
      url,
      depth: currentMaxDepth + 1,
      source: 'deepen_phase',
    }));

    pathsData.all_paths = [...pathsData.all_paths, ...newPathItems];

    // Update problem paths
    pathsData.problem_paths = [
      ...pathsData.problem_paths.filter(item => !existingProblemPaths.has(item.url)),
      ...problemPaths,
    ];

    // Update other data
    pathsData.scan_type = 'deepen';
    pathsData.scan_time = new Date().toISOString();
    pathsData.total_paths = pathsData.all_paths.length;
    pathsData.skipped_file_urls = Array.from(skippedFileUrls);
    pathsData.external_links = Array.from(externalLinks);

    // Write updated data back to the file
    fs.writeFileSync(PATHS_FILE, JSON.stringify(pathsData, null, 2));

  } catch (error) {
    // Use the passed spinner for error reporting
    spinner.fail(`Error during deepen crawl: ${error.message}`);
  } finally {
    // Create a summary box
    const summaryBox = [
      `${chalk.bold('New URLs:')} ${chalk.green(newlyFoundUrls.size)} at depth ${currentMaxDepth + 1}`,
      `${chalk.bold('Total Paths:')} ${chalk.green(pathsData.all_paths.length)}`,
      `${chalk.bold('Results:')} Updated in ${chalk.cyan(PATHS_FILE)}`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green('✅ Phase 3'),
      chalk.bold('───────────────────────────────────'),
    ];

    // Show success before summary so the final line appears complete.
    spinner.color = 'green';
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();
  }
}

export { deepenCrawl };
