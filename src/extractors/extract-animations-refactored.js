// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Animations extractor using Playwright
 * This script extracts animation and transition styles from the crawled pages
 */

// Default configuration
const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',

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
  generateVisualizations: true
};

/**
 * Create a function to evaluate animations on a page
 * @param {Object} config - Configuration object
 * @returns {Function} - Function to be evaluated in the browser context
 */
function createAnimationsEvaluationFunction(config) {
  return function evaluateAnimations() {
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
    const evaluationFn = createAnimationsEvaluationFunction(config);
    return await page.evaluate(evaluationFn);
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
  try {
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    
    // Extract animations
    const animations = await extractAnimations(page, config);
    
    return {
      success: true,
      data: animations
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      }
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
async function extractAnimationsFromCrawledPages(customConfig = {}, browser = null, logger = console) {
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };
  
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
        // Extract animations from page
        const { success, data, error } = await extractAnimationsFromPage(page, pageInfo.url, config);
        
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
      await generateAnimationVisualization(page, {
        durations: results.allDurations,
        timingFunctions: results.allTimingFunctions,
        keyframes: results.keyframes
      }, config.screenshotsDir);
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
      logger.log(`Results saved to: ${config.outputFile}`);
    }

    logger.log('\nAnimation extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Durations found: ${results.allDurations.length}`);
    logger.log(`Timing functions found: ${results.allTimingFunctions.length}`);
    logger.log(`Keyframes found: ${Object.keys(results.keyframes).length}`);

    return {
      success: true,
      data: results
    };
  } catch (error) {
    logger.error(`Animation extraction failed: ${error.message}`);
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

// If this script is run directly, execute the extraction
if (require.main === module) {
  extractAnimationsFromCrawledPages().then(result => {
    if (!result.success) {
      console.error('Animation extraction failed:', result.error.message);
      process.exit(1);
    }
  }).catch(error => {
    console.error('Animation extraction failed:', error);
    process.exit(1);
  });
}

// Export the functions for use in other scripts
module.exports = {
  extractAnimationsFromCrawledPages,
  extractAnimationsFromPage,
  extractAnimations,
  defaultConfig
};
