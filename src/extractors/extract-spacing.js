// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Spacing extractor using Playwright
 * This script extracts spacing-related CSS from the crawled pages
 */

// Configuration
const config = {
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
  screenshotsDir: path.join(__dirname, '../../results/screenshots/spacing')
};

/**
 * Extract spacing styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Object>} - Spacing styles
 */
async function extractSpacing(page) {
  return page.evaluate((config) => {
    const styles = {};
    const spacingValues = new Set();

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

      if (elements.length === 0) continue;

      styles[selector] = [];

      // Sample up to 5 elements of each type to avoid too much data
      const sampleSize = Math.min(elements.length, 5);
      for (let i = 0; i < sampleSize; i++) {
        const element = elements[i];
        const elementStyles = getComputedStyleForElement(element, selector);

        if (elementStyles) {
          // Get element's classes and ID for reference
          const classes = Array.from(element.classList).join(' ');
          const id = element.id;

          styles[selector].push({
            classes: classes || null,
            id: id || null,
            styles: elementStyles
          });
        }
      }

      // If no styles were found, remove the empty array
      if (styles[selector].length === 0) {
        delete styles[selector];
      }
    }

    // Also look for CSS custom properties related to spacing
    const cssVars = {};
    const styleSheets = Array.from(document.styleSheets);

    try {
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            if (rule.type === CSSRule.STYLE_RULE) {
              const style = rule.style;
              for (let i = 0; i < style.length; i++) {
                const prop = style[i];
                if (prop.startsWith('--') &&
                    (prop.includes('spacing') || prop.includes('margin') ||
                     prop.includes('padding') || prop.includes('gap') ||
                     prop.includes('width') || prop.includes('height'))) {
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
      spacingValues: Array.from(spacingValues),
      cssVars
    };
  }, config);
}

/**
 * Main function to extract spacing from crawled pages
 */
async function extractSpacingFromCrawledPages() {
  console.log('Starting spacing extraction...');

  // Create screenshots directory if it doesn't exist
  if (!fs.existsSync(config.screenshotsDir)) {
    fs.mkdirSync(config.screenshotsDir, { recursive: true });
  }

  // Read crawl results
  if (!fs.existsSync(config.inputFile)) {
    console.error(`Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
  const pages = crawlResults.crawledPages.filter(page => page.status === 200);

  // Limit the number of pages if needed
  const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

  console.log(`Analyzing spacing on ${pagesToAnalyze.length} pages...`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 }
  });

  // Create a new page
  const page = await context.newPage();

  // Results object
  const results = {
    baseUrl: crawlResults.baseUrl, // Use the baseUrl from crawl results
    pagesAnalyzed: [],
    spacingStyles: {},
    allSpacingValues: new Set(),
    cssVars: {}
  };

  // Analyze each page
  for (let i = 0; i < pagesToAnalyze.length; i++) {
    const pageInfo = pagesToAnalyze[i];
    console.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

    try {
      // Navigate to the page
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Take a screenshot
      if (i === 0) {
        await page.screenshot({ path: path.join(config.screenshotsDir, 'page-example.png') });
      }

      // Extract spacing
      const spacing = await extractSpacing(page);

      // Add to results
      results.pagesAnalyzed.push({
        url: pageInfo.url,
        title: pageInfo.title
      });

      // Merge spacing styles
      for (const selector in spacing.elementStyles) {
        if (!results.spacingStyles[selector]) {
          results.spacingStyles[selector] = [];
        }

        // Add unique styles only
        for (const style of spacing.elementStyles[selector]) {
          // Check if this style is already in the results
          const isDuplicate = results.spacingStyles[selector].some(existingStyle => {
            return JSON.stringify(existingStyle.styles) === JSON.stringify(style.styles);
          });

          if (!isDuplicate) {
            results.spacingStyles[selector].push(style);
          }
        }
      }

      // Add spacing values
      spacing.spacingValues.forEach(value => results.allSpacingValues.add(value));

      // Merge CSS vars
      Object.assign(results.cssVars, spacing.cssVars);
    } catch (error) {
      console.error(`Error analyzing ${pageInfo.url}:`, error.message);
    }
  }

  // Convert Set to Array for JSON serialization
  results.allSpacingValues = Array.from(results.allSpacingValues);

  // Group spacing values by unit
  const groupedSpacing = {
    px: results.allSpacingValues.filter(value => value.endsWith('px')).sort((a, b) => parseFloat(a) - parseFloat(b)),
    rem: results.allSpacingValues.filter(value => value.endsWith('rem')).sort((a, b) => parseFloat(a) - parseFloat(b)),
    em: results.allSpacingValues.filter(value => value.endsWith('em')).sort((a, b) => parseFloat(a) - parseFloat(b)),
    percent: results.allSpacingValues.filter(value => value.endsWith('%')).sort((a, b) => parseFloat(a) - parseFloat(b)),
    other: results.allSpacingValues.filter(value => !value.endsWith('px') && !value.endsWith('rem') && !value.endsWith('em') && !value.endsWith('%'))
  };

  // Add grouped spacing to results
  results.groupedSpacing = groupedSpacing;

  // Generate spacing visualization
  await generateSpacingVisualization(page, groupedSpacing);

  // Save results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  console.log('\nSpacing extraction completed!');
  console.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
  console.log(`Unique spacing values found: ${results.allSpacingValues.length}`);
  console.log(`Results saved to: ${config.outputFile}`);

  // Close browser
  await browser.close();

  return results;
}

/**
 * Generate spacing visualization for the report
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} groupedSpacing - Grouped spacing values
 */
async function generateSpacingVisualization(page, groupedSpacing) {
  // Create a simple HTML page with spacing visualization
  const spacingHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Spacing Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .spacing-container { display: flex; flex-direction: column; gap: 20px; }
        .spacing-group { margin-bottom: 30px; }
        .spacing-group h2 { margin-bottom: 15px; }
        .spacing-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        .spacing-value {
          width: 100px;
          font-family: monospace;
        }
        .spacing-visual {
          height: 20px;
          background-color: #6200ee;
        }
        .spacing-label {
          margin-left: 10px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="spacing-container">
        <div class="spacing-group">
          <h2>Pixel Values</h2>
          ${groupedSpacing.px.map(value => {
            const pixels = parseFloat(value);
            return `
              <div class="spacing-item">
                <div class="spacing-value">${value}</div>
                <div class="spacing-visual" style="width: ${pixels}px"></div>
                <div class="spacing-label">${pixels}px</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="spacing-group">
          <h2>REM Values</h2>
          ${groupedSpacing.rem.map(value => {
            const rems = parseFloat(value);
            const pixels = rems * 16; // Assuming 1rem = 16px
            return `
              <div class="spacing-item">
                <div class="spacing-value">${value}</div>
                <div class="spacing-visual" style="width: ${pixels}px"></div>
                <div class="spacing-label">${value} (≈ ${pixels}px)</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="spacing-group">
          <h2>EM Values</h2>
          ${groupedSpacing.em.map(value => {
            const ems = parseFloat(value);
            const pixels = ems * 16; // Assuming 1em = 16px
            return `
              <div class="spacing-item">
                <div class="spacing-value">${value}</div>
                <div class="spacing-visual" style="width: ${pixels}px"></div>
                <div class="spacing-label">${value} (≈ ${pixels}px)</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </body>
    </html>
  `;

  // Navigate to the HTML content
  await page.setContent(spacingHtml);

  // Take a screenshot of the spacing visualization
  await page.screenshot({
    path: path.join(config.screenshotsDir, 'spacing-visualization.png'),
    fullPage: true
  });
}

// If this script is run directly, execute the extraction
if (require.main === module) {
  extractSpacingFromCrawledPages().catch(error => {
    console.error('Spacing extraction failed:', error);
    process.exit(1);
  });
}

// Export the function for use in other scripts
module.exports = { extractSpacingFromCrawledPages };
