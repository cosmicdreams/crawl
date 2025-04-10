// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Color extractor using Playwright
 * This script extracts color-related CSS from the crawled pages
 */

// Configuration
const config = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the color analysis
  outputFile: path.join(__dirname, '../../results/raw/color-analysis.json'),

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
    // Text elements
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span', 'li', 'blockquote',
    'label', 'button', 'input', 'textarea',
    'th', 'td', 'caption', 'figcaption',

    // Container elements
    'body', 'header', 'footer', 'main', 'section', 'article',
    'aside', 'nav', 'div', 'form', 'table',

    // UI elements
    '.btn', '.button', '.card', '.alert', '.notification',
    '.badge', '.tag', '.icon', '.tooltip', '.modal',
    '.panel', '.box', '.container', '.wrapper',

    // State elements
    '.active', '.disabled', '.selected', '.hover', '.focus',
    '.success', '.error', '.warning', '.info',

    // Custom site-specific elements
    '.coh-style-', '.coh-color-', '.bg-', '.text-'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/colors')
};

/**
 * Extract color styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Object>} - Color styles
 */
async function extractColors(page) {
  return page.evaluate((config) => {
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
          const text = element.textContent?.trim().substring(0, 50) || '';

          styles[selector].push({
            classes: classes || null,
            id: id || null,
            text: text || null,
            styles: elementStyles
          });
        }
      }

      // If no styles were found, remove the empty array
      if (styles[selector].length === 0) {
        delete styles[selector];
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
            if (rule.type === CSSRule.STYLE_RULE) {
              const style = rule.style;
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
}

/**
 * Main function to extract colors from crawled pages
 */
async function extractColorsFromCrawledPages() {
  console.log('Starting color extraction...');

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

  console.log(`Analyzing colors on ${pagesToAnalyze.length} pages...`);

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
    elementStyles: {}, // Changed from colorStyles to elementStyles for consistency
    allColorValues: new Set(),
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

      // Extract colors
      const colors = await extractColors(page);

      // Add to results
      results.pagesAnalyzed.push({
        url: pageInfo.url,
        title: pageInfo.title
      });

      // Merge color styles
      for (const selector in colors.elementStyles) {
        if (!results.elementStyles[selector]) {
          results.elementStyles[selector] = [];
        }

        // Add unique styles only
        for (const style of colors.elementStyles[selector]) {
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
      colors.colorValues.forEach(color => results.allColorValues.add(color));

      // Merge CSS vars
      Object.assign(results.cssVars, colors.cssVars);
    } catch (error) {
      console.error(`Error analyzing ${pageInfo.url}:`, error.message);
    }
  }

  // Convert Set to Array for JSON serialization
  results.allColorValues = Array.from(results.allColorValues);

  // Group colors by type (RGB, RGBA, HEX)
  const groupedColors = {
    rgb: results.allColorValues.filter(color => color.startsWith('rgb(') && !color.startsWith('rgba(')),
    rgba: results.allColorValues.filter(color => color.startsWith('rgba(')),
    hex: results.allColorValues.filter(color => color.startsWith('#')),
    other: results.allColorValues.filter(color => !color.startsWith('rgb(') && !color.startsWith('rgba(') && !color.startsWith('#'))
  };

  // Add grouped colors to results
  results.groupedColors = groupedColors;

  // Generate color swatches for the report if in a browser context that supports it
  try {
    if (typeof page.setContent === 'function' && typeof page.screenshot === 'function') {
      await generateColorSwatches(page, results.allColorValues);
    }
  } catch (error) {
    console.warn(`Could not generate color swatches: ${error.message}`);
  }

  // Save results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  console.log('\nColor extraction completed!');
  console.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
  console.log(`Unique color values found: ${results.allColorValues.length}`);
  console.log(`Results saved to: ${config.outputFile}`);

  // Close browser
  await browser.close();

  return results;
}

/**
 * Generate color swatches for the report
 * @param {import('playwright').Page} page - Playwright page
 * @param {string[]} colors - Array of color values
 */
async function generateColorSwatches(page, colors) {
  // Create a simple HTML page with color swatches
  const swatchesHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Color Swatches</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .swatch-container { display: flex; flex-wrap: wrap; gap: 10px; }
        .swatch {
          width: 100px;
          height: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
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
    path: path.join(config.screenshotsDir, 'color-swatches.png'),
    fullPage: true
  });
}

// If this script is run directly, execute the extraction
if (require.main === module) {
  extractColorsFromCrawledPages().catch(error => {
    console.error('Color extraction failed:', error);
    process.exit(1);
  });
}

/**
 * Extract colors from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL of the page
 * @returns {Promise<Object>} - Color data
 */
async function extractColorsFromPage(page, url) {
  try {
    // Navigate to the page if URL is provided
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Extract colors
    const colors = await extractColors(page);

    return colors;
  } catch (error) {
    console.error(`Error extracting colors from page: ${error.message}`);
    return {
      elementStyles: {},
      colorValues: [],
      cssVars: {}
    };
  }
}

// Export the functions for use in other scripts
module.exports = {
  extractColorsFromCrawledPages,
  extractColorsFromPage
};
