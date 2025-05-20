/**
 * Initial Crawl Phase
 * - Crawls the site 1 level deep
 * - Creates initial paths.json with all discovered URLs
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

async function processLinks(homeLinks, baseUrl, skippedFileUrls, uniqueUrls, allPaths, externalLinks) {
  for (const link of homeLinks) {
    if (isInternalUrl(link, baseUrl)) {
      if (isFileUrl(link)) {
        skippedFileUrls.add(link);
        continue;
      }

      const normalizedUrl = normalizeUrl(link);

      if (!uniqueUrls.has(normalizedUrl)) {
        uniqueUrls.add(normalizedUrl);
        allPaths.push({
          url: normalizedUrl,
          depth: 1,
          source: 'homepage',
        });
      }
    } else {
      // Track external links
      externalLinks.add(link);
    }
  }
}

/**
 * Run the initial crawl
 * @param {string} baseUrl - Base URL to crawl
 * @param {Object} spinner - Optional spinner instance passed from the main process
 */
async function initialCrawl(baseUrl = CONFIG.base_url, spinner = null) {
  // Initialize results
  const allPaths = [];
  const problemPaths = [];
  const skippedFileUrls = new Set();
  const externalLinks = new Set();

  // Launch browser
  const browser = await chromium.launch();
  let page = await browser.newPage();

  // Set timeout for initial page load from config (use slightly longer for initial page)
  page.setDefaultTimeout(CONFIG.crawl_settings?.timeout ? CONFIG.crawl_settings.timeout * 1.3 : 60000);

  try {
    // Visit the home page
    spinner.text = `Visiting home page: ${baseUrl}`;
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

    // Extract links from the home page
    //spinner.text = 'Extracting links from home page...';
    const homeLinks = await extractLinks(page);

    // Process home page links
    const uniqueUrls = new Set();
    uniqueUrls.add(baseUrl); // Add the home page itself
    allPaths.push({
      url: baseUrl,
      depth: 0,
      source: 'homepage',
    });

    // Process each link from the home page
    await processLinks(homeLinks, baseUrl, skippedFileUrls, uniqueUrls, allPaths, externalLinks);

    // Create paths.json
    const pathsJson = {
      baseUrl,
      scan_type: 'initial',
      scan_time: new Date().toISOString(),
      total_paths: allPaths.length,
      all_paths: allPaths,
      problem_paths: problemPaths,
      skipped_file_urls: Array.from(skippedFileUrls),
      external_links: Array.from(externalLinks),
    };

    fs.writeFileSync(PATHS_FILE, JSON.stringify(pathsJson, null, 2));

    // Create a summary box
    const summaryBox = [
      '',
      chalk.bold('───────────────────────────────'),
      chalk.bold.green('✅ Initial Crawl Complete!'),
      chalk.bold('───────────────────────────────'),
      `${chalk.bold('Internal Paths:')} ${chalk.green(allPaths.length)}`,
      `${chalk.bold('Skipped Files:')} ${chalk.yellow(skippedFileUrls.size)}`,
      `${chalk.bold('External Links:')} ${chalk.blue(externalLinks.size)}`,
      `${chalk.bold('Results:')} Saved to ${chalk.cyan(PATHS_FILE)}`,
    ];

    // Show success before summary so the final line appears complete.
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();

  } catch (error) {
    spinner.fail(`Error during initial crawl: ${error.message}`);
  } finally {
    await browser.close();
  }
}

export { initialCrawl };
