
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { chromium } from '@playwright/test';

import telemetryManager from '../utils/telemetry-manager.js';

/**
 * Spacing extractor using Playwright
 * This script extracts spacing-related CSS from the crawled pages
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

  // Output file for the spacing analysis
  outputFile: path.join(__dirname, '../../results/raw/spacing-analysis.json'),

  // CSS properties to extract (spacing-related)
  cssProperties: [
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'gap', 'row-gap', 'column-gap',
    'grid-gap', 'grid-row-gap', 'grid-column-gap',
    'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height'
  ],

  // Elements to analyze
  elements: [
    // Container elements
    'body', 'header', 'footer', 'main', 'section', 'article',
    'aside', 'nav', 'div', 'form', 'table',

    // Text elements
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'ul', 'ol', 'li', 'blockquote',

    // Form elements
    'label', 'input', 'textarea', 'select', 'button',

    // Common layout elements
    '.container', '.wrapper', '.row', '.column', '.grid',
    '.card', '.panel', '.box', '.section',

    // Specific site elements
    '.coh-container', '.coh-row', '.coh-column',
    '.coh-style-', '.coh-ce-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/spacing'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/spacing'),

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
 * Function to evaluate spacing on a page
 * This function is serialized and executed in the browser context
 * @param {object} config - Configuration object passed from Node.js
 * @returns {object} - Extracted spacing data
 */
function evaluateSpacing(config) {
  const styles = {};
  const spacingValues = new Set();
  const cssVars = {};

  // Helper function to get computed style for an element
  function getComputedStyleForElement(element, selector) {
    const styleObj = {};
    const computedStyle = window.getComputedStyle(element);

    // Extract only spacing-related properties
    for (const prop of config.cssProperties) {
      const value = computedStyle.getPropertyValue(prop);
      if (value && value !== 'none' && value !== 'normal' && value !== 'auto') {
        styleObj[prop] = value;

        // Extract spacing values
        if (prop.includes('margin') || prop.includes('padding') || prop.includes('gap')) {
          // Handle multiple values (e.g., "10px 20px")
          const values = value.split(' ');
          values.forEach(val => {
            if (val.endsWith('px') || val.endsWith('rem') || val.endsWith('em') || val.endsWith('%')) {
              spacingValues.add(val);
            }
          });
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

      // Process each element matching the selector
      elements.forEach(element => {
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
      });
    }
  }

  // Extract CSS variables related to spacing
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        const rules = sheet.cssRules || sheet.rules;

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule.style) {
            for (let k = 0; k < rule.style.length; k++) {
              const prop = rule.style[k];
              if (prop.startsWith('--') &&
                  (prop.includes('spacing') || prop.includes('margin') ||
                   prop.includes('padding') || prop.includes('gap') ||
                   prop.includes('width') || prop.includes('height'))) {
                const value = rule.style.getPropertyValue(prop);
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
    spacingValues: Array.from(spacingValues),
    cssVars
  };
}

/**
 * Extract spacing styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {object} config - Configuration object
 * @returns {Promise<object>} - Spacing styles
 */
async function extractSpacing(page, config = defaultConfig) {
  try {
    // Pass the config to the evaluate function
    return await page.evaluate(evaluateSpacing, config);
  } catch (error) {
    console.error(`Error extracting spacing: ${error.message}`);
    return {
      elementStyles: {},
      spacingValues: [],
      cssVars: {}
    };
  }
}

/**
 * Extract spacing from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL to navigate to (optional)
 * @param {object} config - Configuration object
 * @returns {Promise<object>} - Spacing data
 */
async function extractSpacingFromPage(page, url = null, config = defaultConfig) {
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

    // Extract spacing
    try {
      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-spacing', { url });
      }

      const spacing = await extractSpacing(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          spacingValuesCount: spacing.spacingValues.length,
          cssVarsCount: Object.keys(spacing.cssVars).length
        });
      }

      return {
        success: true,
        data: spacing,
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    } catch (evalError) {
      console.error(`Error extracting spacing from page: ${evalError.message}`);

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
 * Generate a visualization of spacing values
 * @param {import('playwright').Page} page - Playwright page object
 * @param {object} groupedSpacing - Grouped spacing values
 * @param {string} screenshotsDir - Directory to save screenshots
 * @returns {Promise<void>}
 */
async function generateSpacingVisualization(page, groupedSpacing, screenshotsDir) {
  // Create HTML for visualization
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Spacing Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { margin-bottom: 20px; }
        .spacing-group { margin-bottom: 40px; }
        .spacing-group h2 { margin-bottom: 10px; }
        .spacing-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .spacing-box {
          background-color: #e0e0ff;
          border: 1px solid #9090ff;
          margin-right: 20px;
        }
        .spacing-label {
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1>Spacing Visualization</h1>
  `;

  // Add each spacing group
  for (const [unit, values] of Object.entries(groupedSpacing)) {
    html += `
      <div class="spacing-group">
        <h2>Unit: ${unit}</h2>
    `;

    // Sort values numerically
    const sortedValues = [...values].sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      return numA - numB;
    });

    // Add each spacing value
    for (const value of sortedValues) {
      const size = parseFloat(value);
      html += `
        <div class="spacing-item">
          <div class="spacing-box" style="width: ${size}${unit}; height: 20px;"></div>
          <div class="spacing-label">${value}</div>
        </div>
      `;
    }

    html += `</div>`;
  }

  html += `
    </body>
    </html>
  `;

  // Set the HTML content
  await page.setContent(html);

  // Take a screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'spacing-visualization.png'), fullPage: true });
}

/**
 * Main function to extract spacing from crawled pages
 * @param {object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {object} logger - Logger object (optional)
 * @returns {Promise<object>} - Spacing results
 */
async function extractSpacingFromCrawledPages(customConfig = {}, browser = null, logger = null) {
  // If logger is not provided, get a configured logger from config
  if (!logger) {
    const { getLogger } = await import('../utils/console-manager.js');
    logger = getLogger(customConfig, 'spacing');
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
  const extractionTask = logger.task('Starting spacing extraction');

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
    extractionTask.update(`Analyzing spacing on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    shouldCloseBrowser = !browser;

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

    // Create a new page
    const page = await context.newPage();

    // Results object
    const results = {
      baseUrl: crawlResults.baseUrl,
      pagesAnalyzed: [],
      spacingStyles: {},
      allSpacingValues: new Set(),
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract spacing from page with telemetry if enabled
        let result;
        if (telemetry) {
          result = await telemetryManager.withTelemetry(
            () => extractSpacingFromPage(page, pageInfo.url, config),
            'extract-spacing-page',
            { url: pageInfo.url, index: i },
            telemetry
          );
        } else {
          result = await extractSpacingFromPage(page, pageInfo.url, config);
        }

        const { success, data, error } = result;

        if (!success) {
          logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
          continue;
        }

        // Add to results
        results.pagesAnalyzed.push({
          url: pageInfo.url,
          title: pageInfo.title
        });

        // Merge spacing styles
        for (const [selector, styles] of Object.entries(data.elementStyles)) {
          if (!results.spacingStyles[selector]) {
            results.spacingStyles[selector] = [];
          }
          results.spacingStyles[selector].push(...styles);
        }

        // Add spacing values
        data.spacingValues.forEach(value => results.allSpacingValues.add(value));

        // Merge CSS variables
        Object.assign(results.cssVars, data.cssVars);
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
      }
    }

    // Convert Set to Array for JSON serialization
    results.allSpacingValues = Array.from(results.allSpacingValues);

    // Group spacing values by unit
    const groupedSpacing = {};
    results.allSpacingValues.forEach(value => {
      // Extract unit (px, rem, em, %)
      const unit = value.replace(/[\d.-]/g, '');
      if (!groupedSpacing[unit]) {
        groupedSpacing[unit] = [];
      }
      groupedSpacing[unit].push(value);
    });

    // Add grouped spacing to results
    results.groupedSpacing = groupedSpacing;

    // Generate spacing visualization if enabled
    if (config.generateVisualizations) {
      // Create visualization spinner
      const vizSpinner = logger.spinner('Generating spacing visualization');

      try {
        // Record visualization generation in telemetry if enabled
        if (telemetry) {
          await telemetryManager.withTelemetry(
            () => generateSpacingVisualization(page, groupedSpacing, config.screenshotsDir),
            'generate-spacing-visualization',
            { unitCount: Object.keys(groupedSpacing).length },
            telemetry
          );
        } else {
          await generateSpacingVisualization(page, groupedSpacing, config.screenshotsDir);
        }

        vizSpinner.succeed('Spacing visualization generated');
      } catch (error) {
        vizSpinner.warn(`Could not generate spacing visualization: ${error.message}`);

        // Record error in telemetry if enabled
        if (telemetry) {
          telemetry.recordMetric('visualization-error', 0, {
            error: error.message,
            type: error.name
          });
        }
      }
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      // Create save file spinner
      const saveSpinner = logger.spinner(`Saving spacing results to file`);

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
        const report = telemetry.generateReport('spacing-extraction', {
          writeToFile: true
        });
        logger.log(`Telemetry report generated with ${report.summary.operationCount} operations`);
      } catch (error) {
        logger.error(`Error generating telemetry report: ${error.message}`);
      }
    }

    // Complete the extraction task with success
    extractionTask.complete('Spacing extraction completed successfully');

    // Show summary of results
    logger.success(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.info(`Unique spacing values found: ${results.allSpacingValues.length}`);

    return {
      success: true,
      data: results,
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    // Mark the extraction task as failed
    extractionTask.fail(`Spacing extraction failed: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('extraction-process-error', 0, {
        error: error.message,
        type: error.name
      });

      // Generate error telemetry report if enabled
      try {
        telemetry.generateReport('spacing-extraction-error', {
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
  if (import.meta.url === new URL(import.meta.url).href) {
    extractSpacingFromCrawledPages().then(result => {
      if (!result.success) {
        console.error('Spacing extraction failed:', result.error.message);
        process.exitCode = 1;
      }
    }).catch(error => {
      console.error('Spacing extraction failed:', error);
      process.exitCode = 1;
    });
  }
}

// Main export function for the spacing extractor
export default extractSpacingFromCrawledPages;

// For named exports
export {
  extractSpacing,
  extractSpacingFromPage,
  extractSpacingFromCrawledPages,
  generateSpacingVisualization
};
