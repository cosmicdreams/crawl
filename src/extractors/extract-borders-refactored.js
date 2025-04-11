// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Borders and shadows extractor using Playwright
 * This script extracts border and shadow styles from the crawled pages
 */

// Default configuration
const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',

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
  generateVisualizations: true
};

/**
 * Create a function to evaluate borders on a page
 * @param {Object} config - Configuration object
 * @returns {Function} - Function to be evaluated in the browser context
 */
function createBordersEvaluationFunction(config) {
  return function evaluateBorders() {
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
  };
}

/**
 * Extract border styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Border styles
 */
async function extractBorders(page, config = defaultConfig) {
  try {
    const evaluationFn = createBordersEvaluationFunction(config);
    return await page.evaluate(evaluationFn);
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
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Border data
 */
async function extractBordersFromPage(page, url = null, config = defaultConfig) {
  try {
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }
    
    // Extract borders
    const borders = await extractBorders(page, config);
    
    return {
      success: true,
      data: borders
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
 * Generate a visualization of border styles
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} borderData - Border data
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
 * @param {Object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Border results
 */
async function extractBordersFromCrawledPages(customConfig = {}, browser = null, logger = console) {
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };
  
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
        // Extract borders from page
        const { success, data, error } = await extractBordersFromPage(page, pageInfo.url, config);
        
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
      await generateBorderVisualization(page, {
        borderWidths: results.allBorderWidths,
        borderStyles: results.allBorderStyles,
        borderRadii: results.allBorderRadii,
        shadows: results.allShadows
      }, config.screenshotsDir);
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
      logger.log(`Results saved to: ${config.outputFile}`);
    }

    logger.log('\nBorder extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Border widths found: ${results.allBorderWidths.length}`);
    logger.log(`Border styles found: ${results.allBorderStyles.length}`);
    logger.log(`Border radii found: ${results.allBorderRadii.length}`);
    logger.log(`Shadows found: ${results.allShadows.length}`);

    return {
      success: true,
      data: results
    };
  } catch (error) {
    logger.error(`Border extraction failed: ${error.message}`);
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
  extractBordersFromCrawledPages().then(result => {
    if (!result.success) {
      console.error('Border extraction failed:', result.error.message);
      process.exit(1);
    }
  }).catch(error => {
    console.error('Border extraction failed:', error);
    process.exit(1);
  });
}

// Export the functions for use in other scripts
module.exports = {
  extractBordersFromCrawledPages,
  extractBordersFromPage,
  extractBorders,
  defaultConfig
};
