// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Spacing extractor using Playwright
 * This script extracts spacing-related CSS from the crawled pages
 */

// Default configuration
const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',

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
  generateVisualizations: true
};

/**
 * Create a function to evaluate spacing on a page
 * @param {Object} config - Configuration object
 * @returns {Function} - Function to be evaluated in the browser context
 */
function createSpacingEvaluationFunction(config) {
  return function evaluateSpacing() {
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
  };
}

/**
 * Extract spacing styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Spacing styles
 */
async function extractSpacing(page, config = defaultConfig) {
  try {
    const evaluationFn = createSpacingEvaluationFunction(config);
    return await page.evaluate(evaluationFn);
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
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Spacing data
 */
async function extractSpacingFromPage(page, url = null, config = defaultConfig) {
  try {
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    
    // Extract spacing
    const spacing = await extractSpacing(page, config);
    
    return {
      success: true,
      data: spacing
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
 * Generate a visualization of spacing values
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} groupedSpacing - Grouped spacing values
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
 * @param {Object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Spacing results
 */
async function extractSpacingFromCrawledPages(customConfig = {}, browser = null, logger = console) {
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };
  
  logger.log('Starting spacing extraction...');

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

    logger.log(`Analyzing spacing on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    const shouldCloseBrowser = !browser;
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
      spacingStyles: {},
      allSpacingValues: new Set(),
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract spacing from page
        const { success, data, error } = await extractSpacingFromPage(page, pageInfo.url, config);
        
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
      await generateSpacingVisualization(page, groupedSpacing, config.screenshotsDir);
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
      logger.log(`Results saved to: ${config.outputFile}`);
    }

    logger.log('\nSpacing extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Unique spacing values found: ${results.allSpacingValues.length}`);

    return {
      success: true,
      data: results
    };
  } catch (error) {
    logger.error(`Spacing extraction failed: ${error.message}`);
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
  extractSpacingFromCrawledPages().then(result => {
    if (!result.success) {
      console.error('Spacing extraction failed:', result.error.message);
      process.exit(1);
    }
  }).catch(error => {
    console.error('Spacing extraction failed:', error);
    process.exit(1);
  });
}

// Export the functions for use in other scripts
module.exports = {
  extractSpacingFromCrawledPages,
  extractSpacingFromPage,
  extractSpacing,
  defaultConfig
};
