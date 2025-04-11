// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  extractComponents,
  generateComponentLibrary,
  saveComponentLibrary,
  generateComponentReport
} from '../extractors/extract-components.js';
import { 
  readConfig, 
  getDefaultConfig, 
  readPaths, 
  savePaths,
  DEFAULT_PATHS_PATH,
  pathsFileExists
} from '../utils/config-manager.js';

// Get the current file's directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create a configurable crawler config object to store the latest config
// This will be updated when crawlSite runs
let _crawlConfig = {
  baseUrl: '',
  maxPages: 0,
  timeout: 30000
};

/**
 * Site crawler using Playwright
 * This script crawls a website starting from a given URL and collects all internal links
 */

/**
 * @typedef {Object} CrawledPage
 * @property {string} url
 * @property {string} title
 * @property {number} status
 * @property {string} contentType
 * @property {string} timestamp
 * @property {string|null} screenshotPath
 * @property {string[]} bodyClasses
 */

/**
 * @typedef {Object} CrawlError
 * @property {string} url
 * @property {string} error
 * @property {string} timestamp
 */

/**
 * @typedef {Object} ComponentData
 * @property {string} url
 * @property {string} path
 * @property {string} title
 * @property {string[]} bodyClasses
 * @property {any[]} components
 */

/**
 * @typedef {Object} CrawlResults
 * @property {string} startTime
 * @property {string} baseUrl
 * @property {CrawledPage[]} crawledPages
 * @property {CrawlError[]} errors
 * @property {ComponentData[]} components
 * @property {string} endTime
 * @property {number} totalPages
 * @property {number} totalErrors
 * @property {number} duration
 */

/**
 * Crawl a website starting from a given URL
 * @param {string} baseUrl - Base URL to start crawling from
 * @param {number} maxPages - Maximum number of pages to crawl
 * @param {Object} options - Additional options
 * @returns {Promise<CrawlResults>} - Crawl results
 */
export async function crawlSite(baseUrl, maxPages, options = {}) {
  console.log('=========================================================');
  console.log('CRAWL SITE FUNCTION CALLED WITH:');
  console.log('baseUrl:', baseUrl);
  console.log('maxPages:', maxPages);
  console.log('options:', JSON.stringify(options, null, 2));
  console.log('DEFAULT_PATHS_PATH is:', DEFAULT_PATHS_PATH);
  console.log('pathsFileExists function available:', typeof pathsFileExists === 'function');
  console.log('=========================================================');
  // Get default configuration as fallback
  const defaultConfig = getDefaultConfig();

  // Try to load configuration from file, will throw if validation fails (no baseUrl)
  let fileConfig;
  try {
    fileConfig = readConfig();
  } catch (error) {
    console.error(`Fatal error: ${error.message}`);
    throw new Error(`Configuration validation failed: ${error.message}`);
  }

  console.log('site-crawler.js - Creating crawler configuration with:');
  console.log('- options.baseUrl:', options.baseUrl);
  console.log('- baseUrl parameter:', baseUrl);
  console.log('- fileConfig.baseUrl:', fileConfig.baseUrl);
  console.log('- defaultConfig.baseUrl:', defaultConfig.baseUrl);
  
  // Default crawler configuration
  const config = {
    // Base URL of the site to crawl (command line takes precedence)
    baseUrl: options.baseUrl || baseUrl || fileConfig.baseUrl || defaultConfig.baseUrl,

    // Maximum number of pages to crawl (command line takes precedence)
    maxPages: options.maxPages || maxPages || fileConfig.maxPages || defaultConfig.maxPages,

    // Timeout for page navigation in milliseconds
    timeout: fileConfig.timeout || defaultConfig.timeout,

    // Output file for the crawl results
    outputFile: path.join(process.cwd(), 'results/raw/crawl-results.json'),

    // Whether to save screenshots of each page
    saveScreenshots: fileConfig.screenshotsEnabled || defaultConfig.screenshotsEnabled,

    // Directory to save screenshots (if enabled)
    screenshotDir: path.join(process.cwd(), 'results/screenshots'),

    // File extensions to ignore
    ignoreExtensions: fileConfig.ignoreExtensions || defaultConfig.ignoreExtensions,

    // URL patterns to ignore (regex strings)
    ignorePatterns: fileConfig.ignorePatterns || defaultConfig.ignorePatterns,

    // Paths file for storing and loading paths
    pathsFile: DEFAULT_PATHS_PATH,

    // Whether to respect robots.txt
    respectRobotsTxt: fileConfig.respectRobotsTxt || defaultConfig.respectRobotsTxt,

    // Component discovery settings
    components: {
      // Whether to extract components during crawling
      enabled: true,
      // Output file for component data
      outputFile: path.join(process.cwd(), 'config/components.json'),
      // Output file for component library HTML report
      reportFile: path.join(process.cwd(), 'results/reports/component-library.html'),
      // Filtered component list - only extract components matching these machine names
      FilteredComponentList: fileConfig.FilteredComponentList || [],
    },
  };

  // Create the local crawler config for this run
  const localCrawlConfig = { ...config };
  
  // Note: We don't need to reassign baseUrl or maxPages here because
  // we already established the correct priority in the config object above
  
  // Add any additional options not already handled
  if (options) {
    // Filter out the options we've already processed
    const { baseUrl: _, maxPages: __, ...otherOptions } = options;
    Object.assign(localCrawlConfig, otherOptions);
  }
  
  // Update the internal _crawlConfig so it can be accessed by other modules via getCrawlConfig()
  _crawlConfig = { ...localCrawlConfig };

  console.log(`Starting crawl of ${localCrawlConfig.baseUrl}`);
  console.log(`Max pages: ${localCrawlConfig.maxPages === -1 ? 'Unlimited' : localCrawlConfig.maxPages}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Playwright Site Crawler'
  });

  // Create a new page
  const page = await context.newPage();

  // Set timeout
  page.setDefaultTimeout(localCrawlConfig.timeout);

  // Check if paths file exists and load paths
  let initialPaths = ['/'];
  let usingSavedPaths = false;

  // Use the readPaths function from config-manager
  console.log('Reading paths from:', crawlConfig.pathsFile);
  const pathsData = readPaths(crawlConfig.pathsFile);
  
  console.log('Paths data:', pathsData ? 'Found' : 'Not found');
  if (pathsData) {
    console.log('Paths data baseUrl:', pathsData.baseUrl);
    console.log('Paths count:', pathsData.paths ? pathsData.paths.length : 0);
  }
  
  if (pathsData && pathsData.paths && Array.isArray(pathsData.paths) && pathsData.paths.length > 0) {
    initialPaths = pathsData.paths;
    usingSavedPaths = true;
    console.log(`Loaded ${initialPaths.length} paths from ${crawlConfig.pathsFile}`);
    
    // Ensure we're using the correct baseUrl from the paths file
    if (pathsData.baseUrl) {
      console.log(`Using baseUrl from paths file: ${pathsData.baseUrl}`);
      // Only override if not explicitly set in command line options
      if (!options.baseUrl && !baseUrl) {
        localCrawlConfig.baseUrl = pathsData.baseUrl;
        console.log(`Setting crawler baseUrl to: ${localCrawlConfig.baseUrl}`);
      }
    }
  } else {
    console.log(`No valid paths found. Will create ${localCrawlConfig.pathsFile} after crawling.`);
  }

  // Queue of URLs to crawl
  const queue = initialPaths.map(path => new URL(path, localCrawlConfig.baseUrl).toString());

  // Set of visited URLs
  const visited = new Set();

  // Results object
  /** @type {CrawlResults} */
  const results = {
    startTime: new Date().toISOString(),
    baseUrl: crawlConfig.baseUrl,
    crawledPages: [],
    errors: [],
    components: [],
    endTime: '',
    totalPages: 0,
    totalErrors: 0,
    duration: 0
  };

  // Create screenshot directory if it doesn't exist and screenshots are enabled
  if (crawlConfig.saveScreenshots) {
    if (!fs.existsSync(crawlConfig.screenshotDir)) {
      fs.mkdirSync(crawlConfig.screenshotDir, { recursive: true });
    }
  }

  /**
   * Deduplicate paths by consolidating similar patterns
   * @param {string[]} paths - Array of paths to deduplicate
   * @returns {string[]} - Deduplicated paths
   */
  function deduplicatePaths(paths) {
    // Step 1: Group paths by their structure (pattern)
    const patternGroups = {};

    paths.forEach(path => {
      // Skip the root path
      if (path === '/') return;

      // Split path into segments
      const segments = path.split('/').filter(s => s.length > 0);

      // Create a pattern by replacing likely IDs with placeholders
      const pattern = segments.map(segment => {
        // Check if segment is numeric
        if (/^\d+$/.test(segment)) {
          return '{id}';
        }

        // Check if segment ends with a numeric ID (common pattern like 'product-123')
        if (/^[a-z0-9-]+-\d+$/.test(segment)) {
          return segment.replace(/-\d+$/, '-{id}');
        }

        // Check if segment is a UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(segment)) {
          return '{uuid}';
        }

        return segment;
      }).join('/');

      // Add to pattern group
      if (!patternGroups[pattern]) {
        patternGroups[pattern] = [];
      }
      patternGroups[pattern].push(path);
    });

    // Step 2: Select representative paths from each pattern group
    const dedupedPaths = ['/'];  // Always include root path

    Object.entries(patternGroups).forEach(([pattern, pathsInPattern]) => {
      // If there's only one path in this pattern, include it
      if (pathsInPattern.length === 1) {
        dedupedPaths.push(pathsInPattern[0]);
        return;
      }

      // For patterns with multiple paths, select representatives
      // Sort by length (shortest first) and then alphabetically
      pathsInPattern.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });

      // Always include the first path (shortest/alphabetically first)
      dedupedPaths.push(pathsInPattern[0]);

      // If there are many paths in this pattern (more than 5), include a few more examples
      if (pathsInPattern.length > 5) {
        // Add one from the middle and one from the end for diversity
        const middleIndex = Math.floor(pathsInPattern.length / 2);
        dedupedPaths.push(pathsInPattern[middleIndex]);
        dedupedPaths.push(pathsInPattern[pathsInPattern.length - 1]);
      }
    });

    // Step 3: Remove paths that are too similar based on edit distance
    const finalPaths = [];

    dedupedPaths.forEach(path => {
      // Always include the root path
      if (path === '/') {
        finalPaths.push(path);
        return;
      }

      // Check if this path is too similar to any path we've already included
      const isTooSimilar = finalPaths.some(existingPath => {
        // Skip comparison with root
        if (existingPath === '/') return false;

        // If paths have different segment counts, they're not too similar
        const pathSegments = path.split('/').filter(s => s.length > 0);
        const existingSegments = existingPath.split('/').filter(s => s.length > 0);

        if (pathSegments.length !== existingSegments.length) return false;

        // If first segment is different, they're not too similar
        if (pathSegments[0] !== existingSegments[0]) return false;

        // Count differences between segments
        let differences = 0;
        for (let i = 0; i < pathSegments.length; i++) {
          if (pathSegments[i] !== existingSegments[i]) differences++;
        }

        // If more than half the segments are different, they're not too similar
        return differences <= Math.floor(pathSegments.length / 2);
      });

      if (!isTooSimilar) {
        finalPaths.push(path);
      }
    });

    return finalPaths;
  }

  /**
   * Normalize a URL by removing trailing slash and query parameters
   * @param {string} url - URL to normalize
   * @returns {string} - Normalized URL
   */
  function normalizeUrl(url) {
    // Remove trailing slash
    url = url.endsWith('/') ? url.slice(0, -1) : url;

    // Remove query parameters if needed
    // Uncomment the next line if you want to ignore query parameters
    // url = url.split('?')[0];

    return url;
  }

  /**
   * Check if a URL should be crawled
   * @param {string} url - URL to check
   * @param {string} baseUrl - Base URL of the site
   * @returns {boolean} - Whether the URL should be crawled
   */
  function shouldCrawl(url, baseUrl) {
    try {
      const urlObj = new URL(url, baseUrl);

      // Check if URL is from the same domain
      if (!url.startsWith(baseUrl)) {
        return false;
      }

      // Check file extensions to ignore
      for (const ext of localCrawlConfig.ignoreExtensions) {
        if (urlObj.pathname.endsWith(ext)) {
          return false;
        }
      }

      // Check patterns to ignore
      for (const pattern of localCrawlConfig.ignorePatterns) {
        const regex = new RegExp(pattern);
        if (regex.test(urlObj.pathname)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Error parsing URL ${baseUrl + url}:`, error.message);
      return false;
    }
  }

  /**
   * Extract links from a page
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @returns {Promise<string[]>} - Array of links
   */
  async function extractLinks(page) {
    return page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href]'));
      return links.map(link => link.getAttribute('href') || '');
    });
  }

  /**
   * Extract all body classes from a page
   * @param {import('@playwright/test').Page} page - Playwright page object
   * @returns {Promise<string[]>} - Array of body classes
   */
  async function extractBodyClasses(page) {
    return page.evaluate(() => {
      const bodyElement = document.querySelector('body');
      return bodyElement ? Array.from(bodyElement.classList) : [];
    });
  }

  // Crawl until queue is empty or max pages reached
  while (queue.length > 0 && (localCrawlConfig.maxPages === -1 || visited.size < localCrawlConfig.maxPages)) {
    const url = queue.shift();
    if (!url) continue;

    // Skip if already visited
    if (visited.has(url)) {
      continue;
    }

    console.log(`Crawling (${visited.size + 1}/${localCrawlConfig.maxPages === -1 ? '∞' : localCrawlConfig.maxPages}): ${url}`);

    try {
      // Navigate to the page
      const response = await page.goto(url, { waitUntil: 'domcontentloaded' });

      // Mark as visited
      visited.add(url);

      // Check if navigation was successful
      if (!response) {
        results.errors.push({
          url,
          error: 'No response received',
          timestamp: new Date().toISOString()
        });
        continue;
      }

      // Get status code
      const status = response.status();

      // Get page title
      const title = await page.title();

      // Get body classes
      const bodyClasses = await extractBodyClasses(page);

      // Save screenshot if enabled
      let screenshotPath = null;
      if (localCrawlConfig.saveScreenshots) {
        const urlSafe = url.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
        screenshotPath = path.join(localCrawlConfig.screenshotDir, `${urlSafe}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
      }

      // Add to results
      results.crawledPages.push({
        url,
        title,
        status,
        contentType: response.headers()['content-type'] || 'unknown',
        timestamp: new Date().toISOString(),
        screenshotPath: screenshotPath ? path.relative(process.cwd(), screenshotPath) : null,
        bodyClasses
      });

      // If status is not 200, skip extracting links
      if (status !== 200) {
        results.errors.push({
          url,
          error: `HTTP status ${status}`,
          timestamp: new Date().toISOString()
        });
        continue;
      }

      // Extract links
      const links = await extractLinks(page);

      // Extract components if enabled
      if (localCrawlConfig.components && localCrawlConfig.components.enabled) {
        try {
          console.log(`Extracting components from ${url}...`);
          const components = await extractComponents(page, localCrawlConfig);
          console.log(`Found ${components.length} components on ${url}`);

          // Add to results
          results.components.push({
            url,
            path: new URL(url).pathname,
            title,
            bodyClasses,
            components
          });
        } catch (error) {
          console.error(`Error extracting components from ${url}:`, error.message);
        }
      }

      // Add new links to queue
      for (const link of links) {
        const normalizedLink = normalizeUrl(link);
        if (shouldCrawl(normalizedLink, localCrawlConfig.baseUrl) && !visited.has(normalizedLink) && !queue.includes(normalizedLink)) {
          queue.push(normalizedLink);
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error.message);

      // Add to errors
      results.errors.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      // Mark as visited to avoid retrying
      visited.add(url);
    }
  }

  // Add summary to results
  results.endTime = new Date().toISOString();
  results.totalPages = results.crawledPages.length;
  results.totalErrors = results.errors.length;
  const startTime = new Date(results.startTime).getTime();
  const endTime = new Date(results.endTime).getTime();
  results.duration = (endTime - startTime) / 1000; // in seconds

  // Ensure output directory exists
  const outputDir = path.dirname(localCrawlConfig.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save results to file
  fs.writeFileSync(localCrawlConfig.outputFile, JSON.stringify(results, null, 2));

  // Save discovered paths if not using saved paths
  if (!usingSavedPaths) {
    // Extract paths from crawled pages
    const baseUrlObj = new URL(localCrawlConfig.baseUrl);
    let discoveredPaths = results.crawledPages
      .filter(page => page.status === 200) // Only include successful pages
      .map(page => {
        try {
          const pageUrl = new URL(page.url);
          // Only include paths from the same domain
          if (pageUrl.hostname === baseUrlObj.hostname) {
            // Return just the pathname without query parameters or fragments
            return pageUrl.pathname;
          }
          return null;
        } catch (e) {
          return null;
        }
      })
      .filter(path => path !== null);

    // Clean up and organize paths
    // 1. Remove duplicates
    discoveredPaths = [...new Set(discoveredPaths)];

    // 2. Apply advanced deduplication
    discoveredPaths = deduplicatePaths(discoveredPaths);

    // 3. Sort paths by depth (number of segments)
    discoveredPaths.sort((a, b) => {
      // Count segments
      const aSegments = a.split('/').filter(s => s.length > 0).length;
      const bSegments = b.split('/').filter(s => s.length > 0).length;

      // Sort by number of segments first
      if (aSegments !== bSegments) {
        return aSegments - bSegments;
      }

      // If same number of segments, sort alphabetically
      return a.localeCompare(b);
    });

    // 4. Group similar paths
    const groupedPaths = {};
    discoveredPaths.forEach(path => {
      // Get the first segment as the group key
      const segments = path.split('/').filter(s => s.length > 0);
      const groupKey = segments.length > 0 ? segments[0] : 'root';

      if (!groupedPaths[groupKey]) {
        groupedPaths[groupKey] = [];
      }

      groupedPaths[groupKey].push(path);
    });

    // 4. Create a clean, organized paths array
    const organizedPaths = [];

    // Add root path first
    organizedPaths.push('/');

    // Add other paths by group
    Object.keys(groupedPaths).sort().forEach(group => {
      if (group !== 'root') {
        groupedPaths[group].forEach(path => {
          organizedPaths.push(path);
        });
      }
    });

    // Save paths to file
    const pathsData = {
      baseUrl: localCrawlConfig.baseUrl,
      paths: organizedPaths,
      generatedAt: new Date().toISOString(),
      groups: groupedPaths,
      comment: "This file contains paths discovered during crawling. You can review and modify this file before continuing with the extraction process. Remove any paths you don't want to include, and add any paths that might have been missed. Paths should be relative to the base URL and start with a forward slash (/)."
    };

    // Save paths using our config manager
    savePaths(pathsData, localCrawlConfig.pathsFile);
    console.log(`\nSaved ${organizedPaths.length} unique, organized paths to ${localCrawlConfig.pathsFile}`);
  }

  console.log('\nCrawl completed!');
  console.log(`Total pages crawled: ${results.totalPages}`);
  console.log(`Total errors: ${results.totalErrors}`);
  console.log(`Duration: ${results.duration} seconds`);
  console.log(`Results saved to: ${localCrawlConfig.outputFile}`);

  // Generate component library if enabled and components were found
  if (localCrawlConfig.components && localCrawlConfig.components.enabled && results.components.length > 0) {
    console.log('\nGenerating component library...');

    // Generate component library
    const componentLibrary = generateComponentLibrary(results.components);

    // Save component library to JSON file
    saveComponentLibrary(componentLibrary, localCrawlConfig.components.outputFile);

    // Generate HTML report
    generateComponentReport(componentLibrary, localCrawlConfig.components.reportFile);

    console.log(`Component library saved to: ${localCrawlConfig.components.outputFile}`);
    console.log(`Component report saved to: ${localCrawlConfig.components.reportFile}`);
  }

  // Close browser
  await browser.close();

  // Add debugging for final baseUrl
  console.log('=========================================================');
  console.log('CRAWL COMPLETED WITH baseUrl:', localCrawlConfig.baseUrl);
  console.log('=========================================================');

  // Return the results
  return results;
}

// Run the crawler if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = readConfig();
  crawlSite(config.baseUrl, config.maxPages).catch(error => {
    console.error('Crawl failed:', error);
    process.exitCode = 1;
  });
}

// Create a configurable crawler config that will be updated when crawlSite runs
// Using let instead of const allows the crawlConfig to be updated when crawlSite is called
export let crawlConfig = {
  baseUrl: '',
  maxPages: 0,
  timeout: 30000
};

// Export default as an object containing all functions and the config
export default {
  crawlSite
};
