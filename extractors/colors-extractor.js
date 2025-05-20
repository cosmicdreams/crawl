/**
 * Colors CSS Extractor
 * - Extracts color-related CSS properties from the site
 */

/**
 * Extract color information from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @returns {Object} Color data
 */
async function extractColors(page) {
  return await page.evaluate(() => {
    const colors = {
      background: new Set(),
      text: new Set(),
      border: new Set(),
      link: new Set(),
      button: new Set(),
      accent: new Set(),
      all: new Set()
    };

    // Function to normalize colors to hex format
    const normalizeColor = (color) => {
      if (!color || color === 'transparent' || color === 'inherit' || color === 'initial') return null;

      // Create a temporary element to compute RGB values
      const tempEl = document.createElement('div');
      tempEl.style.color = color;
      document.body.appendChild(tempEl);
      const computedColor = window.getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);

      // Convert rgb(r, g, b) to hex
      const rgbMatch = computedColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/i);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(rgbMatch[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(rgbMatch[3], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }

      // Convert rgba(r, g, b, a) to hex
      const rgbaMatch = computedColor.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/i);
      if (rgbaMatch) {
        const r = parseInt(rgbaMatch[1], 10).toString(16).padStart(2, '0');
        const g = parseInt(rgbaMatch[2], 10).toString(16).padStart(2, '0');
        const b = parseInt(rgbaMatch[3], 10).toString(16).padStart(2, '0');
        // Ignore alpha for now
        return `#${r}${g}${b}`;
      }

      return color;
    };

    // Extract colors from all loaded stylesheets
    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          Array.from(sheet.cssRules).forEach(rule => {
            if (rule.style) {
              // Background colors
              if (rule.style.backgroundColor) {
                const color = normalizeColor(rule.style.backgroundColor);
                if (color) {
                  colors.background.add(color);
                  colors.all.add(color);
                }
              }

              // Text colors
              if (rule.style.color) {
                const color = normalizeColor(rule.style.color);
                if (color) {
                  colors.text.add(color);
                  colors.all.add(color);
                }
              }

              // Border colors
              if (rule.style.borderColor) {
                const color = normalizeColor(rule.style.borderColor);
                if (color) {
                  colors.border.add(color);
                  colors.all.add(color);
                }
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

    // Look for specific elements to get their colors

    // Links
    const links = document.querySelectorAll('a');
    links.forEach(link => {
      const style = window.getComputedStyle(link);
      const color = normalizeColor(style.color);
      if (color) {
        colors.link.add(color);
        colors.all.add(color);
      }
    });

    // Buttons
    const buttons = document.querySelectorAll('button, .button, [class*="btn"]');
    buttons.forEach(button => {
      const style = window.getComputedStyle(button);
      const bgColor = normalizeColor(style.backgroundColor);
      const textColor = normalizeColor(style.color);

      if (bgColor) {
        colors.button.add(bgColor);
        colors.all.add(bgColor);
      }

      if (textColor) {
        colors.button.add(textColor);
        colors.all.add(textColor);
      }
    });

    // Find accent colors (look for brand elements, headers, or specially styled containers)
    const potentialAccentElements = document.querySelectorAll(
      'header, .header, nav, .navigation, .brand, .logo, .highlight, .accent, .primary, .secondary'
    );

    potentialAccentElements.forEach(element => {
      const style = window.getComputedStyle(element);
      const bgColor = normalizeColor(style.backgroundColor);
      const textColor = normalizeColor(style.color);
      const borderColor = normalizeColor(style.borderColor);

      if (bgColor && bgColor !== '#ffffff' && bgColor !== '#000000') {
        colors.accent.add(bgColor);
        colors.all.add(bgColor);
      }

      if (textColor && textColor !== '#ffffff' && textColor !== '#000000') {
        colors.accent.add(textColor);
        colors.all.add(textColor);
      }

      if (borderColor && borderColor !== '#ffffff' && borderColor !== '#000000') {
        colors.accent.add(borderColor);
        colors.all.add(borderColor);
      }
    });

    // Convert Sets to Arrays for JSON serialization
    return {
      background: [...colors.background],
      text: [...colors.text],
      border: [...colors.border],
      link: [...colors.link],
      button: [...colors.button],
      accent: [...colors.accent],
      all: [...colors.all]
    };
  });
}

export { extractColors };
