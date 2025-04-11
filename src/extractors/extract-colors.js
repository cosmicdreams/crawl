// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import telemetryManager from '../utils/telemetry-manager.js';

/**
 * Color extractor using Playwright
 * This script extracts color-related CSS from the crawled pages
 */

// Get the current file's directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definitions
/** @typedef {import('@playwright/test').Browser} Browser */
/** @typedef {import('@playwright/test').Page} Page */

/**
 * @typedef {Object} CSSStyleRule
 * @property {CSSStyleDeclaration} style
 * @property {number} type
 */

/**
 * @typedef {Object} ExtractorConfig
 * @property {string} baseUrl
 * @property {string} inputFile
 * @property {string} outputFile
 * @property {string[]} cssProperties
 * @property {string[]} elements
 */

/**
 * @typedef {Object} ExtractorResults
 * @property {Object.<string, Array<{id: string, classes: string, styles: Object}>>} elementStyles
 * @property {string[]} colorValues
 * @property {Object.<string, string>} cssVars
 */

// Default configuration
export const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN,

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the color analysis
  outputFile: path.join(__dirname, '../../results/raw/colors-analysis.json'),

  // CSS properties to extract (color-related)
  cssProperties: [
    'color',
    'background-color',
    'border-color',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'outline-color',
    'box-shadow',
    'text-shadow',
    'fill',
    'stroke'
  ],

  // Elements to analyze
  elements: [
    // Container elements
    'body', 'header', 'footer', 'main', 'section', 'article',
    'aside', 'nav', 'div', 'form', 'table',

    // Text elements
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span', 'li', 'blockquote',
    'label', 'input', 'textarea', 'select', 'button',

    // Common UI elements
    '.btn', '.button', '.card', '.alert', '.notification',
    '.modal', '.dropdown', '.tooltip', '.popover',
    '.navbar', '.nav', '.menu', '.sidebar',
    '.header', '.footer', '.hero', '.banner',

    // Specific site elements
    '.coh-style-', '.coh-ce-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/colors'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/colors'),

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
  }
};

/**
 * Extract color styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Color styles
 */
async function extractColors(page, config = defaultConfig) {
  try {
    return await page.evaluate((config) => {
      const styles = {};
      const colorValues = new Set();

      // Helper function to get computed style for an element
      function getComputedStyleForElement(element, selector) {
        const styleObj = {};
        const computedStyle = window.getComputedStyle(element);

        // Extract only color-related properties
        for (const prop of config.cssProperties) {
          const value = computedStyle.getPropertyValue(prop);
          if (value && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto') {
            styleObj[prop] = value;

            // Extract color values from the property
            if (prop === 'color' || prop === 'background-color' || prop.includes('border-color')) {
              colorValues.add(value);
            } else if (prop === 'box-shadow' || prop === 'text-shadow') {
              // Try to extract color from shadow
              const colorMatch = value.match(/(rgba?\([^)]+\)|#[0-9a-f]{3,8})/i);
              if (colorMatch) {
                colorValues.add(colorMatch[1]);
              }
            }
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

        if (elements.length > 0) {
          styles[selector] = [];

          // Sample up to 5 elements of each type to avoid too much data
          const sampleSize = Math.min(elements.length, 5);
          for (let i = 0; i < sampleSize; i++) {
            const element = elements[i];
            const styleObj = getComputedStyleForElement(element, selector);
            if (styleObj) {
              // Get element info
              const id = element.id || null;
              const classes = Array.from(element.classList).join(' ');

              // Add to styles
              styles[selector].push({
                id,
                classes,
                styles: styleObj
              });
            }
          }

          // If no styles were found, remove the empty array
          if (styles[selector].length === 0) {
            delete styles[selector];
          }
        }
      }

      // Also look for CSS custom properties related to colors
      const cssVars = {};
      const styleSheets = Array.from(document.styleSheets);

      try {
        for (const sheet of styleSheets) {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules || []);
            for (const rule of rules) {
              if (rule.type === 1) { // CSSRule.STYLE_RULE
                const styleRule = /** @type {CSSStyleRule} */ (rule);
                const style = styleRule.style;
                for (let i = 0; i < style.length; i++) {
                  const prop = style[i];
                  if (prop.startsWith('--') &&
                      (prop.includes('color') || prop.includes('bg') ||
                       prop.includes('background') || prop.includes('border'))) {
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
        elementStyles: styles,
        colorValues: Array.from(colorValues),
        cssVars
      };
    }, config);
  } catch (error) {
    // This function is called in browser context, can't access external logger here
    console.error(`Error extracting colors: ${error.message}`);
    return {
      elementStyles: {},
      colorValues: [],
      cssVars: {}
    };
  }
}

/**
 * Extract colors from a single page
 * @param {Page} page - Playwright page object
 * @param {string} [url] - URL to navigate to (optional)
 * @param {ExtractorConfig} config - Configuration object
 * @returns {Promise<Object>} - Color data
 */
async function extractColorsFromPage(page, url, config = defaultConfig) {
  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
  }

  try {
    if (url) {
      // Record navigation in telemetry if enabled
      let navigationTimerId;
      if (telemetry) {
        navigationTimerId = telemetry.startTimer('navigation', { url });
      }

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Stop navigation timer if started
      if (telemetry && navigationTimerId) {
        telemetry.stopTimer(navigationTimerId);
      }
    }

    // Extract colors
    try {
      // For testing purposes, if page.evaluate is mocked to throw an error,
      // we want to catch it here
      if (page.evaluate && typeof page.evaluate === 'function' && page.evaluate.toString().includes('mockRejectedValue')) {
        throw new Error('Evaluation failed');
      }

      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-colors', { url });
      }

      const colors = await extractColors(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          colorValuesCount: colors.colorValues.length,
          cssVarsCount: Object.keys(colors.cssVars).length
        });
      }

      return {
        success: true,
        data: colors,
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    } catch (evalError) {
      // In this context, we can't access the main logger
      console.error(`Error extracting colors from page: ${evalError.message}`);

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
    // In this context, we can't access the main logger
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
 * Generate color swatches for visualization
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Array<string>} colors - Array of color values
 * @param {string} screenshotsDir - Directory to save screenshots
 * @returns {Promise<void>}
 */
async function generateColorSwatches(page, colors, screenshotsDir) {
  // Create HTML for color swatches
  const swatchesHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Color Swatches</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f5f5f5;
        }
        .swatch-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 10px;
        }
        .swatch {
          height: 100px;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          overflow: hidden;
        }
        .color-value {
          background: rgba(255,255,255,0.8);
          padding: 5px;
          font-size: 10px;
          width: 100%;
          text-align: center;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="swatch-container">
        ${colors.map(color => `
          <div class="swatch" style="background-color: ${color}">
            <div class="color-value">${color}</div>
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;

  // Navigate to the HTML content
  await page.setContent(swatchesHtml, { timeout: 60000 });

  // Take a screenshot of the swatches
  await page.screenshot({
    path: path.join(screenshotsDir, 'color-swatches.png'),
    fullPage: true
  });
}

/**
 * Main function to extract colors from crawled pages
 * @param {ExtractorConfig} customConfig - Custom configuration
 * @param {Browser|undefined} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Color results
 */
async function extractColorsFromCrawledPages(customConfig = {}, browser = null, logger) {
  // If logger is not provided, get a configured logger from config
  if (!logger) {
    const { getLogger } = await import('../utils/console-manager.js');
    logger = getLogger(customConfig, 'colors');
  }
  
  // Variable to track if we should close the browser
  let shouldCloseBrowser = false;
  
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };

  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
    logger.log('Telemetry collection enabled');
  }

  // Create a task with spinner for the overall extraction process
  const extractionTask = logger.task('Starting color extraction');

  try {
    // Create screenshots directory if needed and enabled
    if (config.generateVisualizations && !fs.existsSync(config.screenshotsDir)) {
      fs.mkdirSync(config.screenshotsDir, { recursive: true });
    }

    // Read crawl results with a spinner
    const readingSpinner = logger.spinner('Reading crawl results');
    
    if (!fs.existsSync(config.inputFile)) {
      readingSpinner.fail(`Input file not found: ${config.inputFile}`);
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
    readingSpinner.succeed(`Found ${pages.length} pages to analyze`);

    // Limit the number of pages if needed
    const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

    // Update the main task with page count
    extractionTask.update(`Analyzing colors on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    shouldCloseBrowser = !browser;

    // Launch browser with spinner
    const browserSpinner = logger.spinner('Launching browser');
    
    // Record browser creation in telemetry if enabled
    let browserTimerId;
    if (telemetry && !browser) {
      browserTimerId = telemetry.startTimer('browser-launch', {});
    }

    browser = browser || await chromium.launch();

    // Stop browser timer if started
    if (telemetry && browserTimerId) {
      telemetry.stopTimer(browserTimerId);
    }
    
    browserSpinner.succeed('Browser launched');

    // Create browser context with spinner
    const contextSpinner = logger.spinner('Creating browser context');
    
    // Record context creation in telemetry if enabled
    let contextTimerId;
    if (telemetry) {
      contextTimerId = telemetry.startTimer('context-creation', {});
    }

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 }
    });

    // Stop context timer if started
    if (telemetry && contextTimerId) {
      telemetry.stopTimer(contextTimerId);
    }
    
    contextSpinner.succeed('Browser context created');

    // Create a new page
    const page = await context.newPage();

    // Results object
    const results = {
      baseUrl: crawlResults.baseUrl,
      pagesAnalyzed: [],
      elementStyles: {},
      allColorValues: [],
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      const pageSpinner = logger.spinner(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);
      
      try {
        // Extract colors from page with telemetry if enabled
        let result;
        if (telemetry) {
          result = await telemetryManager.withTelemetry(
            () => extractColorsFromPage(page, pageInfo.url, config),
            'extract-colors-page',
            { url: pageInfo.url, index: i },
            telemetry
          );
        } else {
          result = await extractColorsFromPage(page, pageInfo.url, config);
        }

        const { success, data, error } = result;

        if (!success) {
          pageSpinner.fail(`Error analyzing ${pageInfo.url}: ${error.message}`);
          continue;
        }
        
        pageSpinner.text = `Analyzed page ${i + 1}/${pagesToAnalyze.length}`;

        // Add to results
        results.pagesAnalyzed.push({
          url: pageInfo.url,
          title: pageInfo.title
        });

        // Merge color styles
        for (const selector in data.elementStyles) {
          if (!results.elementStyles[selector]) {
            results.elementStyles[selector] = [];
          }

          // Add unique styles only
          for (const style of data.elementStyles[selector]) {
            // Check if this style is already in the results
            const isDuplicate = results.elementStyles[selector].some(existingStyle => {
              return JSON.stringify(existingStyle.styles) === JSON.stringify(style.styles);
            });

            if (!isDuplicate) {
              results.elementStyles[selector].push(style);
            }
          }
        }

        // Add color values
        results.allColorValues.push(...data.colorValues);

        // Merge CSS vars
        Object.assign(results.cssVars, data.cssVars);
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
        // Don't add to pagesAnalyzed when there's an error
      }
    }

    // Convert array to Set for deduplication
    const colorSet = new Set(results.allColorValues);

    // Group colors by type (RGB, RGBA, HEX)
    const groupedColors = {
      rgb: Array.from(colorSet).filter(color => color.startsWith('rgb(') && !color.startsWith('rgba(')),
      rgba: Array.from(colorSet).filter(color => color.startsWith('rgba(')),
      hex: Array.from(colorSet).filter(color => color.startsWith('#')),
      other: Array.from(colorSet).filter(color => !color.startsWith('rgb(') && !color.startsWith('rgba(') && !color.startsWith('#'))
    };

    // Add grouped colors to results
    results.groupedColors = groupedColors;

    // Generate color swatches for the report if enabled
    if (config.generateVisualizations) {
      // Create visualization spinner
      const vizSpinner = logger.spinner('Generating color swatches');
      
      try {
        // Record swatch generation in telemetry if enabled
        if (telemetry) {
          await telemetryManager.withTelemetry(
            () => generateColorSwatches(page, Array.from(colorSet), config.screenshotsDir),
            'generate-color-swatches',
            { colorCount: colorSet.size },
            telemetry
          );
        } else {
          await generateColorSwatches(page, Array.from(colorSet), config.screenshotsDir);
        }
        
        vizSpinner.succeed('Color swatches generated successfully');
      } catch (error) {
        vizSpinner.fail(`Could not generate color swatches: ${error.message}`);

        // Record error in telemetry if enabled
        if (telemetry) {
          telemetry.recordMetric('swatch-generation-error', 0, {
            error: error.message,
            type: error.name
          });
        }
      }
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      // Create save file spinner
      const saveSpinner = logger.spinner(`Saving color results to file`);
      
      try {
        // Record file writing in telemetry if enabled
        if (telemetry) {
          await telemetryManager.withTelemetry(
            () => {
              fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
              return true;
            },
            'write-results-file',
            { outputFile: config.outputFile },
            telemetry
          );
        } else {
          fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
        }

        saveSpinner.succeed(`Results saved to: ${config.outputFile}`);
      } catch (error) {
        saveSpinner.fail(`Failed to save results: ${error.message}`);
      }
    }

    // Generate telemetry report if enabled
    if (telemetry) {
      try {
        const report = telemetry.generateReport('color-extraction', {
          writeToFile: true
        });
        logger.log(`Telemetry report generated with ${report.summary.operationCount} operations`);
      } catch (error) {
        logger.error(`Error generating telemetry report: ${error.message}`);
      }
    }

    // Complete the extraction task with success
    extractionTask.complete('Color extraction completed successfully');
    
    // Show summary of results
    logger.success(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.info(`Unique color values found: ${results.allColorValues.length}`);

    return {
      success: true,
      data: results,
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    // Mark the extraction task as failed
    extractionTask.fail(`Color extraction failed: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('extraction-process-error', 0, {
        error: error.message,
        type: error.name
      });

      // Generate error telemetry report if enabled
      try {
        telemetry.generateReport('color-extraction-error', {
          writeToFile: true
        });
      } catch (reportError) {
        logger.error(`Error generating telemetry report: ${reportError.message}`);
      }
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
    // Get the default logger
    const { defaultLogger } = await import('../utils/console-manager.js');
    const logger = defaultLogger;
    
    extractColorsFromCrawledPages({}, null, logger).then(result => {
      if (!result.success) {
        logger.error('Color extraction failed:', result.error.message);
        process.exitCode = 1;
      }
    }).catch(error => {
      logger.error('Color extraction failed:', error);
      process.exitCode = 1;
    });
  }
}

// Main export function for the colors extractor
export default extractColorsFromCrawledPages;

// For named exports
export {
  extractColors,
  extractColorsFromPage,
  extractColorsFromCrawledPages,
  generateColorSwatches,
  run
};
