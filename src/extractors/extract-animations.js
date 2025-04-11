// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import telemetryManager from '../utils/telemetry-manager.js';

/**
 * Animations extractor using Playwright
 * This script extracts animation and transition styles from the crawled pages
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

  // Output file for the animations analysis
  outputFile: path.join(__dirname, '../../results/raw/animations-analysis.json'),

  // CSS properties to extract (animation and transition related)
  cssProperties: [
    'transition', 'transition-property', 'transition-duration', 'transition-timing-function', 'transition-delay',
    'animation', 'animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay',
    'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state'
  ],

  // Elements to analyze
  elements: [
    // Interactive elements
    'button', 'a', 'input', 'textarea', 'select',

    // Common UI elements
    '.btn', '.button', '.card', '.alert', '.notification',
    '.modal', '.dropdown', '.tooltip', '.popover',
    '.collapse', '.accordion', '.carousel', '.slider',

    // Elements that often have animations
    '.fade', '.slide', '.animate', '.transition',
    '[class*="animate"]', '[class*="transition"]', '[class*="motion"]',

    // Specific site elements
    '.coh-style-', '.coh-ce-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/animations'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/animations'),

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
 * Function to evaluate animations on a page
 * This function is serialized and executed in the browser context
 * @param {Object} config - Configuration object passed from Node.js
 * @returns {Object} - Extracted animation data
 */
function evaluateAnimations(config) {
    const styles = {};
    const durations = new Set();
    const timingFunctions = new Set();
    const delays = new Set();
    const keyframes = {};
    const cssVars = {};

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element, selector) {
      const styleObj = {};
      const computedStyle = window.getComputedStyle(element);

      // Extract only animation-related properties
      for (const prop of config.cssProperties) {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0s') {
          styleObj[prop] = value;

          // Extract specific values
          if (prop.includes('duration')) {
            // Extract duration values
            const matches = value.match(/(\d+(\.\d+)?)(s|ms)/g);
            if (matches) {
              matches.forEach(match => durations.add(match));
            }
          } else if (prop.includes('timing-function')) {
            // Extract timing function values
            const functions = [
              'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out',
              'cubic-bezier', 'step-start', 'step-end', 'steps'
            ];
            for (const func of functions) {
              if (value.includes(func)) {
                timingFunctions.add(value);
                break;
              }
            }
          } else if (prop.includes('delay')) {
            // Extract delay values
            const matches = value.match(/(\d+(\.\d+)?)(s|ms)/g);
            if (matches) {
              matches.forEach(match => delays.add(match));
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

    // Extract keyframes from stylesheets
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        try {
          const sheet = document.styleSheets[i];
          const rules = sheet.cssRules || sheet.rules;

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];

            // Check if it's a keyframes rule
            if (rule.type === CSSRule.KEYFRAMES_RULE) {
              const name = rule.name;
              keyframes[name] = {};

              // Extract keyframes
              for (let k = 0; k < rule.cssRules.length; k++) {
                const keyframeRule = rule.cssRules[k];
                const keyText = keyframeRule.keyText; // e.g., "0%", "50%", "from", "to"

                // Extract styles for this keyframe
                const styles = {};
                for (let l = 0; l < keyframeRule.style.length; l++) {
                  const prop = keyframeRule.style[l];
                  styles[prop] = keyframeRule.style.getPropertyValue(prop);
                }

                keyframes[name][keyText] = styles;
              }
            }

            // Extract CSS variables related to animations
            if (rule.style) {
              for (let k = 0; k < rule.style.length; k++) {
                const prop = rule.style[k];
                if (prop.startsWith('--') &&
                    (prop.includes('animation') || prop.includes('transition') ||
                     prop.includes('duration') || prop.includes('delay'))) {
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
      durations: Array.from(durations),
      timingFunctions: Array.from(timingFunctions),
      delays: Array.from(delays),
      keyframes,
      cssVars
    };
}

/**
 * Extract animation styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Animation styles
 */
async function extractAnimations(page, config = defaultConfig) {
  try {
    // Pass the config to the evaluate function
    return await page.evaluate(evaluateAnimations, config);
  } catch (error) {
    console.error(`Error extracting animations: ${error.message}`);
    return {
      elementStyles: {},
      durations: [],
      timingFunctions: [],
      delays: [],
      keyframes: {},
      cssVars: {}
    };
  }
}

/**
 * Extract animations from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL to navigate to (optional)
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Animation data
 */
async function extractAnimationsFromPage(page, url = null, config = defaultConfig) {
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

    // Extract animations
    try {
      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-animations', { url });
      }

      const animations = await extractAnimations(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          durationsCount: animations.durations.length,
          timingFunctionsCount: animations.timingFunctions.length,
          delaysCount: animations.delays.length,
          keyframesCount: Object.keys(animations.keyframes).length,
          cssVarsCount: Object.keys(animations.cssVars).length
        });
      }

      return {
        success: true,
        data: animations,
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    } catch (evalError) {
      console.error(`Error extracting animations from page: ${evalError.message}`);

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
 * Generate a visualization of animation styles
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} animationData - Animation data
 * @param {string} screenshotsDir - Directory to save screenshots
 * @returns {Promise<void>}
 */
async function generateAnimationVisualization(page, animationData, screenshotsDir) {
  // Create HTML for visualization
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Animation Styles Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { margin-bottom: 20px; }
        .section { margin-bottom: 40px; }
        .section h2 { margin-bottom: 10px; }
        .example {
          display: flex;
          align-items: center;
          margin-bottom: 20px;
        }
        .example-box {
          width: 100px;
          height: 100px;
          background-color: #3498db;
          margin-right: 20px;
        }
        .example-label {
          font-family: monospace;
        }

        /* Animation examples */
        .fade-in {
          animation: fadeIn 2s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pulse {
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .slide-in {
          animation: slideIn 1s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
      </style>
    </head>
    <body>
      <h1>Animation Styles Visualization</h1>
  `;

  // Add durations section
  html += `
    <div class="section">
      <h2>Durations</h2>
  `;

  for (const duration of animationData.durations) {
    html += `
      <div class="example">
        <div class="example-box" style="animation: pulse ${duration} ease-in-out infinite;"></div>
        <div class="example-label">Duration: ${duration}</div>
      </div>
    `;
  }

  html += `</div>`;

  // Add timing functions section
  html += `
    <div class="section">
      <h2>Timing Functions</h2>
  `;

  for (const timingFunction of animationData.timingFunctions) {
    html += `
      <div class="example">
        <div class="example-box" style="animation: slideIn 2s ${timingFunction} infinite;"></div>
        <div class="example-label">Timing function: ${timingFunction}</div>
      </div>
    `;
  }

  html += `</div>`;

  // Add keyframes section
  html += `
    <div class="section">
      <h2>Keyframes</h2>
  `;

  for (const [name, keyframe] of Object.entries(animationData.keyframes)) {
    html += `
      <div class="example">
        <div class="example-box" style="animation: ${name} 2s ease-in-out infinite;"></div>
        <div class="example-label">
          <div>Animation: ${name}</div>
          <pre>${JSON.stringify(keyframe, null, 2)}</pre>
        </div>
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
  await page.screenshot({ path: path.join(screenshotsDir, 'animation-visualization.png'), fullPage: true });
}

/**
 * Main function to extract animations from crawled pages
 * @param {Object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Animation results
 */
async function extractAnimationsFromCrawledPages(customConfig = {}, browser = null, logger ) {
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

  logger.log('Starting animation extraction...');

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

    logger.log(`Analyzing animations on ${pagesToAnalyze.length} pages...`);

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
      animationStyles: {},
      allDurations: new Set(),
      allTimingFunctions: new Set(),
      allDelays: new Set(),
      keyframes: {},
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract animations from page with telemetry if enabled
        let result;
        if (telemetry) {
          result = await telemetryManager.withTelemetry(
            () => extractAnimationsFromPage(page, pageInfo.url, config),
            'extract-animations-page',
            { url: pageInfo.url, index: i },
            telemetry
          );
        } else {
          result = await extractAnimationsFromPage(page, pageInfo.url, config);
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

        // Merge animation styles
        for (const [selector, styles] of Object.entries(data.elementStyles)) {
          if (!results.animationStyles[selector]) {
            results.animationStyles[selector] = [];
          }
          results.animationStyles[selector].push(...styles);
        }

        // Add animation values
        data.durations.forEach(value => results.allDurations.add(value));
        data.timingFunctions.forEach(value => results.allTimingFunctions.add(value));
        data.delays.forEach(value => results.allDelays.add(value));

        // Merge keyframes
        Object.assign(results.keyframes, data.keyframes);

        // Merge CSS variables
        Object.assign(results.cssVars, data.cssVars);
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
      }
    }

    // Convert Sets to Arrays for JSON serialization
    results.allDurations = Array.from(results.allDurations);
    results.allTimingFunctions = Array.from(results.allTimingFunctions);
    results.allDelays = Array.from(results.allDelays);

    // Generate animation visualization if enabled
    if (config.generateVisualizations) {
      try {
        // Record visualization generation in telemetry if enabled
        if (telemetry) {
          await telemetryManager.withTelemetry(
            () => generateAnimationVisualization(page, {
              durations: results.allDurations,
              timingFunctions: results.allTimingFunctions,
              keyframes: results.keyframes
            }, config.screenshotsDir),
            'generate-animation-visualization',
            {
              durationsCount: results.allDurations.length,
              timingFunctionsCount: results.allTimingFunctions.length,
              keyframesCount: Object.keys(results.keyframes).length
            },
            telemetry
          );
        } else {
          await generateAnimationVisualization(page, {
            durations: results.allDurations,
            timingFunctions: results.allTimingFunctions,
            keyframes: results.keyframes
          }, config.screenshotsDir);
        }
      } catch (error) {
        logger.warn(`Could not generate animation visualization: ${error.message}`);

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
        const report = telemetry.generateReport('animation-extraction', {
          writeToFile: true
        });
        logger.log(`Telemetry report generated with ${report.summary.operationCount} operations`);
      } catch (error) {
        logger.error(`Error generating telemetry report: ${error.message}`);
      }
    }

    logger.log('\nAnimation extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Durations found: ${results.allDurations.length}`);
    logger.log(`Timing functions found: ${results.allTimingFunctions.length}`);
    logger.log(`Keyframes found: ${Object.keys(results.keyframes).length}`);

    return {
      success: true,
      data: results,
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    logger.error(`Animation extraction failed: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('extraction-process-error', 0, {
        error: error.message,
        type: error.name
      });

      // Generate error telemetry report if enabled
      try {
        telemetry.generateReport('animation-extraction-error', {
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
    extractAnimationsFromCrawledPages().then(result => {
      if (!result.success) {
        console.error('Animation extraction failed:', result.error.message);
        process.exitCode = 1;
      }
    }).catch(error => {
      console.error('Animation extraction failed:', error);
      process.exitCode = 1;
    });
  }
}
// Main export function for the animations extractor
export default extractAnimationsFromCrawledPages;

// For named exports
export {
  extractAnimations,
  extractAnimationsFromPage,
  extractAnimationsFromCrawledPages,
  generateAnimationVisualization
};
