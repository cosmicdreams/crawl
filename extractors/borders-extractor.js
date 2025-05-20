/**
 * Borders CSS Extractor
 * - Extracts border-related CSS properties from the site
 */

/**
 * Extract border information from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Object} Border data
 */
async function extractBorders(page) {
  return await page.evaluate(() => {
    const borders = {
      widths: new Set(),
      styles: new Set(),
      colors: new Set(),
      radiuses: new Set(),
      shadows: new Set(),
      complete: [] // Will store complete border definitions
    };

    // Function to normalize values
    const normalizeValue = (value) => {
      if (!value || value === 'none' || value === '0px' || value === '0' ||
          value === 'inherit' || value === 'initial') return null;
      return value;
    };

    // Extract border properties from all loaded stylesheets
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.style) {
              // Border width
              ['border-width', 'border-top-width', 'border-right-width',
               'border-bottom-width', 'border-left-width'].forEach(prop => {
                const hyphenProp = prop;
                const camelProp = hyphenProp.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                if (rule.style[camelProp]) {
                  const value = normalizeValue(rule.style[camelProp]);
                  if (value) borders.widths.add(value);
                }
              });

              // Border style
              ['border-style', 'border-top-style', 'border-right-style',
               'border-bottom-style', 'border-left-style'].forEach(prop => {
                const hyphenProp = prop;
                const camelProp = hyphenProp.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                if (rule.style[camelProp]) {
                  const value = normalizeValue(rule.style[camelProp]);
                  if (value) borders.styles.add(value);
                }
              });

              // Border color
              ['border-color', 'border-top-color', 'border-right-color',
               'border-bottom-color', 'border-left-color'].forEach(prop => {
                const hyphenProp = prop;
                const camelProp = hyphenProp.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                if (rule.style[camelProp]) {
                  const value = normalizeValue(rule.style[camelProp]);
                  if (value) borders.colors.add(value);
                }
              });

              // Border radius
              ['border-radius', 'border-top-left-radius', 'border-top-right-radius',
               'border-bottom-right-radius', 'border-bottom-left-radius'].forEach(prop => {
                const hyphenProp = prop;
                const camelProp = hyphenProp.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

                if (rule.style[camelProp]) {
                  const value = normalizeValue(rule.style[camelProp]);
                  if (value) borders.radiuses.add(value);
                }
              });

              // Box shadow
              if (rule.style.boxShadow) {
                const value = normalizeValue(rule.style.boxShadow);
                if (value) borders.shadows.add(value);
              }

              // Complete border definitions
              if (rule.style.border) {
                const value = normalizeValue(rule.style.border);
                if (value) borders.complete.push(value);
              }
            }
          });
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      });
    } catch (e) {
      console.error('Error processing stylesheets:', e);
    }

    // Extract from common elements that often have borders
    const borderElements = [
      'button', '.button', '.btn', 'input', 'select', 'textarea',
      '.card', '.box', '.panel', '.border', 'table', 'th', 'td',
      'img', 'figure', '.alert', '.notification', '.message'
    ];

    borderElements.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const style = window.getComputedStyle(element);

          // Border width
          if (style.borderWidth && style.borderWidth !== '0px') {
            borders.widths.add(style.borderWidth);
          }

          // Border style
          if (style.borderStyle && style.borderStyle !== 'none') {
            borders.styles.add(style.borderStyle);
          }

          // Border color
          if (style.borderColor) {
            borders.colors.add(style.borderColor);
          }

          // Border radius
          if (style.borderRadius && style.borderRadius !== '0px') {
            borders.radiuses.add(style.borderRadius);
          }

          // Box shadow
          if (style.boxShadow && style.boxShadow !== 'none') {
            borders.shadows.add(style.boxShadow);
          }

          // Complete border
          if (style.border && style.border !== 'none') {
            borders.complete.push(style.border);
          }
        });
      } catch (e) {
        console.error(`Error processing ${selector}:`, e);
      }
    });

    // Convert Sets to Arrays for JSON serialization
    return {
      widths: [...borders.widths],
      styles: [...borders.styles],
      colors: [...borders.colors],
      radiuses: [...borders.radiuses],
      shadows: [...borders.shadows],
      complete: borders.complete
    };
  });
}

export { extractBorders };
