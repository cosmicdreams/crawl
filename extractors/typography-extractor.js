/**
 * Typography CSS Extractor
 * - Extracts typography-related CSS properties from the site
 */
import { JSDOM } from 'jsdom';

/**
 * Extract typography information from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Object} Typography data
 */
async function extractTypography(page) {
  return await page.evaluate(() => {
    const typography = {
      fontFamilies: new Set(),
      headings: {
        h1: {},
        h2: {},
        h3: {},
        h4: {},
        h5: {},
        h6: {}
      },
      bodyText: {},
      links: {
        normal: {},
        hover: {},
        active: {},
        visited: {}
      },
      fontSizes: new Set(),
      fontWeights: new Set(),
      lineHeights: new Set()
    };

    // Extract font families from all loaded stylesheets
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.style && rule.style.fontFamily) {
              typography.fontFamilies.add(rule.style.fontFamily.trim());
            }

            // Collect font sizes
            if (rule.style && rule.style.fontSize) {
              typography.fontSizes.add(rule.style.fontSize);
            }

            // Collect font weights
            if (rule.style && rule.style.fontWeight) {
              typography.fontWeights.add(rule.style.fontWeight);
            }

            // Collect line heights
            if (rule.style && rule.style.lineHeight) {
              typography.lineHeights.add(rule.style.lineHeight);
            }
          });
        } catch (e) {
          // Skip cross-origin stylesheets
        }
      });
    } catch (e) {
      console.error('Error processing stylesheets:', e);
    }

    // Extract heading styles by sampling actual elements
    const extractHeadingStyles = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;

      const styles = window.getComputedStyle(element);
      return {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        color: styles.color,
        marginTop: styles.marginTop,
        marginBottom: styles.marginBottom
      };
    };

    // Get styles for all heading levels
    for (let i = 1; i <= 6; i++) {
      const headingStyle = extractHeadingStyles(`h${i}`);
      if (headingStyle) {
        typography.headings[`h${i}`] = headingStyle;
      }
    }

    // Extract body text styles
    const bodyTextElement = document.querySelector('p');
    if (bodyTextElement) {
      const styles = window.getComputedStyle(bodyTextElement);
      typography.bodyText = {
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        lineHeight: styles.lineHeight,
        color: styles.color
      };
    }

    // Extract link styles
    const linkElement = document.querySelector('a');
    if (linkElement) {
      const styles = window.getComputedStyle(linkElement);
      typography.links.normal = {
        color: styles.color,
        textDecoration: styles.textDecoration
      };

      // We can't actually get hover, active, visited states via JS
      // Would need to parse the CSS rules instead
    }

    // Convert Sets to Arrays for JSON serialization
    return {
      ...typography,
      fontFamilies: [...typography.fontFamilies],
      fontSizes: [...typography.fontSizes],
      fontWeights: [...typography.fontWeights],
      lineHeights: [...typography.lineHeights]
    };
  });
}

export { extractTypography };
