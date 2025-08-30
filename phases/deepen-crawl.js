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
  // Defensive check for spinner
  if (!spinner) {
    console.error('Error: No spinner provided to deepenCrawl');
    return;
  }

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

  // Defensive validation of pathsData structure
  if (!pathsData || typeof pathsData !== 'object') {
    spinner.fail('Error: Invalid paths data structure - not an object');
    return;
  }

  // Ensure required arrays exist and are valid
  const allPaths = Array.isArray(pathsData.all_paths) ? pathsData.all_paths.filter(Boolean) : [];
  const problemPaths = Array.isArray(pathsData.problem_paths) ? pathsData.problem_paths.filter(Boolean) : [];

  if (allPaths.length === 0) {
    spinner.fail('Error: No valid paths found in paths.json');
    return;
  }

  // Get existing paths - defensive programming for missing or invalid data
  const existingUrls = new Set(allPaths
    .filter(item => item && typeof item.url === 'string')
    .map(item => item.url)
  );
  
  const existingProblemPaths = new Map(problemPaths
    .filter(item => item && typeof item.url === 'string')
    .map(item => [item.url, item])
  );
  
  const skippedFileUrls = new Set(pathsData.skipped_file_urls || []);
  const externalLinks = new Set(pathsData.external_links || []);

  // Find the max depth in existing paths - handle edge cases
  const depthValues = allPaths
    .filter(item => item && typeof item.depth === 'number' && !isNaN(item.depth))
    .map(item => item.depth);
  
  const currentMaxDepth = depthValues.length > 0 ? Math.max(...depthValues) : 0;

  // Initialize process tracking
  const newlyFoundUrls = new Set();
  const newProblemPaths = [];

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
    const pathsToCrawl = allPaths.filter(item => 
      item && 
      typeof item.depth === 'number' && 
      item.depth === currentMaxDepth &&
      typeof item.url === 'string'
    );

    if (pathsToCrawl.length === 0) {
      spinner.fail(`Error: No valid paths found at depth ${currentMaxDepth}`);
      return;
    }

    // Track progress
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const totalToCrawl = pathsToCrawl.length;

    // Process each path at the current max depth
    for (const pathItem of pathsToCrawl) {
      // Defensive check for pathItem
      if (!pathItem || typeof pathItem.url !== 'string') {
        console.warn('Skipping invalid path item:', pathItem);
        continue;
      }

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
          linksFound = Array.isArray(links) ? links.length : 0;

          // Process links - defensive check
          if (Array.isArray(links)) {
            for (const link of links) {
              if (typeof link !== 'string') continue;

              if (isInternalUrl(link, baseUrl)) {
                if (isFileUrl(link)) {
                  skippedFileUrls.add(link);
                  continue;
                }

                const normalizedUrl = normalizeUrl(link);
                if (typeof normalizedUrl !== 'string') continue;

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
            newProblemPaths.push({
              url: pathItem.url,
              error_type: error.name || 'Unknown',
              error_message: error.message || 'No details available',
              severity: 'high',
              retries: retryCount,
            });
            errorCount++;
          }
        }
      }
    }

    // Add newly found URLs to all_paths
    const newPathItems = Array.from(newlyFoundUrls)
      .filter(url => typeof url === 'string')
      .map(url => ({
        url,
        depth: currentMaxDepth + 1,
        source: 'deepen_phase',
      }));

    // Update paths data structure - preserve original structure
    const updatedPathsData = {
      ...pathsData,
      all_paths: [...allPaths, ...newPathItems],
      problem_paths: [
        ...problemPaths.filter(item => item && !existingProblemPaths.has(item.url)),
        ...newProblemPaths,
      ],
      scan_type: 'deepen',
      scan_time: new Date().toISOString(),
      total_paths: allPaths.length + newPathItems.length,
      skipped_file_urls: Array.from(skippedFileUrls),
      external_links: Array.from(externalLinks),
    };

    // Write updated data back to the file
    fs.writeFileSync(PATHS_FILE, JSON.stringify(updatedPathsData, null, 2));

    // Create a summary box
    const summaryBox = [
      `${chalk.bold('New URLs:')} ${chalk.green(newlyFoundUrls.size)} at depth ${currentMaxDepth + 1}`,
      `${chalk.bold('Total Paths:')} ${chalk.green(updatedPathsData.total_paths)}`,
      `${chalk.bold('Results:')} Updated in ${chalk.cyan(PATHS_FILE)}`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green('✅ Phase 3'),
      chalk.bold('───────────────────────────────────'),
    ];

    // Show success before summary so the final line appears complete.
    spinner.color = 'green';
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();

  } catch (error) {
    // Use the passed spinner for error reporting
    spinner.fail(`Error during deepen crawl: ${error.message}`);
  } finally {
    // Clean up browser resources
    try {
      if (page && !page.isClosed()) {
        await page.close().catch(() => {});
      }
      if (browser) {
        await browser.close().catch(() => {});
      }
    } catch (e) {
      console.warn('Warning: Could not properly close browser resources');
    }
  }
}

export { deepenCrawl };