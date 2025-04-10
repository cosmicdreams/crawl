// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Typography extractor using Playwright
 * This script extracts typography-related CSS from the crawled pages
 */

// Configuration
const config = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the typography analysis
  outputFile: path.join(__dirname, '../../results/raw/typography-analysis.json'),

  // CSS properties to extract (typography-related)
  cssProperties: [
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'letter-spacing',
    'text-transform',
    'text-decoration',
    'color',
    'text-align',
    'font-style',
    'text-shadow',
    'text-overflow',
    'white-space',
    'word-spacing',
    'word-break',
    'word-wrap',
    'text-indent'
  ],

  // Elements to analyze
  elements: [
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'a', 'span', 'li', 'blockquote',
    'label', 'button', 'input', 'textarea',
    'th', 'td', 'caption', 'figcaption',
    '.btn', '.button', '.cta', '.link',
    'strong', 'em', 'small', 'code', 'pre',
    'article', 'section', 'header', 'footer',
    'nav', 'aside', 'main', 'div.content',
    '.title', '.subtitle', '.heading', '.subheading',
    '.text', '.body-text', '.caption', '.description',
    '.menu-item', '.nav-link', '.footer-link'
  ],

  // Media queries to check
  mediaQueries: [
    '(min-width: 1400px)',
    '(min-width: 1200px) and (max-width: 1399px)',
    '(min-width: 992px) and (max-width: 1199px)',
    '(min-width: 768px) and (max-width: 991px)',
    '(min-width: 576px) and (max-width: 767px)',
    '(max-width: 575px)'
  ],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,
};

/**
 * Extract typography styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Object>} - Typography styles
 */
async function extractTypography(page) {
  return page.evaluate((config) => {
    const styles = {};

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element, mediaQuery = null) {
      const styleObj = {};
      const computedStyle = window.getComputedStyle(element);

      // Extract only typography-related properties
      for (const prop of config.cssProperties) {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0px' && value !== 'auto') {
          styleObj[prop] = value;
        }
      }

      return Object.keys(styleObj).length > 0 ? styleObj : null;
    }

    // Process each element
    for (const selector of config.elements) {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) continue;

      styles[selector] = [];

      // Sample up to 5 elements of each type to avoid too much data
      const sampleSize = Math.min(elements.length, 5);
      for (let i = 0; i < sampleSize; i++) {
        const element = elements[i];
        const elementStyles = getComputedStyleForElement(element);

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

    return styles;
  }, config);
}

/**
 * Main function to extract typography from crawled pages
 */
async function extractTypographyFromCrawledPages() {
  console.log('Starting typography extraction...');

  // Read crawl results
  if (!fs.existsSync(config.inputFile)) {
    console.error(`Input file not found: ${config.inputFile}`);
    process.exit(1);
  }

  const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
  const pages = crawlResults.crawledPages.filter(page => page.status === 200);

  // Limit the number of pages if needed
  const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

  console.log(`Analyzing typography on ${pagesToAnalyze.length} pages...`);

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
    typographyStyles: {},
    // Add collections for summary data
    allFontFamilies: new Set(),
    allFontSizes: new Set(),
    allFontWeights: new Set(),
    allLineHeights: new Set(),
    allLetterSpacings: new Set(),
    // Add maps to track which selectors use each property
    fontSizeSelectors: {},
    fontFamilySelectors: {},
    fontWeightSelectors: {},
    lineHeightSelectors: {},
    letterSpacingSelectors: {},
    // CSS variables
    cssVars: {}
  };

  // Analyze each page
  for (let i = 0; i < pagesToAnalyze.length; i++) {
    const pageInfo = pagesToAnalyze[i];
    console.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

    try {
      // Navigate to the page
      await page.goto(pageInfo.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Extract typography
      const typography = await extractTypography(page);

      // Add to results
      results.pagesAnalyzed.push({
        url: pageInfo.url,
        title: pageInfo.title
      });

      // Merge typography styles
      for (const selector in typography) {
        if (!results.typographyStyles[selector]) {
          results.typographyStyles[selector] = [];
        }

        // Add unique styles only
        for (const style of typography[selector]) {
          // Check if this style is already in the results
          const isDuplicate = results.typographyStyles[selector].some(existingStyle => {
            return JSON.stringify(existingStyle.styles) === JSON.stringify(style.styles);
          });

          if (!isDuplicate) {
            results.typographyStyles[selector].push(style);

            // Extract and collect typography properties for summary
            const styles = style.styles;

            // Track font-family and its selectors
            if (styles['font-family']) {
              const fontFamily = styles['font-family'];
              results.allFontFamilies.add(fontFamily);

              // Initialize array for this font family if it doesn't exist
              if (!results.fontFamilySelectors[fontFamily]) {
                results.fontFamilySelectors[fontFamily] = [];
              }

              // Add selector if not already tracked
              if (!results.fontFamilySelectors[fontFamily].includes(selector)) {
                results.fontFamilySelectors[fontFamily].push(selector);
              }
            }

            // Track font-size and its selectors
            if (styles['font-size']) {
              const fontSize = styles['font-size'];
              results.allFontSizes.add(fontSize);

              // Initialize array for this font size if it doesn't exist
              if (!results.fontSizeSelectors[fontSize]) {
                results.fontSizeSelectors[fontSize] = [];
              }

              // Add selector if not already tracked
              if (!results.fontSizeSelectors[fontSize].includes(selector)) {
                results.fontSizeSelectors[fontSize].push(selector);
              }
            }

            // Track font-weight and its selectors
            if (styles['font-weight']) {
              const fontWeight = styles['font-weight'];
              results.allFontWeights.add(fontWeight);

              // Initialize array for this font weight if it doesn't exist
              if (!results.fontWeightSelectors[fontWeight]) {
                results.fontWeightSelectors[fontWeight] = [];
              }

              // Add selector if not already tracked
              if (!results.fontWeightSelectors[fontWeight].includes(selector)) {
                results.fontWeightSelectors[fontWeight].push(selector);
              }
            }

            // Track line-height and its selectors
            if (styles['line-height']) {
              const lineHeight = styles['line-height'];
              results.allLineHeights.add(lineHeight);

              // Initialize array for this line height if it doesn't exist
              if (!results.lineHeightSelectors[lineHeight]) {
                results.lineHeightSelectors[lineHeight] = [];
              }

              // Add selector if not already tracked
              if (!results.lineHeightSelectors[lineHeight].includes(selector)) {
                results.lineHeightSelectors[lineHeight].push(selector);
              }
            }

            // Track letter-spacing and its selectors
            if (styles['letter-spacing']) {
              const letterSpacing = styles['letter-spacing'];
              results.allLetterSpacings.add(letterSpacing);

              // Initialize array for this letter spacing if it doesn't exist
              if (!results.letterSpacingSelectors[letterSpacing]) {
                results.letterSpacingSelectors[letterSpacing] = [];
              }

              // Add selector if not already tracked
              if (!results.letterSpacingSelectors[letterSpacing].includes(selector)) {
                results.letterSpacingSelectors[letterSpacing].push(selector);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error analyzing ${pageInfo.url}:`, error.message);
    }
  }

  // Convert Sets to Arrays for JSON serialization
  results.allFontFamilies = Array.from(results.allFontFamilies);
  results.allFontSizes = Array.from(results.allFontSizes);
  results.allFontWeights = Array.from(results.allFontWeights);
  results.allLineHeights = Array.from(results.allLineHeights);

  // Save results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  console.log('\nTypography extraction completed!');
  console.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
  console.log(`Font families found: ${results.allFontFamilies.size}`);
  console.log(`Font sizes found: ${results.allFontSizes.size}`);
  console.log(`Font weights found: ${results.allFontWeights.size}`);
  console.log(`Line heights found: ${results.allLineHeights.size}`);
  console.log(`Letter spacings found: ${results.allLetterSpacings.size}`);
  console.log(`Results saved to: ${config.outputFile}`);

  // Close browser
  await browser.close();

  return results;
}

// Run the extractor if this script is run directly
if (require.main === module) {
  extractTypographyFromCrawledPages().catch(error => {
    console.error('Typography extraction failed:', error);
    process.exit(1);
  });
}

/**
 * Extract typography from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL of the page
 * @returns {Promise<Object>} - Typography data
 */
async function extractTypographyFromPage(page, url) {
  try {
    // Navigate to the page if URL is provided
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Extract typography
    const typography = await extractTypography(page);

    // Create result object with the same structure as the main function
    const result = {
      allFontFamilies: new Set(),
      allFontSizes: new Set(),
      allFontWeights: new Set(),
      allLineHeights: new Set(),
      allLetterSpacings: new Set(),
      cssVars: {},
      typographyStyles: {}
    };

    // Process typography data
    for (const selector in typography) {
      result.typographyStyles[selector] = typography[selector];

      // Extract and collect typography properties
      for (const style of typography[selector]) {
        const styles = style.styles;

        // Track font properties
        if (styles['font-family']) {
          result.allFontFamilies.add(styles['font-family']);
        }

        if (styles['font-size']) {
          result.allFontSizes.add(styles['font-size']);
        }

        if (styles['font-weight']) {
          result.allFontWeights.add(styles['font-weight']);
        }

        if (styles['line-height']) {
          result.allLineHeights.add(styles['line-height']);
        }

        if (styles['letter-spacing']) {
          result.allLetterSpacings.add(styles['letter-spacing']);
        }
      }
    }

    // Convert Sets to Arrays for easier serialization
    return {
      allFontFamilies: Array.from(result.allFontFamilies),
      allFontSizes: Array.from(result.allFontSizes),
      allFontWeights: Array.from(result.allFontWeights),
      allLineHeights: Array.from(result.allLineHeights),
      allLetterSpacings: Array.from(result.allLetterSpacings),
      cssVars: result.cssVars,
      typographyStyles: result.typographyStyles
    };
  } catch (error) {
    console.error(`Error extracting typography from page: ${error.message}`);
    return {
      allFontFamilies: [],
      allFontSizes: [],
      allFontWeights: [],
      allLineHeights: [],
      allLetterSpacings: [],
      cssVars: {},
      typographyStyles: {}
    };
  }
}

// Export the functions for use in other scripts
module.exports = {
  extractTypographyFromCrawledPages,
  extractTypographyFromPage
};
