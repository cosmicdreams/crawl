// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Borders and shadows extractor using Playwright
 * This script extracts border and shadow styles from the crawled pages
 */

// Configuration
const config = {
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
  screenshotsDir: path.join(__dirname, '../../results/screenshots/borders')
};

/**
 * Extract border and shadow styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Object>} - Border and shadow styles
 */
async function extractBorders(page) {
  return page.evaluate((config) => {
    const styles = {};
    const borderValues = {
      widths: new Set(),
      styles: new Set(),
      radii: new Set(),
      shadows: new Set()
    };

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element, selector) {
      const styleObj = {};
      const computedStyle = window.getComputedStyle(element);

      // Extract only border and shadow related properties
      for (const prop of config.cssProperties) {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto') {
          styleObj[prop] = value;

          // Categorize values
          if (prop.includes('width')) {
            // Extract width values
            if (value.endsWith('px') || value.endsWith('rem') || value.endsWith('em')) {
              borderValues.widths.add(value);
            }
          } else if (prop.includes('style')) {
            // Extract style values
            borderValues.styles.add(value);
          } else if (prop.includes('radius')) {
            // Extract radius values
            const values = value.split(' ');
            values.forEach(val => {
              if (val.endsWith('px') || val.endsWith('rem') || val.endsWith('em') || val.endsWith('%')) {
                borderValues.radii.add(val);
              }
            });
          } else if (prop.includes('shadow')) {
            // Extract shadow values
            borderValues.shadows.add(value);
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

    // Also look for CSS custom properties related to borders and shadows
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
                    (prop.includes('border') || prop.includes('radius') ||
                     prop.includes('shadow') || prop.includes('outline'))) {
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
      borderWidths: Array.from(borderValues.widths),
      borderStyles: Array.from(borderValues.styles),
      borderRadii: Array.from(borderValues.radii),
      shadows: Array.from(borderValues.shadows),
      cssVars
    };
  }, config);
}

/**
 * Main function to extract borders and shadows from crawled pages
 */
async function extractBordersFromCrawledPages() {
  console.log('Starting borders and shadows extraction...');

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

  console.log(`Analyzing borders and shadows on ${pagesToAnalyze.length} pages...`);

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
    borderStyles: {},
    allBorderWidths: [],
    allBorderStyles: [],
    allBorderRadii: [],
    allShadows: [],
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

      // Extract borders and shadows
      const borders = await extractBorders(page);

      // Add to results
      results.pagesAnalyzed.push({
        url: pageInfo.url,
        title: pageInfo.title
      });

      // Merge border styles
      for (const selector in borders.elementStyles) {
        if (!results.borderStyles[selector]) {
          results.borderStyles[selector] = [];
        }

        // Add unique styles only
        for (const style of borders.elementStyles[selector]) {
          // Check if this style is already in the results
          const isDuplicate = results.borderStyles[selector].some(existingStyle => {
            return JSON.stringify(existingStyle.styles) === JSON.stringify(style.styles);
          });

          if (!isDuplicate) {
            results.borderStyles[selector].push(style);
          }
        }
      }

      // Merge border values
      results.allBorderWidths = [...new Set([...results.allBorderWidths, ...borders.borderWidths])];
      results.allBorderStyles = [...new Set([...results.allBorderStyles, ...borders.borderStyles])];
      results.allBorderRadii = [...new Set([...results.allBorderRadii, ...borders.borderRadii])];
      results.allShadows = [...new Set([...results.allShadows, ...borders.shadows])];

      // Merge CSS vars
      Object.assign(results.cssVars, borders.cssVars);
    } catch (error) {
      console.error(`Error analyzing ${pageInfo.url}:`, error.message);
    }
  }

  // Sort values
  results.allBorderWidths.sort((a, b) => parseFloat(a) - parseFloat(b));
  results.allBorderRadii.sort((a, b) => parseFloat(a) - parseFloat(b));

  // Generate visualizations
  await generateBorderVisualization(page, results);

  // Save results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  console.log('\nBorders and shadows extraction completed!');
  console.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
  console.log(`Border widths found: ${results.allBorderWidths.length}`);
  console.log(`Border styles found: ${results.allBorderStyles.length}`);
  console.log(`Border radii found: ${results.allBorderRadii.length}`);
  console.log(`Shadows found: ${results.allShadows.length}`);
  console.log(`Results saved to: ${config.outputFile}`);

  // Close browser
  await browser.close();

  return results;
}

/**
 * Generate border and shadow visualizations for the report
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} results - Extraction results
 */
async function generateBorderVisualization(page, results) {
  // Create a simple HTML page with border and shadow visualizations
  const visualizationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Border and Shadow Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .section { margin-bottom: 40px; }
        h2 { margin-bottom: 20px; }

        .border-width-container, .border-radius-container, .shadow-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .border-width-item {
          width: 100px;
          height: 100px;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: solid #6200ee;
        }

        .border-radius-item {
          width: 100px;
          height: 100px;
          background-color: #6200ee;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .shadow-item {
          width: 100px;
          height: 100px;
          background-color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .label {
          font-size: 12px;
          text-align: center;
          margin-top: 10px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="section">
        <h2>Border Widths</h2>
        <div class="border-width-container">
          ${results.allBorderWidths.slice(0, 10).map(width => `
            <div>
              <div class="border-width-item" style="border-width: ${width};">
                ${width}
              </div>
              <div class="label">${width}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Border Radii</h2>
        <div class="border-radius-container">
          ${results.allBorderRadii.slice(0, 10).map(radius => `
            <div>
              <div class="border-radius-item" style="border-radius: ${radius};">
                ${radius}
              </div>
              <div class="label">${radius}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Shadows</h2>
        <div class="shadow-container">
          ${results.allShadows.slice(0, 10).map((shadow, index) => `
            <div>
              <div class="shadow-item" style="box-shadow: ${shadow};">
                Shadow ${index + 1}
              </div>
              <div class="label">${shadow}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </body>
    </html>
  `;

  // Navigate to the HTML content
  await page.setContent(visualizationHtml);

  // Take a screenshot of the visualizations
  await page.screenshot({
    path: path.join(config.screenshotsDir, 'border-visualization.png'),
    fullPage: true
  });
}

// If this script is run directly, execute the extraction
if (require.main === module) {
  extractBordersFromCrawledPages().catch(error => {
    console.error('Borders extraction failed:', error);
    process.exit(1);
  });
}

// Export the function for use in other scripts
module.exports = { extractBordersFromCrawledPages };
