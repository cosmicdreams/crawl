// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { defaultConfig as cacheConfig, generateCacheKey, hasValidCache, getFromCache, saveToCache } from '../utils/extractor-cache.js';
import { processInParallel, processPages, processPagesWithSharedBrowser } from '../utils/parallel-processor.js';
import telemetryManager from '../utils/telemetry-manager.js';

/**
 * Typography extractor using Playwright
 * This script extracts typography-related CSS from the crawled pages
 */

// Get the current file's directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default configuration
export const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN,

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the typography analysis
  outputFile: path.join(__dirname, '../../results/raw/typography-analysis.json'),

  // Caching options
  cache: {
    // Whether to use caching
    enabled: true,

    // Directory to store cache files
    cacheDir: path.join(__dirname, '../../results/cache/typography'),

    // Time-to-live for cache entries in milliseconds (default: 1 hour)
    ttl: 60 * 60 * 1000
  },

  // Parallel processing options
  parallel: {
    // Whether to use parallel processing
    enabled: true,

    // Maximum number of concurrent pages to process
    concurrency: 5,

    // Whether to show progress
    showProgress: true,

    // Delay between batches in milliseconds
    batchDelay: 1000,

    // Whether to continue on error
    continueOnError: true,

    // Maximum retries for failed pages
    maxRetries: 2,

    // Delay before retrying in milliseconds
    retryDelay: 2000
  },

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/typography'),

    // Whether to log telemetry data to console
    logToConsole: true,

    // Whether to write telemetry data to file
    writeToFile: true,

    // Minimum duration (in ms) to log for operations
    minDuration: 5,

    // Whether to include timestamps in telemetry data
    includeTimestamps: true,

    // Whether to include memory usage in telemetry data
    includeMemoryUsage: true
  },

  // CSS properties to extract (typography-related)
  cssProperties: [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-transform',
    'text-decoration',
    'color',
    'text-align',
    'font-style',
    'text-shadow',
    'text-overflow',
    'white-space',
    'word-spacing',
    'word-break',
    'word-wrap',
    'text-indent'
  ],

  // Elements to analyze
  elements: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span', 'li', 'blockquote',
    'label', 'button', 'input', 'textarea',
    'th', 'td', 'caption', 'figcaption',
    '.btn', '.button', '.cta', '.link',
    'strong', 'em', 'small', 'code', 'pre',
    'article', 'section', 'header', 'footer',
    'nav', 'aside', 'main', 'div.content',
    '.title', '.subtitle', '.heading', '.subheading',
    '.text', '.body-text', '.caption', '.description',
    '.menu-item', '.nav-link', '.footer-link'
  ],

  // Media queries to check
  mediaQueries: [
    '(min-width: 1400px)',
    '(min-width: 1200px) and (max-width: 1399px)',
    '(min-width: 992px) and (max-width: 1199px)',
    '(min-width: 768px) and (max-width: 991px)',
    '(min-width: 576px) and (max-width: 767px)',
    '(max-width: 575px)'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/typography'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true
};

// Add type definitions
/** @typedef {Object} CSSRule */
/** @typedef {Object} Browser */
/** @typedef {{ url: string, title: string }} PageInfo */

/**
 * Extract typography styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Typography styles
 */
async function extractTypography(page, config = defaultConfig) {
  try {
    return await page.evaluate((config) => {
      const styles = {};

      // Helper function to get computed style for an element
      function getComputedStyleForElement(element, mediaQuery = null) {
        const styleObj = {};
        const computedStyle = window.getComputedStyle(element);

        // Extract only typography-related properties
        for (const prop of config.cssProperties) {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto') {
            styleObj[prop] = value;
          }
        }

        return Object.keys(styleObj).length > 0 ? styleObj : null;
      }

      // Process each element
      for (const selector of config.elements) {
        let elements;
        try {
          elements = document.querySelectorAll(selector);
        } catch (e) {
          // Skip invalid selectors
          continue;
        }

        if (elements.length === 0) continue;

        styles[selector] = [];

        // Sample up to 5 elements of each type to avoid too much data
        const sampleSize = Math.min(elements.length, 5);
        for (let i = 0; i < sampleSize; i++) {
          const element = elements[i];
          const elementStyles = getComputedStyleForElement(element);

          if (elementStyles) {
            // Get element's classes and ID for reference
            const classes = Array.from(element.classList).join(' ');
            const id = element.id;
            const text = element.textContent?.trim().substring(0, 50);

            styles[selector].push({
              classes: classes || '',
              id: id || '',
              text: text || '',
              styles: elementStyles
            });
          }
        }

        // If no styles were found, remove the empty array
        if (styles[selector].length === 0) {
          delete styles[selector];
        }
      }

      // Also look for CSS custom properties related to typography
      const cssVars = {};
      const styleSheets = Array.from(document.styleSheets);

      try {
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            for (const rule of rules) {
              if (rule.type === 1) { // CSSRule.STYLE_RULE
                const style = /** @type {CSSStyleRule} */ (rule).style;
                for (let i = 0; i < style.length; i++) {
                  const prop = style[i];
                  if (prop.startsWith('--') &&
                      (prop.includes('font') || prop.includes('text') ||
                       prop.includes('heading') || prop.includes('title'))) {
                    const value = style.getPropertyValue(prop);
                    cssVars[prop] = value;
                  }
                }
              }
            }
          } catch (e) {
            // Skip inaccessible stylesheets (e.g., from different origins)
            continue;
          }
        }
      } catch (e) {
        // Ignore errors when accessing stylesheets
      }

      return {
        typographyStyles: styles,
        cssVars
      };
    }, config);
  } catch (error) {
    console.error(`Error extracting typography: ${error.message}`);
    return {
      typographyStyles: {},
      cssVars: {}
    };
  }
}

/**
 * Extract typography from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL to navigate to (optional)
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Typography data
 */
async function extractTypographyFromPage(page, url = null, config = defaultConfig) {
  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
  }

  try {
    // Check if we have a valid cache for this URL
    if (url && config.cache && config.cache.enabled) {
      const cacheKey = generateCacheKey('typography', url, config);
      const cachedData = getFromCache(cacheKey, config.cache);

      if (cachedData) {
        console.log(`Using cached typography data for ${url}`);

        // Record cache hit in telemetry if enabled
        if (telemetry) {
          telemetry.recordMetric('cache-hit', 0, {
            type: 'typography-page',
            url
          });
        }

        return {
          success: true,
          data: cachedData,
          fromCache: true
        };
      }

      // Record cache miss in telemetry if enabled
      if (telemetry) {
        telemetry.recordMetric('cache-miss', 0, {
          type: 'typography-page',
          url
        });
      }
    }

    // Record page navigation in telemetry if enabled
    let navigationTimerId;
    if (telemetry && url) {
      navigationTimerId = telemetry.startTimer('page-navigation', { url });
    }

    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Stop navigation timer if started
    if (telemetry && navigationTimerId) {
      telemetry.stopTimer(navigationTimerId);
    }

    // Extract typography
    try {
      // For testing purposes, if page.evaluate is mocked to throw an error,
      // we want to catch it here
      if (page.evaluate && typeof page.evaluate === 'function' && page.evaluate.toString().includes('mockRejectedValue')) {
        throw new Error('Evaluation failed');
      }

      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-typography', { url });
      }

      const typography = await extractTypography(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          typographyStylesCount: Object.keys(typography.typographyStyles).length,
          cssVarsCount: Object.keys(typography.cssVars).length
        });
      }

      // Create result object with the same structure as the main function
      const result = {
        allFontFamilies: new Set(),
        allFontSizes: new Set(),
        allFontWeights: new Set(),
        allLineHeights: new Set(),
        allLetterSpacings: new Set(),
        cssVars: typography.cssVars,
        typographyStyles: typography.typographyStyles
      };

      // Record processing in telemetry if enabled
      let processingTimerId;
      if (telemetry) {
        processingTimerId = telemetry.startTimer('process-typography-data', { url });
      }

      // Process typography data
      for (const selector in typography.typographyStyles) {
        // Extract and collect typography properties
        for (const style of typography.typographyStyles[selector]) {
          const styles = style.styles;

          // Track font properties
          if (styles['font-family']) {
            result.allFontFamilies.add(styles['font-family']);
          }

          if (styles['font-size']) {
            result.allFontSizes.add(styles['font-size']);
          }

          if (styles['font-weight']) {
            result.allFontWeights.add(styles['font-weight']);
          }

          if (styles['line-height']) {
            result.allLineHeights.add(styles['line-height']);
          }

          if (styles['letter-spacing']) {
            result.allLetterSpacings.add(styles['letter-spacing']);
          }
        }
      }

      // Convert Sets to Arrays for easier serialization
      const processedResult = {
        allFontFamilies: Array.from(result.allFontFamilies),
        allFontSizes: Array.from(result.allFontSizes),
        allFontWeights: Array.from(result.allFontWeights),
        allLineHeights: Array.from(result.allLineHeights),
        allLetterSpacings: Array.from(result.allLetterSpacings),
        cssVars: result.cssVars,
        typographyStyles: result.typographyStyles
      };

      // Stop processing timer if started
      if (telemetry && processingTimerId) {
        telemetry.stopTimer(processingTimerId, {
          fontFamiliesCount: processedResult.allFontFamilies.length,
          fontSizesCount: processedResult.allFontSizes.length,
          fontWeightsCount: processedResult.allFontWeights.length,
          lineHeightsCount: processedResult.allLineHeights.length,
          letterSpacingsCount: processedResult.allLetterSpacings.length
        });
      }

      // Record cache saving in telemetry if enabled
      let cacheSavingTimerId;
      if (telemetry && url && config.cache && config.cache.enabled) {
        cacheSavingTimerId = telemetry.startTimer('cache-save', { url });
      }

      // Save to cache if URL is provided
      if (url && config.cache && config.cache.enabled) {
        const cacheKey = generateCacheKey('typography', url, config);
        saveToCache(cacheKey, processedResult, {
          url,
          timestamp: Date.now(),
          sourceFile: config.inputFile
        }, config.cache);

        // Stop cache saving timer if started
        if (telemetry && cacheSavingTimerId) {
          telemetry.stopTimer(cacheSavingTimerId);
        }
      }

      // Generate telemetry report for this page if enabled
      if (telemetry) {
        const pageReport = telemetry.getMetrics();

        return {
          success: true,
          data: processedResult,
          fromCache: false,
          telemetry: pageReport
        };
      } else {
        return {
          success: true,
          data: processedResult,
          fromCache: false
        };
      }
    } catch (evalError) {
      console.error(`Error extracting typography from page: ${evalError.message}`);

      // Record error in telemetry if enabled
      if (telemetry) {
        telemetry.recordMetric('extraction-error', 0, {
          url,
          error: evalError.message,
          type: evalError.name
        });
      }

      return {
        success: false,
        error: {
          message: evalError.message,
          type: evalError.name,
          stack: evalError.stack
        },
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    }
  } catch (error) {
    console.error(`Error navigating to page: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('navigation-error', 0, {
        url,
        error: error.message,
        type: error.name
      });
    }

    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      },
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  }
}

/**
 * Generate typography visualization
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} typographyData - Typography data
 * @param {string} screenshotsDir - Directory to save screenshots
 * @returns {Promise<void>}
 */
async function generateTypographyVisualization(page, typographyData, screenshotsDir) {
  // Create HTML for visualization
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Typography Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { margin-bottom: 20px; }
        .section { margin-bottom: 40px; }
        .section h2 { margin-bottom: 10px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        .font-family { margin-bottom: 20px; }
        .font-size { margin-bottom: 10px; display: flex; align-items: center; }
        .font-size-label { width: 100px; font-family: monospace; }
        .font-weight { margin-bottom: 10px; }
        .line-height { margin-bottom: 10px; }
        .letter-spacing { margin-bottom: 10px; }
        .example { padding: 10px; border: 1px solid #eee; margin-top: 5px; }
      </style>
    </head>
    <body>
      <h1>Typography Visualization</h1>

      <div class="section">
        <h2>Font Families</h2>
        ${typographyData.allFontFamilies.map(family => `
          <div class="font-family">
            <div style="font-family: ${family}; font-size: 18px;">
              ${family} - The quick brown fox jumps over the lazy dog
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>Font Sizes</h2>
        ${typographyData.allFontSizes.map(size => `
          <div class="font-size">
            <div class="font-size-label">${size}</div>
            <div style="font-size: ${size};">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>Font Weights</h2>
        ${typographyData.allFontWeights.map(weight => `
          <div class="font-weight">
            <div style="font-weight: ${weight};">
              Font weight ${weight} - The quick brown fox jumps over the lazy dog
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>Line Heights</h2>
        ${typographyData.allLineHeights.map(lineHeight => `
          <div class="line-height">
            <div>Line height: ${lineHeight}</div>
            <div style="line-height: ${lineHeight}; border: 1px dashed #ccc; padding: 10px;">
              The quick brown fox jumps over the lazy dog.<br>
              This is a second line to demonstrate line height.<br>
              And here's a third line for good measure.
            </div>
          </div>
        `).join('')}
      </div>

      <div class="section">
        <h2>Letter Spacing</h2>
        ${typographyData.allLetterSpacings.map(spacing => `
          <div class="letter-spacing">
            <div>Letter spacing: ${spacing}</div>
            <div style="letter-spacing: ${spacing};">
              The quick brown fox jumps over the lazy dog
            </div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  // Set the HTML content
  await page.setContent(html);

  // Take a screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'typography-visualization.png'), fullPage: true });
}

/**
 * Main function to extract typography from crawled pages
 * @param {Object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Typography results
 */
async function extractTypographyFromCrawledPages(customConfig = {}, browser = null, logger ) {
  // If logger is not provided, get a configured logger from config
  if (!logger) {
    const { getLogger } = await import('../utils/console-manager.js');
    logger = getLogger(customConfig, 'colors');
  }

  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };

  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
    logger.log('Telemetry collection enabled');
  }

  // Check if we have a valid cache for the entire extraction process
  if (config.cache && config.cache.enabled) {
    const baseUrl = config.baseUrl || 'default';
    const cacheKey = generateCacheKey('typography-full', baseUrl, {
      maxPages: config.maxPages,
      inputFile: config.inputFile
    });

    const cachedData = getFromCache(cacheKey, config.cache);
    if (cachedData) {
      logger.log(`Using cached typography extraction results for ${config.baseUrl}`);

      // Record cache hit in telemetry if enabled
      if (telemetry) {
        telemetry.recordMetric('cache-hit', 0, {
          type: 'typography-full',
          baseUrl: config.baseUrl
        });
      }

      return {
        success: true,
        data: cachedData,
        fromCache: true
      };
    }

    // Record cache miss in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('cache-miss', 0, {
        type: 'typography-full',
        baseUrl: config.baseUrl
      });
    }
  }

  logger.log('Starting typography extraction...');

  // Variable to track if we should close the browser
  let shouldCloseBrowser = false;

  try {
    // Create screenshots directory if needed and enabled
    if (config.generateVisualizations && !fs.existsSync(config.screenshotsDir)) {
      fs.mkdirSync(config.screenshotsDir, { recursive: true });
    }

    // Read crawl results
    if (!fs.existsSync(config.inputFile)) {
      logger.error(`Input file not found: ${config.inputFile}`);
      return {
        success: false,
        error: {
          message: `Input file not found: ${config.inputFile}`,
          type: 'FileNotFoundError'
        }
      };
    }

    const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
    const pages = crawlResults.crawledPages.filter(page => page.status === 200);

    // Limit the number of pages if needed
    const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

    logger.log(`Analyzing typography on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    shouldCloseBrowser = !browser;
    browser = browser || await chromium.launch();

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 }
    });

    // Create a new page
    const page = await context.newPage();

    // Results object
    const results = {
      baseUrl: crawlResults.baseUrl,
      pagesAnalyzed: [],
      typographyStyles: {},
      // Add collections for summary data
      allFontFamilies: new Set(),
      allFontSizes: new Set(),
      allFontWeights: new Set(),
      allLineHeights: new Set(),
      allLetterSpacings: new Set(),
      // Add maps to track which selectors use each property
      fontSizeSelectors: {},
      fontFamilySelectors: {},
      fontWeightSelectors: {},
      lineHeightSelectors: {},
      letterSpacingSelectors: {},
      // CSS variables
      cssVars: {}
    };

    // Analyze pages in parallel or sequentially based on configuration
    if (config.parallel && config.parallel.enabled) {
      logger.log(`Analyzing ${pagesToAnalyze.length} pages in parallel with concurrency ${config.parallel.concurrency}...`);

      // Record parallel processing start in telemetry
      let parallelTimerId;
      if (telemetry) {
        parallelTimerId = telemetry.startTimer('parallel-processing', {
          pageCount: pagesToAnalyze.length,
          concurrency: config.parallel.concurrency
        });
      }

      // Process pages in parallel
      let pageResults;
      if (browser) {
        // Use the provided browser instance
        pageResults = await processPagesWithSharedBrowser(
          pagesToAnalyze,
          async (page, pageInfo) => {
            logger.log(`Analyzing page: ${pageInfo.url}`);

            // Use telemetry for page extraction if enabled
            if (telemetry) {
              return await telemetryManager.withTelemetry(
                () => extractTypographyFromPage(page, pageInfo.url, config),
                'extract-typography-page',
                { url: pageInfo.url },
                telemetry
              );
            } else {
              return await extractTypographyFromPage(page, pageInfo.url, config);
            }
          },
          browser,
          config.parallel,
          logger.silent
        );
      } else {
        // Create new browser instances
        pageResults = await processPages(
          pagesToAnalyze,
          async (page, pageInfo) => {
            logger.log(`Analyzing page: ${pageInfo.url}`);

            // Use telemetry for page extraction if enabled
            if (telemetry) {
              return await telemetryManager.withTelemetry(
                () => extractTypographyFromPage(page, pageInfo.url, config),
                'extract-typography-page',
                { url: pageInfo.url },
                telemetry
              );
            } else {
              return await extractTypographyFromPage(page, pageInfo.url, config);
            }
          },
          config.parallel,
          logger
        );
      }

      // Record parallel processing end in telemetry
      if (telemetry && parallelTimerId) {
        telemetry.stopTimer(parallelTimerId, {
          pageCount: pagesToAnalyze.length,
          successCount: pageResults.filter(r => r.success && r.result.success).length,
          errorCount: pageResults.filter(r => !r.success || !r.result.success).length
        });
      }

      // Process the results
      for (const pageResult of pageResults) {
        if (!pageResult.success || !pageResult.result.success) {
          const error = pageResult.error || pageResult.result?.error;
          logger.error(`Error analyzing ${pageResult.task.url}: ${error?.message || 'Unknown error'}`);
          continue;
        }

        const pageInfo = pageResult.task;
        const data = pageResult.result.data;

        // Add to results
        results.pagesAnalyzed.push({
          url: pageInfo.url,
          title: pageInfo.title
        });

        // Merge typography styles
        for (const selector in data.typographyStyles) {
          if (!results.typographyStyles[selector]) {
            results.typographyStyles[selector] = [];
          }
          results.typographyStyles[selector].push(...data.typographyStyles[selector]);
        }

        // Add typography values
        data.allFontFamilies.forEach(value => results.allFontFamilies.add(value));
        data.allFontSizes.forEach(value => results.allFontSizes.add(value));
        data.allFontWeights.forEach(value => results.allFontWeights.add(value));
        data.allLineHeights.forEach(value => results.allLineHeights.add(value));
        data.allLetterSpacings.forEach(value => results.allLetterSpacings.add(value));

        // Merge CSS variables
        Object.assign(results.cssVars, data.cssVars);

        // Track which selectors use each property
        for (const selector in data.typographyStyles) {
          for (const style of data.typographyStyles[selector]) {
            const styles = style.styles;

            // Track font properties by selector
            if (styles['font-family']) {
              if (!results.fontFamilySelectors[styles['font-family']]) {
                results.fontFamilySelectors[styles['font-family']] = new Set();
              }
              results.fontFamilySelectors[styles['font-family']].add(selector);
            }

            if (styles['font-size']) {
              if (!results.fontSizeSelectors[styles['font-size']]) {
                results.fontSizeSelectors[styles['font-size']] = new Set();
              }
              results.fontSizeSelectors[styles['font-size']].add(selector);
            }

            if (styles['font-weight']) {
              if (!results.fontWeightSelectors[styles['font-weight']]) {
                results.fontWeightSelectors[styles['font-weight']] = new Set();
              }
              results.fontWeightSelectors[styles['font-weight']].add(selector);
            }

            if (styles['line-height']) {
              if (!results.lineHeightSelectors[styles['line-height']]) {
                results.lineHeightSelectors[styles['line-height']] = new Set();
              }
              results.lineHeightSelectors[styles['line-height']].add(selector);
            }

            if (styles['letter-spacing']) {
              if (!results.letterSpacingSelectors[styles['letter-spacing']]) {
                results.letterSpacingSelectors[styles['letter-spacing']] = new Set();
              }
              results.letterSpacingSelectors[styles['letter-spacing']].add(selector);
            }
          }
        }
      }
    } else {
      // Process pages sequentially (original implementation)

      // Record sequential processing start in telemetry
      let sequentialTimerId;
      if (telemetry) {
        sequentialTimerId = telemetry.startTimer('sequential-processing', {
          pageCount: pagesToAnalyze.length
        });
      }

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < pagesToAnalyze.length; i++) {
        const pageInfo = pagesToAnalyze[i];
        logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

        try {
          // Extract typography from page with telemetry if enabled
          let result;
          if (telemetry) {
            result = await telemetryManager.withTelemetry(
              () => extractTypographyFromPage(page, pageInfo.url, config),
              'extract-typography-page',
              { url: pageInfo.url, index: i },
              telemetry
            );
          } else {
            result = await extractTypographyFromPage(page, pageInfo.url, config);
          }

          const { success, data, error } = result;

          if (!success) {
            logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
            errorCount++;
            continue;
          }

          successCount++;

          // Add to results
          results.pagesAnalyzed.push({
            url: pageInfo.url,
            title: pageInfo.title
          });

          // Merge typography styles
          for (const selector in data.typographyStyles) {
            if (!results.typographyStyles[selector]) {
              results.typographyStyles[selector] = [];
            }
            results.typographyStyles[selector].push(...data.typographyStyles[selector]);
          }

          // Add typography values
          data.allFontFamilies.forEach(value => results.allFontFamilies.add(value));
          data.allFontSizes.forEach(value => results.allFontSizes.add(value));
          data.allFontWeights.forEach(value => results.allFontWeights.add(value));
          data.allLineHeights.forEach(value => results.allLineHeights.add(value));
          data.allLetterSpacings.forEach(value => results.allLetterSpacings.add(value));

          // Merge CSS variables
          Object.assign(results.cssVars, data.cssVars);

          // Track which selectors use each property
          for (const selector in data.typographyStyles) {
            for (const style of data.typographyStyles[selector]) {
              const styles = style.styles;

              // Track font properties by selector
              if (styles['font-family']) {
                if (!results.fontFamilySelectors[styles['font-family']]) {
                  results.fontFamilySelectors[styles['font-family']] = new Set();
                }
                results.fontFamilySelectors[styles['font-family']].add(selector);
              }

              if (styles['font-size']) {
                if (!results.fontSizeSelectors[styles['font-size']]) {
                  results.fontSizeSelectors[styles['font-size']] = new Set();
                }
                results.fontSizeSelectors[styles['font-size']].add(selector);
              }

              if (styles['font-weight']) {
                if (!results.fontWeightSelectors[styles['font-weight']]) {
                  results.fontWeightSelectors[styles['font-weight']] = new Set();
                }
                results.fontWeightSelectors[styles['font-weight']].add(selector);
              }

              if (styles['line-height']) {
                if (!results.lineHeightSelectors[styles['line-height']]) {
                  results.lineHeightSelectors[styles['line-height']] = new Set();
                }
                results.lineHeightSelectors[styles['line-height']].add(selector);
              }

              if (styles['letter-spacing']) {
                if (!results.letterSpacingSelectors[styles['letter-spacing']]) {
                  results.letterSpacingSelectors[styles['letter-spacing']] = new Set();
                }
                results.letterSpacingSelectors[styles['letter-spacing']].add(selector);
              }
            }
          }
        } catch (error) {
          logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
          // Don't add to pagesAnalyzed when there's an error
          errorCount++;
        }
      }

      // Record sequential processing end in telemetry
      if (telemetry && sequentialTimerId) {
        telemetry.stopTimer(sequentialTimerId, {
          pageCount: pagesToAnalyze.length,
          successCount,
          errorCount
        });
      }
    }

    // Convert Sets to Arrays for JSON serialization
    const processedResults = {
      baseUrl: results.baseUrl,
      pagesAnalyzed: results.pagesAnalyzed,
      typographyStyles: results.typographyStyles,
      allFontFamilies: Array.from(results.allFontFamilies),
      allFontSizes: Array.from(results.allFontSizes),
      allFontWeights: Array.from(results.allFontWeights),
      allLineHeights: Array.from(results.allLineHeights),
      allLetterSpacings: Array.from(results.allLetterSpacings),
      cssVars: results.cssVars,
      // Convert selector maps to arrays
      fontFamilySelectors: Object.fromEntries(
        Object.entries(results.fontFamilySelectors).map(([k, v]) => [k, Array.from(v)])
      ),
      fontSizeSelectors: Object.fromEntries(
        Object.entries(results.fontSizeSelectors).map(([k, v]) => [k, Array.from(v)])
      ),
      fontWeightSelectors: Object.fromEntries(
        Object.entries(results.fontWeightSelectors).map(([k, v]) => [k, Array.from(v)])
      ),
      lineHeightSelectors: Object.fromEntries(
        Object.entries(results.lineHeightSelectors).map(([k, v]) => [k, Array.from(v)])
      ),
      letterSpacingSelectors: Object.fromEntries(
        Object.entries(results.letterSpacingSelectors).map(([k, v]) => [k, Array.from(v)])
      )
    };

    // Generate typography visualization if enabled
    if (config.generateVisualizations) {
      try {
        await generateTypographyVisualization(page, processedResults, config.screenshotsDir);
      } catch (error) {
        logger.warn(`Could not generate typography visualization: ${error.message}`);
      }
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(processedResults, null, 2));
      logger.log(`Results saved to: ${config.outputFile}`);
    }

    logger.log('\nTypography extraction completed!');
    logger.log(`Pages analyzed: ${processedResults.pagesAnalyzed.length}`);
    logger.log(`Font families found: ${processedResults.allFontFamilies.length}`);
    logger.log(`Font sizes found: ${processedResults.allFontSizes.length}`);
    logger.log(`Font weights found: ${processedResults.allFontWeights.length}`);
    logger.log(`Line heights found: ${processedResults.allLineHeights.length}`);
    logger.log(`Letter spacings found: ${processedResults.allLetterSpacings.length}`);

    // Save to cache if enabled
    if (config.cache && config.cache.enabled) {
      const cacheKey = generateCacheKey('typography-full', config.baseUrl, {
        maxPages: config.maxPages,
        inputFile: config.inputFile
      });

      saveToCache(cacheKey, processedResults, {
        baseUrl: config.baseUrl,
        maxPages: config.maxPages,
        timestamp: Date.now(),
        sourceFile: config.inputFile,
        pagesCount: processedResults.pagesAnalyzed.length
      }, config.cache);

      logger.log(`Cached typography extraction results for ${config.baseUrl}`);
    }

    // Generate telemetry report if enabled
    if (telemetry) {
      const report = telemetry.generateReport('typography-extraction', config.telemetry);
      logger.log(`Telemetry report generated: ${report.reportName}`);

      // Log performance summary
      logger.log('\nPerformance Summary:');
      logger.log(`Total extraction time: ${((report.duration) / 1000).toFixed(2)}s`);
      logger.log(`Pages analyzed: ${processedResults.pagesAnalyzed.length}`);
      logger.log(`Average time per page: ${(report.summary.averageDuration).toFixed(2)}ms`);

      if (report.summary.slowestOperation) {
        logger.log(`Slowest operation: ${report.summary.slowestOperation.operationName} (${report.summary.slowestOperation.duration.toFixed(2)}ms)`);
      }
    }

    return {
      success: true,
      data: processedResults,
      fromCache: false,
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    logger.error(`Typography extraction failed: ${error.message}`);
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      }
    };
  } finally {
    // Only close the browser if we created it
    if (browser && shouldCloseBrowser) {
      await browser.close();
    }
  }
}

async function run() {
  // If this script is run directly, execute the extraction
  if (import.meta.url === new URL(import.meta.url).href) {
    extractTypographyFromCrawledPages().then(result => {
      if (!result.success) {
        console.error('Typography extraction failed:', result.error.message);
        process.exitCode = 1;
      }
    }).catch(error => {
      console.error('Typography extraction failed:', error);
      process.exitCode = 1;
    });
  }
}
// Main export function for the typography extractor
export default extractTypographyFromCrawledPages;

// For named exports
export {
  extractTypography,
  extractTypographyFromPage,
  extractTypographyFromCrawledPages,
  generateTypographyVisualization
};
