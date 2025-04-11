// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const componentExtractor = require('../extractors/extract-components');
const configManager = require('../utils/config-manager');

/**
 * Site crawler using Playwright
 * This script crawls a website starting from a given URL and collects all internal links
 */

// Load configuration
let fileConfig = configManager.readConfig();

// Default crawler configuration
const config = {
  // Base URL of the site to crawl
  baseUrl: fileConfig.baseUrl,

  // Maximum number of pages to crawl (set to -1 for unlimited)
  maxPages: fileConfig.maxPages,

  // Timeout for page navigation in milliseconds
  timeout: fileConfig.timeout,

  // Output file for the crawl results
  outputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Whether to save screenshots of each page
  saveScreenshots: fileConfig.screenshotsEnabled,

  // Directory to save screenshots (if enabled)
  screenshotDir: path.join(__dirname, '../../results/screenshots'),

  // File extensions to ignore
  ignoreExtensions: fileConfig.ignoreExtensions,

  // URL patterns to ignore (regex strings)
  ignorePatterns: fileConfig.ignorePatterns,

  // Paths file for storing and loading paths
  pathsFile: path.join(__dirname, '../../results/paths.json'),

  // Whether to respect robots.txt
  respectRobotsTxt: fileConfig.respectRobotsTxt,

  // Component discovery settings
  components: {
    // Whether to extract components during crawling
    enabled: true,
    // Output file for component data
    outputFile: path.join(__dirname, '../../results/components.json'),
    // Output file for component library HTML report
    reportFile: path.join(__dirname, '../../results/reports/component-library.html'),
  },
};

// Create screenshot directory if it doesn't exist and screenshots are enabled
if (config.saveScreenshots) {
  if (!fs.existsSync(config.screenshotDir)) {
    fs.mkdirSync(config.screenshotDir, { recursive: true });
  }
}

/**
 * Advanced path deduplication
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
 * Normalize URL by removing trailing slashes and query parameters if needed
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
 * Check if URL should be crawled based on configuration
 * @param {string} url - URL to check
 * @param {string} baseUrl - Base URL of the site
 * @returns {boolean} - Whether the URL should be crawled
 */
function shouldCrawl(url, baseUrl) {
  try {
    const urlObj = new URL(url);

    // Check if URL is from the same domain
    if (!url.startsWith(baseUrl)) {
      return false;
    }

    // Check file extensions to ignore
    for (const ext of config.ignoreExtensions) {
      if (urlObj.pathname.endsWith(ext)) {
        return false;
      }
    }

    // Check patterns to ignore
    for (const pattern of config.ignorePatterns) {
      const regex = new RegExp(pattern);
      if (regex.test(urlObj.pathname)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error(`Error parsing URL ${url}:`, error.message);
    return false;
  }
}

/**
 * Extract links from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string[]>} - Array of links
 */
async function extractLinks(page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href]'));
    return links
      .map(link => link.href)
      .filter(href => href && href.trim() !== '' && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:'));
  });
}

/**
 * Extract body classes from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<string[]>} - Array of body classes
 */
async function extractBodyClasses(page) {
  return page.evaluate(() => {
    const bodyElement = document.querySelector('body');
    if (bodyElement && bodyElement.className) {
      return bodyElement.className.split(/\s+/).filter(Boolean);
    }
    return [];
  });
}

/**
 * Main crawl function
 * @param {string} [baseUrl] - Base URL to crawl (overrides config)
 * @param {number} [maxPages] - Maximum pages to crawl (overrides config)
 * @param {Object} [options] - Additional options
 * @returns {Promise<Object>} - Crawl results
 */
async function crawl(baseUrl, maxPages, options = {}) {
  // Override config with parameters if provided
  const crawlConfig = { ...config };
  if (baseUrl) crawlConfig.baseUrl = baseUrl;
  if (maxPages) crawlConfig.maxPages = maxPages;
  if (options.timeout) crawlConfig.timeout = options.timeout;
  if (options.outputFile) crawlConfig.outputFile = options.outputFile;

  console.log(`Starting crawl of ${crawlConfig.baseUrl}`);
  console.log(`Max pages: ${crawlConfig.maxPages === -1 ? 'Unlimited' : crawlConfig.maxPages}`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    userAgent: 'Playwright Site Crawler'
  });

  // Create a new page
  const page = await context.newPage();

  // Set timeout
  page.setDefaultTimeout(crawlConfig.timeout);

  // Check if paths file exists and load paths
  let initialPaths = ['/'];
  let usingSavedPaths = false;

  if (fs.existsSync(crawlConfig.pathsFile)) {
    try {
      const pathsData = JSON.parse(fs.readFileSync(crawlConfig.pathsFile, 'utf8'));
      if (pathsData.paths && Array.isArray(pathsData.paths) && pathsData.paths.length > 0) {
        initialPaths = pathsData.paths;
        usingSavedPaths = true;
        console.log(`Loaded ${initialPaths.length} paths from ${crawlConfig.pathsFile}`);
      }
    } catch (error) {
      console.warn(`Error loading paths from ${crawlConfig.pathsFile}:`, error.message);
      console.log('Using default path: /');
    }
  } else {
    console.log(`Paths file not found. Will create ${crawlConfig.pathsFile} after crawling.`);
  }

  // Queue of URLs to crawl
  const queue = initialPaths.map(path => new URL(path, crawlConfig.baseUrl).toString());

  // Set of visited URLs
  const visited = new Set();

  // Results object
  const results = {
    startTime: new Date().toISOString(),
    baseUrl: crawlConfig.baseUrl,
    crawledPages: [],
    errors: [],
    components: [] // Array to store component data
  };

  // Crawl until queue is empty or max pages reached
  while (queue.length > 0 && (crawlConfig.maxPages === -1 || visited.size < crawlConfig.maxPages)) {
    const url = queue.shift();

    // Skip if already visited
    if (visited.has(url)) {
      continue;
    }

    console.log(`Crawling (${visited.size + 1}/${crawlConfig.maxPages === -1 ? '∞' : crawlConfig.maxPages}): ${url}`);

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
      if (crawlConfig.saveScreenshots) {
        const urlSafe = url.replace(/[^a-z0-9]/gi, '_').substring(0, 100);
        screenshotPath = path.join(crawlConfig.screenshotDir, `${urlSafe}.png`);
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
      if (crawlConfig.components && crawlConfig.components.enabled) {
        try {
          console.log(`Extracting components from ${url}...`);
          const components = await componentExtractor.extractComponents(page, crawlConfig);
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
        if (shouldCrawl(normalizedLink, crawlConfig.baseUrl) && !visited.has(normalizedLink) && !queue.includes(normalizedLink)) {
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
  results.duration = (new Date(results.endTime) - new Date(results.startTime)) / 1000; // in seconds

  // Ensure output directory exists
  const outputDir = path.dirname(crawlConfig.outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save results to file
  fs.writeFileSync(crawlConfig.outputFile, JSON.stringify(results, null, 2));

  // Save discovered paths if not using saved paths
  if (!usingSavedPaths) {
    // Extract paths from crawled pages
    const baseUrlObj = new URL(crawlConfig.baseUrl);
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
      baseUrl: crawlConfig.baseUrl,
      paths: organizedPaths,
      generatedAt: new Date().toISOString(),
      groups: groupedPaths,
      comment: "This file contains paths discovered during crawling. You can review and modify this file before continuing with the extraction process. Remove any paths you don't want to include, and add any paths that might have been missed. Paths should be relative to the base URL and start with a forward slash (/)."
    };

    // Ensure directory exists for paths file
    const pathsDir = path.dirname(crawlConfig.pathsFile);
    if (!fs.existsSync(pathsDir)) {
      fs.mkdirSync(pathsDir, { recursive: true });
    }

    fs.writeFileSync(crawlConfig.pathsFile, JSON.stringify(pathsData, null, 2));
    console.log(`\nSaved ${organizedPaths.length} unique, organized paths to ${crawlConfig.pathsFile}`);
  }

  console.log('\nCrawl completed!');
  console.log(`Total pages crawled: ${results.totalPages}`);
  console.log(`Total errors: ${results.totalErrors}`);
  console.log(`Duration: ${results.duration} seconds`);
  console.log(`Results saved to: ${crawlConfig.outputFile}`);

  // Generate component library if enabled and components were found
  if (crawlConfig.components && crawlConfig.components.enabled && results.components.length > 0) {
    console.log('\nGenerating component library...');

    // Generate component library
    const componentLibrary = componentExtractor.generateComponentLibrary(results.components);

    // Save component library to JSON file
    componentExtractor.saveComponentLibrary(componentLibrary, crawlConfig.components.outputFile);

    // Generate HTML report
    componentExtractor.generateComponentReport(componentLibrary, crawlConfig.components.reportFile);

    console.log(`Component library saved to: ${crawlConfig.components.outputFile}`);
    console.log(`Component report saved to: ${crawlConfig.components.reportFile}`);
  }

  // Close browser
  await browser.close();

  // Return the results
  return results;
}

// Run the crawler if this script is run directly
if (require.main === module) {
  crawl().catch(error => {
    console.error('Crawl failed:', error);
    process.exit(1);
  });
}

// Export the function for use in other scripts
module.exports = { crawlSite: crawl };
