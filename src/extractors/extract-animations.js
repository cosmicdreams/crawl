// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * Animations extractor using Playwright
 * This script extracts animation and transition styles from the crawled pages
 */

// Configuration
const config = {
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
  screenshotsDir: path.join(__dirname, '../../results/screenshots/animations')
};

/**
 * Extract animation and transition styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Promise<Object>} - Animation and transition styles
 */
async function extractAnimations(page) {
  return page.evaluate((config) => {
    const styles = {};
    const animationValues = {
      durations: new Set(),
      timingFunctions: new Set(),
      delays: new Set(),
      keyframes: {}
    };

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element, selector) {
      const styleObj = {};
      const computedStyle = window.getComputedStyle(element);

      // Extract only animation and transition related properties
      for (const prop of config.cssProperties) {
        const value = computedStyle.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== '0s' && value !== 'auto') {
          styleObj[prop] = value;

          // Categorize values
          if (prop.includes('duration')) {
            animationValues.durations.add(value);
          } else if (prop.includes('timing-function')) {
            animationValues.timingFunctions.add(value);
          } else if (prop.includes('delay')) {
            animationValues.delays.add(value);
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

    // Extract keyframe animations from stylesheets
    const styleSheets = Array.from(document.styleSheets);

    try {
      for (const sheet of styleSheets) {
        try {
          const rules = Array.from(sheet.cssRules || sheet.rules || []);
          for (const rule of rules) {
            // Check for keyframe rules
            if (rule.type === CSSRule.KEYFRAMES_RULE) {
              const keyframeName = rule.name;
              const keyframes = [];

              // Extract keyframes
              for (let i = 0; i < rule.cssRules.length; i++) {
                const keyframeRule = rule.cssRules[i];
                keyframes.push({
                  keyText: keyframeRule.keyText,
                  properties: Array.from(keyframeRule.style).reduce((obj, prop) => {
                    obj[prop] = keyframeRule.style.getPropertyValue(prop);
                    return obj;
                  }, {})
                });
              }

              animationValues.keyframes[keyframeName] = keyframes;
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

    // Also look for CSS custom properties related to animations
    const cssVars = {};

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
                    (prop.includes('animation') || prop.includes('transition') ||
                     prop.includes('duration') || prop.includes('timing') ||
                     prop.includes('delay') || prop.includes('ease'))) {
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
      durations: Array.from(animationValues.durations),
      timingFunctions: Array.from(animationValues.timingFunctions),
      delays: Array.from(animationValues.delays),
      keyframes: animationValues.keyframes,
      cssVars
    };
  }, config);
}

/**
 * Main function to extract animations from crawled pages
 */
async function extractAnimationsFromCrawledPages() {
  console.log('Starting animations extraction...');

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

  console.log(`Analyzing animations on ${pagesToAnalyze.length} pages...`);

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
    animationStyles: {},
    allDurations: [],
    allTimingFunctions: [],
    allDelays: [],
    keyframes: {},
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

      // Extract animations
      const animations = await extractAnimations(page);

      // Add to results
      results.pagesAnalyzed.push({
        url: pageInfo.url,
        title: pageInfo.title
      });

      // Merge animation styles
      for (const selector in animations.elementStyles) {
        if (!results.animationStyles[selector]) {
          results.animationStyles[selector] = [];
        }

        // Add unique styles only
        for (const style of animations.elementStyles[selector]) {
          // Check if this style is already in the results
          const isDuplicate = results.animationStyles[selector].some(existingStyle => {
            return JSON.stringify(existingStyle.styles) === JSON.stringify(style.styles);
          });

          if (!isDuplicate) {
            results.animationStyles[selector].push(style);
          }
        }
      }

      // Merge animation values
      results.allDurations = [...new Set([...results.allDurations, ...animations.durations])];
      results.allTimingFunctions = [...new Set([...results.allTimingFunctions, ...animations.timingFunctions])];
      results.allDelays = [...new Set([...results.allDelays, ...animations.delays])];

      // Merge keyframes
      Object.assign(results.keyframes, animations.keyframes);

      // Merge CSS vars
      Object.assign(results.cssVars, animations.cssVars);
    } catch (error) {
      console.error(`Error analyzing ${pageInfo.url}:`, error.message);
    }
  }

  // Sort durations
  results.allDurations.sort((a, b) => {
    const aValue = parseFloat(a);
    const bValue = parseFloat(b);
    return aValue - bValue;
  });

  // Generate animation visualization
  await generateAnimationVisualization(page, results);

  // Save results to file
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

  console.log('\nAnimations extraction completed!');
  console.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
  console.log(`Durations found: ${results.allDurations.length}`);
  console.log(`Timing functions found: ${results.allTimingFunctions.length}`);
  console.log(`Delays found: ${results.allDelays.length}`);
  console.log(`Keyframe animations found: ${Object.keys(results.keyframes).length}`);
  console.log(`Results saved to: ${config.outputFile}`);

  // Close browser
  await browser.close();

  return results;
}

/**
 * Generate animation visualization for the report
 * @param {import('playwright').Page} page - Playwright page
 * @param {Object} results - Extraction results
 */
async function generateAnimationVisualization(page, results) {
  // Create a simple HTML page with animation visualizations
  const visualizationHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Animation Visualization</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .section { margin-bottom: 40px; }
        h2 { margin-bottom: 20px; }

        .duration-container, .timing-container {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }

        .duration-item, .timing-item {
          width: 100px;
          height: 100px;
          background-color: #6200ee;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          position: relative;
        }

        .duration-item {
          animation: pulse infinite alternate;
        }

        .timing-item {
          transition: transform 1s;
        }

        .timing-item:hover {
          transform: scale(1.1);
        }

        @keyframes pulse {
          from { opacity: 0.7; }
          to { opacity: 1; }
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
        <h2>Animation Durations</h2>
        <div class="duration-container">
          ${results.allDurations.slice(0, 10).map(duration => `
            <div>
              <div class="duration-item" style="animation-duration: ${duration};">
                ${duration}
              </div>
              <div class="label">${duration}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Timing Functions</h2>
        <div class="timing-container">
          ${results.allTimingFunctions.slice(0, 10).map(timing => `
            <div>
              <div class="timing-item" style="transition-timing-function: ${timing};">
                Hover
              </div>
              <div class="label">${timing}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <h2>Keyframe Animations</h2>
        <div class="keyframes-container">
          ${Object.keys(results.keyframes).slice(0, 5).map(name => `
            <div>
              <h3>${name}</h3>
              <pre>${JSON.stringify(results.keyframes[name], null, 2)}</pre>
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
    path: path.join(config.screenshotsDir, 'animation-visualization.png'),
    fullPage: true
  });
}

// If this script is run directly, execute the extraction
if (require.main === module) {
  extractAnimationsFromCrawledPages().catch(error => {
    console.error('Animations extraction failed:', error);
    process.exit(1);
  });
}

// Export the function for use in other scripts
module.exports = { extractAnimationsFromCrawledPages };
