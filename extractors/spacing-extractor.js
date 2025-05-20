/**
 * Spacing CSS Extractor
 * - Extracts spacing-related CSS properties from the site
 */

/**
 * Extract spacing information from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Object} Spacing data
 */
async function extractSpacing(page) {
  return await page.evaluate(() => {
    const spacing = {
      margins: new Set(),
      paddings: new Set(),
      gaps: new Set(),
      gridSpacing: new Set()
    };

    // Function to normalize spacing values
    const normalizeSpacing = (value) => {
      if (!value || value === '0px' || value === '0' || value === 'auto' || value === 'inherit' || value === 'initial') return null;
      return value;
    };

    // Extract spacing from all loaded stylesheets
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.style) {
              // Margins
              ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'].forEach(prop => {
                if (rule.style[prop]) {
                  const value = normalizeSpacing(rule.style[prop]);
                  if (value) spacing.margins.add(value);
                }
              });

              // Paddings
              ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach(prop => {
                if (rule.style[prop]) {
                  const value = normalizeSpacing(rule.style[prop]);
                  if (value) spacing.paddings.add(value);
                }
              });

              // Gaps
              if (rule.style.gap) {
                const value = normalizeSpacing(rule.style.gap);
                if (value) spacing.gaps.add(value);
              }

              // Grid spacing
              ['gridRowGap', 'gridColumnGap', 'rowGap', 'columnGap'].forEach(prop => {
                if (rule.style[prop]) {
                  const value = normalizeSpacing(rule.style[prop]);
                  if (value) spacing.gridSpacing.add(value);
                }
              });
            }
          });
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      });
    } catch (e) {
      console.error('Error processing stylesheets:', e);
    }

    // Extract spacing from common elements
    const commonElements = [
      'main', 'section', 'article', 'div', 'header', 'footer',
      'nav', 'aside', '.container', '.wrapper', '.content'
    ];

    commonElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const style = window.getComputedStyle(element);

        // Extract margins
        const margin = normalizeSpacing(style.margin);
        const marginTop = normalizeSpacing(style.marginTop);
        const marginRight = normalizeSpacing(style.marginRight);
        const marginBottom = normalizeSpacing(style.marginBottom);
        const marginLeft = normalizeSpacing(style.marginLeft);

        if (margin) spacing.margins.add(margin);
        if (marginTop) spacing.margins.add(marginTop);
        if (marginRight) spacing.margins.add(marginRight);
        if (marginBottom) spacing.margins.add(marginBottom);
        if (marginLeft) spacing.margins.add(marginLeft);

        // Extract paddings
        const padding = normalizeSpacing(style.padding);
        const paddingTop = normalizeSpacing(style.paddingTop);
        const paddingRight = normalizeSpacing(style.paddingRight);
        const paddingBottom = normalizeSpacing(style.paddingBottom);
        const paddingLeft = normalizeSpacing(style.paddingLeft);

        if (padding) spacing.paddings.add(padding);
        if (paddingTop) spacing.paddings.add(paddingTop);
        if (paddingRight) spacing.paddings.add(paddingRight);
        if (paddingBottom) spacing.paddings.add(paddingBottom);
        if (paddingLeft) spacing.paddings.add(paddingLeft);

        // Extract gaps
        const gap = normalizeSpacing(style.gap);
        if (gap) spacing.gaps.add(gap);
      });
    });

    // Convert Sets to Arrays and sort them numerically if possible
    const sortNumeric = (values) => {
      return [...values].sort((a, b) => {
        // Extract numeric values for comparison
        const numA = parseFloat(a);
        const numB = parseFloat(b);

        if (isNaN(numA) || isNaN(numB)) {
          return a.localeCompare(b);
        }

        return numA - numB;
      });
    };

    return {
      margins: sortNumeric(spacing.margins),
      paddings: sortNumeric(spacing.paddings),
      gaps: sortNumeric(spacing.gaps),
      gridSpacing: sortNumeric(spacing.gridSpacing)
    };
  });
}

export { extractSpacing };
