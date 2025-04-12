
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { chromium } from '@playwright/test';

import telemetryManager from '../utils/telemetry-manager.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Borders and shadows extractor using Playwright
 * This script extracts border and shadow styles from the crawled pages
 */

// Default configuration
export const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN,

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the borders analysis
  outputFile: path.join(__dirname, '../../results/raw/borders-analysis.json'),

  // CSS properties to extract (border and shadow related)
  cssProperties: [
    'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
    'border-width', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
    'border-style', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-radius', 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius',
    'box-shadow', 'text-shadow',
    'outline', 'outline-width', 'outline-style'
  ],

  // Elements to analyze
  elements: [
    // Container elements
    'body', 'header', 'footer', 'main', 'section', 'article',
    'aside', 'nav', 'div', 'form', 'table',

    // Interactive elements
    'button', 'a', 'input', 'textarea', 'select',

    // Common UI elements
    '.card', '.panel', '.alert', '.notification', '.modal',
    '.btn', '.button', '.dropdown', '.tooltip', '.popover',
    '.tab', '.pill', '.badge', '.tag', '.chip',

    // Specific site elements
    '.coh-style-', '.coh-ce-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/borders'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/borders'),

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
 * Function to evaluate borders on a page
 * This function is serialized and executed in the browser context
 * @param {object} config - Configuration object passed from Node.js
 * @returns {object} - Extracted border data
 */
function evaluateBorders(config) {
    const styles = {};
    const borderWidths = new Set();
    const borderStyles = new Set();
    const borderRadii = new Set();
    const shadows = new Set();
    const cssVars = {};

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element, selector) {
      const styleObj = {};
      const computedStyle = window.getComputedStyle(element);

      // Extract only border-related properties
      for (const prop of config.cssProperties) {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0px') {
          styleObj[prop] = value;

          // Extract specific values
          if (prop.includes('width') && !prop.includes('outline')) {
            // Extract border width values
            const match = value.match(/(\d+(\.\d+)?)(px|rem|em)/);
            if (match) {
              borderWidths.add(match[0]);
            }
          } else if (prop.includes('style')) {
            // Extract border style values
            const styles = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'];
            for (const style of styles) {
              if (value.includes(style)) {
                borderStyles.add(style);
              }
            }
          } else if (prop.includes('radius')) {
            // Extract border radius values
            const matches = value.match(/(\d+(\.\d+)?)(px|rem|em|%)/g);
            if (matches) {
              matches.forEach(match => borderRadii.add(match));
            }
          } else if (prop.includes('shadow')) {
            // Extract shadow values
            shadows.add(value);
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

    // Extract CSS variables related to borders and shadows
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
                    (prop.includes('border') || prop.includes('shadow') ||
                     prop.includes('radius') || prop.includes('outline'))) {
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
      borderWidths: Array.from(borderWidths),
      borderStyles: Array.from(borderStyles),
      borderRadii: Array.from(borderRadii),
      shadows: Array.from(shadows),
      cssVars
    };
}

/**
 * Extract border styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {object} config - Configuration object
 * @returns {Promise<object>} - Border styles
 */
async function extractBorders(page, config = defaultConfig) {
  try {
    // Pass the config to the evaluate function
    return await page.evaluate(evaluateBorders, config);
  } catch (error) {
    console.error(`Error extracting borders: ${error.message}`);
    return {
      elementStyles: {},
      borderWidths: [],
      borderStyles: [],
      borderRadii: [],
      shadows: [],
      cssVars: {}
    };
  }
}

/**
 * Extract borders from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL to navigate to (optional)
 * @param {object} config - Configuration object
 * @returns {Promise<object>} - Border data
 */
async function extractBordersFromPage(page, url = null, config = defaultConfig) {
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

    // Extract borders
    try {
      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-borders', { url });
      }

      const borders = await extractBorders(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          borderWidthsCount: borders.borderWidths.length,
          borderStylesCount: borders.borderStyles.length,
          borderRadiiCount: borders.borderRadii.length,
          shadowsCount: borders.shadows.length,
          cssVarsCount: Object.keys(borders.cssVars).length
        });
      }

      return {
        success: true,
        data: borders,
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    } catch (evalError) {
      console.error(`Error extracting borders from page: ${evalError.message}`);

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
 * Generate a visualization of border styles
 * @param {import('playwright').Page} page - Playwright page object
 * @param {object} borderData - Border data
 * @param {string} screenshotsDir - Directory to save screenshots
 * @returns {Promise<void>}
 */
async function generateBorderVisualization(page, borderData, screenshotsDir) {
  // Create HTML for visualization
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Border Styles Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { margin-bottom: 20px; }
        .section { margin-bottom: 40px; }
        .section h2 { margin-bottom: 10px; }
        .example {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .example-box {
          width: 100px;
          height: 100px;
          margin-right: 20px;
          background-color: #f0f0f0;
        }
        .example-label {
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1>Border Styles Visualization</h1>
  `;

  // Add border widths section
  html += `
    <div class="section">
      <h2>Border Widths</h2>
  `;

  for (const width of borderData.borderWidths) {
    html += `
      <div class="example">
        <div class="example-box" style="border: ${width} solid #333;"></div>
        <div class="example-label">Border width: ${width}</div>
      </div>
    `;
  }

  html += `</div>`;

  // Add border styles section
  html += `
    <div class="section">
      <h2>Border Styles</h2>
  `;

  for (const style of borderData.borderStyles) {
    html += `
      <div class="example">
        <div class="example-box" style="border: 2px ${style} #333;"></div>
        <div class="example-label">Border style: ${style}</div>
      </div>
    `;
  }

  html += `</div>`;

  // Add border radius section
  html += `
    <div class="section">
      <h2>Border Radius</h2>
  `;

  for (const radius of borderData.borderRadii) {
    html += `
      <div class="example">
        <div class="example-box" style="border: 1px solid #333; border-radius: ${radius};"></div>
        <div class="example-label">Border radius: ${radius}</div>
      </div>
    `;
  }

  html += `</div>`;

  // Add shadows section
  html += `
    <div class="section">
      <h2>Shadows</h2>
  `;

  for (const shadow of borderData.shadows) {
    html += `
      <div class="example">
        <div class="example-box" style="box-shadow: ${shadow};"></div>
        <div class="example-label">Box shadow: ${shadow}</div>
      </div>
    `;
  }

  html += `
      </div>
    </body>
    </html>
  `;

  // Set the HTML content
  await page.setContent(html);

  // Take a screenshot
  await page.screenshot({ path: path.join(screenshotsDir, 'border-visualization.png'), fullPage: true });
}

/**
 * Main function to extract borders from crawled pages
 * @param {object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {object} logger - Logger object (optional)
 * @returns {Promise<object>} - Border results
 */
async function extractBordersFromCrawledPages(customConfig = {}, browser = null, logger) {
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

  logger.log('Starting border extraction...');

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

    logger.log(`Analyzing borders on ${pagesToAnalyze.length} pages...`);

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
      borderStyles: {},
      allBorderWidths: new Set(),
      allBorderStyles: new Set(),
      allBorderRadii: new Set(),
      allShadows: new Set(),
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract borders from page with telemetry if enabled
        let result;
        if (telemetry) {
          result = await telemetryManager.withTelemetry(
            () => extractBordersFromPage(page, pageInfo.url, config),
            'extract-borders-page',
            { url: pageInfo.url, index: i },
            telemetry
          );
        } else {
          result = await extractBordersFromPage(page, pageInfo.url, config);
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

        // Merge border styles
        for (const [selector, styles] of Object.entries(data.elementStyles)) {
          if (!results.borderStyles[selector]) {
            results.borderStyles[selector] = [];
          }
          results.borderStyles[selector].push(...styles);
        }

        // Add border values
        data.borderWidths.forEach(value => results.allBorderWidths.add(value));
        data.borderStyles.forEach(value => results.allBorderStyles.add(value));
        data.borderRadii.forEach(value => results.allBorderRadii.add(value));
        data.shadows.forEach(value => results.allShadows.add(value));

        // Merge CSS variables
        Object.assign(results.cssVars, data.cssVars);
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
      }
    }

    // Convert Sets to Arrays for JSON serialization
    results.allBorderWidths = Array.from(results.allBorderWidths);
    results.allBorderStyles = Array.from(results.allBorderStyles);
    results.allBorderRadii = Array.from(results.allBorderRadii);
    results.allShadows = Array.from(results.allShadows);

    // Generate border visualization if enabled
    if (config.generateVisualizations) {
      try {
        // Record visualization generation in telemetry if enabled
        if (telemetry) {
          await telemetryManager.withTelemetry(
            () => generateBorderVisualization(page, {
              borderWidths: results.allBorderWidths,
              borderStyles: results.allBorderStyles,
              borderRadii: results.allBorderRadii,
              shadows: results.allShadows
            }, config.screenshotsDir),
            'generate-border-visualization',
            {
              borderWidthsCount: results.allBorderWidths.length,
              borderStylesCount: results.allBorderStyles.length,
              borderRadiiCount: results.allBorderRadii.length,
              shadowsCount: results.allShadows.length
            },
            telemetry
          );
        } else {
          await generateBorderVisualization(page, {
            borderWidths: results.allBorderWidths,
            borderStyles: results.allBorderStyles,
            borderRadii: results.allBorderRadii,
            shadows: results.allShadows
          }, config.screenshotsDir);
        }
      } catch (error) {
        logger.warn(`Could not generate border visualization: ${error.message}`);

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

      logger.log(`Results saved to: ${config.outputFile}`);
    }

    // Generate telemetry report if enabled
    if (telemetry) {
      try {
        const report = telemetry.generateReport('border-extraction', {
          writeToFile: true
        });
        logger.log(`Telemetry report generated with ${report.summary.operationCount} operations`);
      } catch (error) {
        logger.error(`Error generating telemetry report: ${error.message}`);
      }
    }

    logger.log('\nBorder extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Border widths found: ${results.allBorderWidths.length}`);
    logger.log(`Border styles found: ${results.allBorderStyles.length}`);
    logger.log(`Border radii found: ${results.allBorderRadii.length}`);
    logger.log(`Shadows found: ${results.allShadows.length}`);

    return {
      success: true,
      data: results,
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    logger.error(`Border extraction failed: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('extraction-process-error', 0, {
        error: error.message,
        type: error.name
      });

      // Generate error telemetry report if enabled
      try {
        telemetry.generateReport('border-extraction-error', {
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
    extractBordersFromCrawledPages().then(result => {
      if (!result.success) {
        console.error('Border extraction failed:', result.error.message);
        process.exitCode = 1;
      }
    }).catch(error => {
      console.error('Border extraction failed:', error);
      process.exitCode = 1;
    });
  }
}

// Main export function for the borders extractor
export default extractBordersFromCrawledPages;

// For named exports
export {
  extractBorders,
  extractBordersFromPage,
  extractBordersFromCrawledPages,
  generateBorderVisualization
};
