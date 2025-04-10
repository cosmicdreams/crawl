// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Design token generator
 * This script generates design tokens from the extracted data
 */

// Configuration
const config = {
  // Input files
  inputFiles: {
    typography: path.join(__dirname, '../../results/raw/typography-analysis.json'),
    colors: path.join(__dirname, '../../results/raw/color-analysis.json'),
    spacing: path.join(__dirname, '../../results/raw/spacing-analysis.json'),
    borders: path.join(__dirname, '../../results/raw/borders-analysis.json'),
    animations: path.join(__dirname, '../../results/raw/animations-analysis.json')
  },

  // Output files
  outputFiles: {
    css: {
      variables: path.join(__dirname, '../../results/css/variables.css'),
      typography: path.join(__dirname, '../../results/css/typography.css'),
      colors: path.join(__dirname, '../../results/css/colors.css'),
      spacing: path.join(__dirname, '../../results/css/spacing.css'),
      borders: path.join(__dirname, '../../results/css/borders.css'),
      animations: path.join(__dirname, '../../results/css/animations.css')
    },
    tokens: {
      json: path.join(__dirname, '../../results/tokens/tokens.json'),
      figma: path.join(__dirname, '../../results/tokens/figma-tokens.json')
    }
  }
};

/**
 * Generate typography tokens from extracted data
 * @param {Object} typographyData - Extracted typography data
 * @returns {Object} Typography tokens
 */
function generateTypographyTokens(typographyData) {
  if (!typographyData) {
    console.warn('No typography data available');
    return {};
  }

  console.log('Generating typography tokens...');

  const tokens = {
    fontFamily: {},
    fontSize: {},
    fontWeight: {},
    lineHeight: {},
    letterSpacing: {},
    textTransform: {}
  };

  // Extract font families
  if (typographyData.allFontFamilies && typographyData.allFontFamilies.length > 0) {
    console.log(`Processing ${typographyData.allFontFamilies.length} font families`);
    // Process font families
    typographyData.allFontFamilies.forEach((family, index) => {
      // Clean up font family name
      const cleanName = family.replace(/['",]/g, '').trim();
      const nameParts = cleanName.split(/\s+/);

      // Generate a token name
      let tokenName;
      if (nameParts.length === 1) {
        tokenName = nameParts[0].toLowerCase();
      } else {
        // For multi-word font families, use the first word or a descriptive name
        tokenName = nameParts[0].toLowerCase();

        // Check if it's a common font family pattern
        if (cleanName.toLowerCase().includes('sans')) {
          tokenName = 'sans';
        } else if (cleanName.toLowerCase().includes('serif')) {
          tokenName = 'serif';
        } else if (cleanName.toLowerCase().includes('mono')) {
          tokenName = 'mono';
        }
      }

      // Add a number if this token name already exists
      if (tokens.fontFamily[tokenName]) {
        tokenName = `${tokenName}-${index + 1}`;
      }

      tokens.fontFamily[tokenName] = family;
    });
  }

  // Extract font sizes
  if (typographyData.allFontSizes && typographyData.allFontSizes.length > 0) {
    console.log(`Processing ${typographyData.allFontSizes.length} font sizes`);
    // Sort font sizes numerically
    const sortedSizes = [...typographyData.allFontSizes].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process font sizes
    sortedSizes.forEach((size, index) => {
      // Generate a token name based on its position in the scale
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = typographyData.cssVars ?
        Object.entries(typographyData.cssVars).find(([name, value]) => value === size) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/font-size-/i, '');
      } else {
        // Use a numeric scale
        tokenName = index + 1;
      }

      tokens.fontSize[tokenName] = size;
    });
  }

  // Extract font weights
  if (typographyData.allFontWeights && typographyData.allFontWeights.length > 0) {
    console.log(`Processing ${typographyData.allFontWeights.length} font weights`);
    // Common font weight names
    const weightNames = {
      '100': 'thin',
      '200': 'extra-light',
      '300': 'light',
      '400': 'regular',
      '500': 'medium',
      '600': 'semibold',
      '700': 'bold',
      '800': 'extra-bold',
      '900': 'black'
    };

    // Process font weights
    typographyData.allFontWeights.forEach(weight => {
      // Clean up the weight value
      const cleanWeight = weight.trim();

      // Generate a token name
      let tokenName;
      if (weightNames[cleanWeight]) {
        tokenName = weightNames[cleanWeight];
      } else {
        tokenName = cleanWeight;
      }

      tokens.fontWeight[tokenName] = cleanWeight;
    });
  }

  // Extract line heights
  if (typographyData.allLineHeights && typographyData.allLineHeights.length > 0) {
    // Sort line heights numerically
    const sortedLineHeights = [...typographyData.allLineHeights].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process line heights
    sortedLineHeights.forEach((lineHeight, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = typographyData.cssVars ?
        Object.entries(typographyData.cssVars).find(([name, value]) => value === lineHeight) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/line-height-/i, '');
      } else {
        // Use a numeric scale
        tokenName = index + 1;
      }

      tokens.lineHeight[tokenName] = lineHeight;
    });
  }

  // Extract letter spacing
  if (typographyData.allLetterSpacings && typographyData.allLetterSpacings.length > 0) {
    // Sort letter spacings numerically
    const sortedSpacings = [...typographyData.allLetterSpacings].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process letter spacings
    sortedSpacings.forEach((spacing, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = typographyData.cssVars ?
        Object.entries(typographyData.cssVars).find(([name, value]) => value === spacing) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/letter-spacing-/i, '');
      } else {
        // Use a descriptive name based on the value
        if (parseFloat(spacing) === 0) {
          tokenName = 'normal';
        } else if (parseFloat(spacing) < 0) {
          tokenName = `tight-${index + 1}`;
        } else {
          tokenName = `wide-${index + 1}`;
        }
      }

      tokens.letterSpacing[tokenName] = spacing;
    });
  }

  // Extract text transforms
  if (typographyData.allTextTransforms && typographyData.allTextTransforms.length > 0) {
    // Process text transforms
    typographyData.allTextTransforms.forEach(transform => {
      // Clean up the transform value
      const cleanTransform = transform.trim();

      // Generate a token name
      const tokenName = cleanTransform;

      tokens.textTransform[tokenName] = cleanTransform;
    });
  }

  return tokens;
}

/**
 * Generate color tokens from extracted data
 * @param {Object} colorData - Extracted color data
 * @returns {Object} Color tokens
 */
function generateColorTokens(colorData) {
  if (!colorData) {
    console.warn('No color data available');
    return {};
  }

  console.log('Generating color tokens...');

  const tokens = {
    primary: {},
    secondary: {},
    neutral: {},
    accent: {},
    semantic: {}
  };

  // Helper function to determine if a color is light or dark
  function isLightColor(color) {
    // Convert hex to RGB
    let r, g, b;

    if (color.startsWith('#')) {
      // Handle hex colors
      const hex = color.substring(1);
      if (hex.length === 3) {
        r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
        g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
        b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      } else {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
    } else if (color.startsWith('rgb')) {
      // Handle rgb/rgba colors
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        r = parseInt(matches[0]);
        g = parseInt(matches[1]);
        b = parseInt(matches[2]);
      } else {
        return true; // Default to light if parsing fails
      }
    } else {
      return true; // Default to light for unknown formats
    }

    // Calculate perceived brightness using the formula: (0.299*R + 0.587*G + 0.114*B)
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return true if the color is light (brightness > 0.5)
    return brightness > 0.5;
  }

  // Helper function to categorize colors
  function categorizeColor(color) {
    // Check if we have CSS variables that might give us better categorization
    if (colorData.cssVars) {
      const matchingVar = Object.entries(colorData.cssVars).find(([name, value]) => value === color);
      if (matchingVar) {
        const varName = matchingVar[0].toLowerCase();

        if (varName.includes('primary')) return 'primary';
        if (varName.includes('secondary')) return 'secondary';
        if (varName.includes('accent')) return 'accent';
        if (varName.includes('success') || varName.includes('error') ||
            varName.includes('warning') || varName.includes('info')) return 'semantic';
        if (varName.includes('gray') || varName.includes('grey') ||
            varName.includes('black') || varName.includes('white')) return 'neutral';
      }
    }

    // Default categorization based on color properties
    if (color === '#000000' || color === '#ffffff' ||
        color === 'rgb(0, 0, 0)' || color === 'rgb(255, 255, 255)' ||
        color.includes('rgba(0, 0, 0,') || color.includes('rgba(255, 255, 255,')) {
      return 'neutral';
    }

    // Check if it's a grayscale color
    if (color.startsWith('#')) {
      const hex = color.substring(1);
      if (hex.length === 6) {
        const r = hex.substring(0, 2);
        const g = hex.substring(2, 4);
        const b = hex.substring(4, 6);

        // If R, G, and B values are close to each other, it's likely a gray
        if (Math.abs(parseInt(r, 16) - parseInt(g, 16)) < 10 &&
            Math.abs(parseInt(g, 16) - parseInt(b, 16)) < 10 &&
            Math.abs(parseInt(r, 16) - parseInt(b, 16)) < 10) {
          return 'neutral';
        }
      }
    } else if (color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]);
        const g = parseInt(matches[1]);
        const b = parseInt(matches[2]);

        // If R, G, and B values are close to each other, it's likely a gray
        if (Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10) {
          return 'neutral';
        }
      }
    }

    // For now, categorize remaining colors as primary
    return 'primary';
  }

  // Process colors
  if (colorData.allColorValues && colorData.allColorValues.length > 0) {
    // Group colors by category
    const categorizedColors = {
      primary: [],
      secondary: [],
      neutral: [],
      accent: [],
      semantic: []
    };

    // Categorize each color
    colorData.allColorValues.forEach(color => {
      const category = categorizeColor(color);
      categorizedColors[category].push(color);
    });

    // Process primary colors
    categorizedColors.primary.forEach((color, index) => {
      const isLight = isLightColor(color);
      const shade = isLight ? 'light' : 'dark';
      const tokenName = index === 0 ? 'base' : `${shade}-${index}`;

      tokens.primary[tokenName] = color;
    });

    // Process secondary colors
    categorizedColors.secondary.forEach((color, index) => {
      const isLight = isLightColor(color);
      const shade = isLight ? 'light' : 'dark';
      const tokenName = index === 0 ? 'base' : `${shade}-${index}`;

      tokens.secondary[tokenName] = color;
    });

    // Process neutral colors
    categorizedColors.neutral.sort((a, b) => {
      // Sort from darkest to lightest
      return isLightColor(a) ? 1 : -1;
    }).forEach((color, index) => {
      let tokenName;

      // Special cases for black and white
      if (color === '#000000' || color === 'rgb(0, 0, 0)') {
        tokenName = 'black';
      } else if (color === '#ffffff' || color === 'rgb(255, 255, 255)') {
        tokenName = 'white';
      } else {
        // Generate a numeric scale for grays
        const step = Math.floor((index / categorizedColors.neutral.length) * 9) * 100;
        tokenName = `gray-${step}`;
      }

      tokens.neutral[tokenName] = color;
    });

    // Process accent colors
    categorizedColors.accent.forEach((color, index) => {
      const tokenName = `accent-${index + 1}`;
      tokens.accent[tokenName] = color;
    });

    // Process semantic colors
    categorizedColors.semantic.forEach((color, index) => {
      // Try to determine if this is a semantic color based on CSS vars
      let tokenName = `status-${index + 1}`;

      if (colorData.cssVars) {
        const matchingVar = Object.entries(colorData.cssVars).find(([name, value]) => value === color);
        if (matchingVar) {
          const varName = matchingVar[0].toLowerCase();

          if (varName.includes('success')) tokenName = 'success';
          else if (varName.includes('error')) tokenName = 'error';
          else if (varName.includes('warning')) tokenName = 'warning';
          else if (varName.includes('info')) tokenName = 'info';
        }
      }

      tokens.semantic[tokenName] = color;
    });
  }

  return tokens;
}

/**
 * Generate spacing tokens from extracted data
 * @param {Object} spacingData - Extracted spacing data
 * @returns {Object} Spacing tokens
 */
function generateSpacingTokens(spacingData) {
  if (!spacingData) {
    console.warn('No spacing data available');
    return {};
  }

  console.log('Generating spacing tokens...');

  const tokens = {
    scale: {},
    margin: {},
    padding: {},
    gap: {}
  };

  // Process spacing values
  if (spacingData.allSpacingValues && spacingData.allSpacingValues.length > 0) {
    // Group spacing values by unit
    const groupedSpacing = {
      px: spacingData.allSpacingValues.filter(value => value.endsWith('px')),
      rem: spacingData.allSpacingValues.filter(value => value.endsWith('rem')),
      em: spacingData.allSpacingValues.filter(value => value.endsWith('em')),
      percent: spacingData.allSpacingValues.filter(value => value.endsWith('%'))
    };

    // Determine which unit to use for the scale (prefer rem, then px)
    let primaryUnit = 'px';
    let primaryValues = groupedSpacing.px;

    if (groupedSpacing.rem.length > 0) {
      primaryUnit = 'rem';
      primaryValues = groupedSpacing.rem;
    }

    // Sort values numerically
    primaryValues.sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Remove duplicates and very close values
    const uniqueValues = [];
    primaryValues.forEach(value => {
      const numValue = parseFloat(value);

      // Check if we already have a very similar value
      const hasSimilar = uniqueValues.some(existingValue => {
        const existingNum = parseFloat(existingValue);
        return Math.abs(existingNum - numValue) < 0.1; // Threshold for considering values similar
      });

      if (!hasSimilar) {
        uniqueValues.push(value);
      }
    });

    // Generate spacing scale
    uniqueValues.forEach((value, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = spacingData.cssVars ?
        Object.entries(spacingData.cssVars).find(([name, val]) => val === value) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '')
          .replace(/spacing-/i, '')
          .replace(/space-/i, '')
          .replace(/gap-/i, '');
      } else {
        // Use a numeric scale
        tokenName = index;
      }

      tokens.scale[tokenName] = value;
    });

    // Generate specific spacing tokens based on CSS properties
    if (spacingData.spacingStyles) {
      // Extract margin values
      const marginValues = new Set();
      const paddingValues = new Set();
      const gapValues = new Set();

      // Process each element's styles
      Object.values(spacingData.spacingStyles).forEach(elements => {
        elements.forEach(element => {
          if (element.styles) {
            // Extract margin values
            Object.entries(element.styles).forEach(([prop, value]) => {
              if (prop.includes('margin')) {
                // Handle multiple values (e.g., "10px 20px")
                const values = value.split(' ');
                values.forEach(val => {
                  if (val.endsWith(primaryUnit)) {
                    marginValues.add(val);
                  }
                });
              } else if (prop.includes('padding')) {
                // Handle multiple values (e.g., "10px 20px")
                const values = value.split(' ');
                values.forEach(val => {
                  if (val.endsWith(primaryUnit)) {
                    paddingValues.add(val);
                  }
                });
              } else if (prop.includes('gap')) {
                // Handle multiple values (e.g., "10px 20px")
                const values = value.split(' ');
                values.forEach(val => {
                  if (val.endsWith(primaryUnit)) {
                    gapValues.add(val);
                  }
                });
              }
            });
          }
        });
      });

      // Sort and add margin values
      [...marginValues].sort((a, b) => parseFloat(a) - parseFloat(b))
        .forEach((value, index) => {
          tokens.margin[index] = value;
        });

      // Sort and add padding values
      [...paddingValues].sort((a, b) => parseFloat(a) - parseFloat(b))
        .forEach((value, index) => {
          tokens.padding[index] = value;
        });

      // Sort and add gap values
      [...gapValues].sort((a, b) => parseFloat(a) - parseFloat(b))
        .forEach((value, index) => {
          tokens.gap[index] = value;
        });
    }
  }

  return tokens;
}

/**
 * Generate border tokens from extracted data
 * @param {Object} borderData - Extracted border data
 * @returns {Object} Border tokens
 */
function generateBorderTokens(borderData) {
  if (!borderData) {
    console.warn('No border data available');
    return {};
  }

  console.log('Generating border tokens...');

  const tokens = {
    width: {},
    radius: {},
    style: {},
    shadow: {}
  };

  // Process border widths
  if (borderData.allBorderWidths && borderData.allBorderWidths.length > 0) {
    // Sort border widths numerically
    const sortedWidths = [...borderData.allBorderWidths].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process border widths
    sortedWidths.forEach((width, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = borderData.cssVars ?
        Object.entries(borderData.cssVars).find(([name, value]) => value === width) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/border-width-/i, '');
      } else {
        // Use a numeric scale
        tokenName = index;
      }

      tokens.width[tokenName] = width;
    });
  }

  // Process border radii
  if (borderData.allBorderRadii && borderData.allBorderRadii.length > 0) {
    // Sort border radii numerically
    const sortedRadii = [...borderData.allBorderRadii].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process border radii
    sortedRadii.forEach((radius, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = borderData.cssVars ?
        Object.entries(borderData.cssVars).find(([name, value]) => value === radius) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/border-radius-/i, '');
      } else {
        // Use descriptive names based on size
        if (parseFloat(radius) === 0) {
          tokenName = 'none';
        } else if (parseFloat(radius) <= 4) {
          tokenName = 'sm';
        } else if (parseFloat(radius) <= 8) {
          tokenName = 'md';
        } else if (parseFloat(radius) <= 16) {
          tokenName = 'lg';
        } else if (parseFloat(radius) <= 24) {
          tokenName = 'xl';
        } else {
          tokenName = 'full';
        }

        // Add a number if this token name already exists
        if (tokens.radius[tokenName]) {
          tokenName = `${tokenName}-${index}`;
        }
      }

      tokens.radius[tokenName] = radius;
    });
  }

  // Process border styles
  if (borderData.allBorderStyles && borderData.allBorderStyles.length > 0) {
    // Process border styles
    borderData.allBorderStyles.forEach(style => {
      // Clean up the style value
      const cleanStyle = style.trim();

      // Generate a token name
      const tokenName = cleanStyle;

      tokens.style[tokenName] = cleanStyle;
    });
  }

  // Process shadows
  if (borderData.allShadows && borderData.allShadows.length > 0) {
    // Process shadows
    borderData.allShadows.forEach((shadow, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = borderData.cssVars ?
        Object.entries(borderData.cssVars).find(([name, value]) => value === shadow) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/shadow-/i, '');
      } else {
        // Analyze the shadow to determine its intensity
        const shadowParts = shadow.split(' ');
        const shadowSize = shadowParts.length >= 3 ? parseFloat(shadowParts[2]) : 0;

        if (shadowSize === 0) {
          tokenName = 'none';
        } else if (shadowSize <= 2) {
          tokenName = 'xs';
        } else if (shadowSize <= 4) {
          tokenName = 'sm';
        } else if (shadowSize <= 8) {
          tokenName = 'md';
        } else if (shadowSize <= 16) {
          tokenName = 'lg';
        } else {
          tokenName = 'xl';
        }

        // Add a number if this token name already exists
        if (tokens.shadow[tokenName]) {
          tokenName = `${tokenName}-${index}`;
        }
      }

      tokens.shadow[tokenName] = shadow;
    });
  }

  return tokens;
}

/**
 * Generate animation tokens from extracted data
 * @param {Object} animationData - Extracted animation data
 * @returns {Object} Animation tokens
 */
function generateAnimationTokens(animationData) {
  if (!animationData) {
    console.warn('No animation data available');
    return {};
  }

  console.log('Generating animation tokens...');

  const tokens = {
    duration: {},
    timingFunction: {},
    delay: {},
    keyframes: {}
  };

  // Process durations
  if (animationData.allDurations && animationData.allDurations.length > 0) {
    // Sort durations numerically
    const sortedDurations = [...animationData.allDurations].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process durations
    sortedDurations.forEach((duration, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = animationData.cssVars ?
        Object.entries(animationData.cssVars).find(([name, value]) => value === duration) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '')
          .replace(/duration-/i, '')
          .replace(/transition-/i, '')
          .replace(/animation-/i, '');
      } else {
        // Use descriptive names based on duration
        const durationMs = parseFloat(duration) * 1000; // Convert to ms

        if (durationMs <= 100) {
          tokenName = 'instant';
        } else if (durationMs <= 200) {
          tokenName = 'fast';
        } else if (durationMs <= 400) {
          tokenName = 'normal';
        } else if (durationMs <= 700) {
          tokenName = 'slow';
        } else {
          tokenName = 'slower';
        }

        // Add a number if this token name already exists
        if (tokens.duration[tokenName]) {
          tokenName = `${tokenName}-${index}`;
        }
      }

      tokens.duration[tokenName] = duration;
    });
  }

  // Process timing functions
  if (animationData.allTimingFunctions && animationData.allTimingFunctions.length > 0) {
    // Process timing functions
    animationData.allTimingFunctions.forEach((timingFunction, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = animationData.cssVars ?
        Object.entries(animationData.cssVars).find(([name, value]) => value === timingFunction) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '')
          .replace(/timing-/i, '')
          .replace(/easing-/i, '')
          .replace(/ease-/i, '');
      } else {
        // Use standard names for common timing functions
        if (timingFunction === 'linear') {
          tokenName = 'linear';
        } else if (timingFunction === 'ease') {
          tokenName = 'ease';
        } else if (timingFunction === 'ease-in') {
          tokenName = 'ease-in';
        } else if (timingFunction === 'ease-out') {
          tokenName = 'ease-out';
        } else if (timingFunction === 'ease-in-out') {
          tokenName = 'ease-in-out';
        } else {
          // For cubic-bezier functions
          tokenName = `custom-${index}`;
        }
      }

      tokens.timingFunction[tokenName] = timingFunction;
    });
  }

  // Process delays
  if (animationData.allDelays && animationData.allDelays.length > 0) {
    // Sort delays numerically
    const sortedDelays = [...animationData.allDelays].sort((a, b) => {
      const aValue = parseFloat(a);
      const bValue = parseFloat(b);
      return aValue - bValue;
    });

    // Process delays
    sortedDelays.forEach((delay, index) => {
      // Generate a token name
      let tokenName;

      // Check if we have CSS variables that might give us better names
      const matchingVar = animationData.cssVars ?
        Object.entries(animationData.cssVars).find(([name, value]) => value === delay) :
        null;

      if (matchingVar) {
        // Extract a name from the CSS variable
        const varName = matchingVar[0];
        tokenName = varName.replace('--', '').replace(/delay-/i, '');
      } else {
        // Use a numeric scale
        tokenName = index;
      }

      tokens.delay[tokenName] = delay;
    });
  }

  // Process keyframes
  if (animationData.keyframes) {
    // Process keyframes
    Object.entries(animationData.keyframes).forEach(([name, keyframes]) => {
      tokens.keyframes[name] = keyframes;
    });
  }

  return tokens;
}

/**
 * Main function to generate design tokens
 */
async function generateDesignTokens() {
  console.log('Starting design token generation...');

  // Create output directories if they don't exist
  const cssDir = path.dirname(config.outputFiles.css.variables);
  const tokensDir = path.dirname(config.outputFiles.tokens.json);

  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }

  if (!fs.existsSync(tokensDir)) {
    fs.mkdirSync(tokensDir, { recursive: true });
  }

  // Load extracted data
  const extractedData = loadExtractedData();

  // Generate tokens
  const tokens = {
    typography: generateTypographyTokens(extractedData.typography),
    colors: generateColorTokens(extractedData.colors),
    spacing: generateSpacingTokens(extractedData.spacing),
    borders: generateBorderTokens(extractedData.borders),
    animations: generateAnimationTokens(extractedData.animations)
  };

  // Generate CSS files
  generateCSSFiles(tokens);

  // Generate JSON tokens
  generateJSONTokens(tokens);

  return tokens;
}

/**
 * Generate CSS files from tokens
 * @param {Object} tokens - Design tokens
 */
function generateCSSFiles(tokens) {
  console.log('Generating CSS files...');

  // Generate variables.css (all variables in one file)
  let variablesCSS = `/**
 * Design Tokens - CSS Variables
 * Generated automatically - DO NOT EDIT
 */

:root {
`;

  // Add typography variables
  if (Object.keys(tokens.typography).length > 0) {
    variablesCSS += `  /* Typography */
`;

    // Font families
    if (Object.keys(tokens.typography.fontFamily).length > 0) {
      Object.entries(tokens.typography.fontFamily).forEach(([name, value]) => {
        variablesCSS += `  --font-family-${name}: ${value};
`;
      });
    }

    // Font sizes
    if (Object.keys(tokens.typography.fontSize).length > 0) {
      Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
        variablesCSS += `  --font-size-${name}: ${value};
`;
      });
    }

    // Font weights
    if (Object.keys(tokens.typography.fontWeight).length > 0) {
      Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
        variablesCSS += `  --font-weight-${name}: ${value};
`;
      });
    }

    // Line heights
    if (Object.keys(tokens.typography.lineHeight).length > 0) {
      Object.entries(tokens.typography.lineHeight).forEach(([name, value]) => {
        variablesCSS += `  --line-height-${name}: ${value};
`;
      });
    }

    // Letter spacing
    if (Object.keys(tokens.typography.letterSpacing).length > 0) {
      Object.entries(tokens.typography.letterSpacing).forEach(([name, value]) => {
        variablesCSS += `  --letter-spacing-${name}: ${value};
`;
      });
    }
  }

  // Add color variables
  if (Object.keys(tokens.colors).length > 0) {
    variablesCSS += `
  /* Colors */
`;

    // Primary colors
    if (Object.keys(tokens.colors.primary).length > 0) {
      Object.entries(tokens.colors.primary).forEach(([name, value]) => {
        variablesCSS += `  --color-primary-${name}: ${value};
`;
      });
    }

    // Secondary colors
    if (Object.keys(tokens.colors.secondary).length > 0) {
      Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
        variablesCSS += `  --color-secondary-${name}: ${value};
`;
      });
    }

    // Neutral colors
    if (Object.keys(tokens.colors.neutral).length > 0) {
      Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
        variablesCSS += `  --color-${name}: ${value};
`;
      });
    }

    // Accent colors
    if (Object.keys(tokens.colors.accent).length > 0) {
      Object.entries(tokens.colors.accent).forEach(([name, value]) => {
        variablesCSS += `  --color-${name}: ${value};
`;
      });
    }

    // Semantic colors
    if (Object.keys(tokens.colors.semantic).length > 0) {
      Object.entries(tokens.colors.semantic).forEach(([name, value]) => {
        variablesCSS += `  --color-${name}: ${value};
`;
      });
    }
  }

  // Add spacing variables
  if (Object.keys(tokens.spacing).length > 0) {
    variablesCSS += `
  /* Spacing */
`;

    // Spacing scale
    if (Object.keys(tokens.spacing.scale).length > 0) {
      Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
        variablesCSS += `  --spacing-${name}: ${value};
`;
      });
    }
  }

  // Add border variables
  if (Object.keys(tokens.borders).length > 0) {
    variablesCSS += `
  /* Borders */
`;

    // Border widths
    if (Object.keys(tokens.borders.width).length > 0) {
      Object.entries(tokens.borders.width).forEach(([name, value]) => {
        variablesCSS += `  --border-width-${name}: ${value};
`;
      });
    }

    // Border radii
    if (Object.keys(tokens.borders.radius).length > 0) {
      Object.entries(tokens.borders.radius).forEach(([name, value]) => {
        variablesCSS += `  --border-radius-${name}: ${value};
`;
      });
    }

    // Shadows
    if (Object.keys(tokens.borders.shadow).length > 0) {
      Object.entries(tokens.borders.shadow).forEach(([name, value]) => {
        variablesCSS += `  --shadow-${name}: ${value};
`;
      });
    }
  }

  // Add animation variables
  if (Object.keys(tokens.animations).length > 0) {
    variablesCSS += `
  /* Animations */
`;

    // Durations
    if (Object.keys(tokens.animations.duration).length > 0) {
      Object.entries(tokens.animations.duration).forEach(([name, value]) => {
        variablesCSS += `  --duration-${name}: ${value};
`;
      });
    }

    // Timing functions
    if (Object.keys(tokens.animations.timingFunction).length > 0) {
      Object.entries(tokens.animations.timingFunction).forEach(([name, value]) => {
        variablesCSS += `  --ease-${name}: ${value};
`;
      });
    }
  }

  variablesCSS += `}
`;

  // Write variables.css
  const cssDir = path.dirname(config.outputFiles.css.variables);
  if (!fs.existsSync(cssDir)) {
    fs.mkdirSync(cssDir, { recursive: true });
  }
  fs.writeFileSync(config.outputFiles.css.variables, variablesCSS);
  console.log(`Generated ${config.outputFiles.css.variables}`);

  // Generate typography.css
  let typographyCSS = `/**
 * Typography Styles
 * Generated automatically - DO NOT EDIT
 */

/* Font families */
`;

  if (Object.keys(tokens.typography.fontFamily).length > 0) {
    Object.entries(tokens.typography.fontFamily).forEach(([name, value]) => {
      typographyCSS += `.font-family-${name} {
  font-family: var(--font-family-${name});
}

`;
    });
  }

  typographyCSS += `/* Font sizes */
`;
  if (Object.keys(tokens.typography.fontSize).length > 0) {
    Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
      typographyCSS += `.font-size-${name} {
  font-size: var(--font-size-${name});
}

`;
    });
  }

  typographyCSS += `/* Font weights */
`;
  if (Object.keys(tokens.typography.fontWeight).length > 0) {
    Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
      typographyCSS += `.font-weight-${name} {
  font-weight: var(--font-weight-${name});
}

`;
    });
  }

  typographyCSS += `/* Line heights */
`;
  if (Object.keys(tokens.typography.lineHeight).length > 0) {
    Object.entries(tokens.typography.lineHeight).forEach(([name, value]) => {
      typographyCSS += `.line-height-${name} {
  line-height: var(--line-height-${name});
}

`;
    });
  }

  typographyCSS += `/* Letter spacing */
`;
  if (Object.keys(tokens.typography.letterSpacing).length > 0) {
    Object.entries(tokens.typography.letterSpacing).forEach(([name, value]) => {
      typographyCSS += `.letter-spacing-${name} {
  letter-spacing: var(--letter-spacing-${name});
}

`;
    });
  }

  // Write typography.css
  fs.writeFileSync(config.outputFiles.css.typography, typographyCSS);
  console.log(`Generated ${config.outputFiles.css.typography}`);

  // Generate colors.css
  let colorsCSS = `/**
 * Color Styles
 * Generated automatically - DO NOT EDIT
 */

/* Text colors */
`;

  // Primary colors
  if (Object.keys(tokens.colors.primary).length > 0) {
    Object.entries(tokens.colors.primary).forEach(([name, value]) => {
      colorsCSS += `.text-primary-${name} {
  color: var(--color-primary-${name});
}

`;
    });
  }

  // Secondary colors
  if (Object.keys(tokens.colors.secondary).length > 0) {
    Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
      colorsCSS += `.text-secondary-${name} {
  color: var(--color-secondary-${name});
}

`;
    });
  }

  // Neutral colors
  if (Object.keys(tokens.colors.neutral).length > 0) {
    Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
      colorsCSS += `.text-${name} {
  color: var(--color-${name});
}

`;
    });
  }

  colorsCSS += `/* Background colors */
`;

  // Primary colors
  if (Object.keys(tokens.colors.primary).length > 0) {
    Object.entries(tokens.colors.primary).forEach(([name, value]) => {
      colorsCSS += `.bg-primary-${name} {
  background-color: var(--color-primary-${name});
}

`;
    });
  }

  // Secondary colors
  if (Object.keys(tokens.colors.secondary).length > 0) {
    Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
      colorsCSS += `.bg-secondary-${name} {
  background-color: var(--color-secondary-${name});
}

`;
    });
  }

  // Neutral colors
  if (Object.keys(tokens.colors.neutral).length > 0) {
    Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
      colorsCSS += `.bg-${name} {
  background-color: var(--color-${name});
}

`;
    });
  }

  // Write colors.css
  fs.writeFileSync(config.outputFiles.css.colors, colorsCSS);
  console.log(`Generated ${config.outputFiles.css.colors}`);

  // Generate spacing.css
  let spacingCSS = `/**
 * Spacing Styles
 * Generated automatically - DO NOT EDIT
 */

/* Margin utilities */
`;

  if (Object.keys(tokens.spacing.scale).length > 0) {
    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      spacingCSS += `.m-${name} {
  margin: var(--spacing-${name});
}

.mt-${name} {
  margin-top: var(--spacing-${name});
}

.mr-${name} {
  margin-right: var(--spacing-${name});
}

.mb-${name} {
  margin-bottom: var(--spacing-${name});
}

.ml-${name} {
  margin-left: var(--spacing-${name});
}

.mx-${name} {
  margin-left: var(--spacing-${name});
  margin-right: var(--spacing-${name});
}

.my-${name} {
  margin-top: var(--spacing-${name});
  margin-bottom: var(--spacing-${name});
}

`;
    });
  }

  spacingCSS += `/* Padding utilities */
`;
  if (Object.keys(tokens.spacing.scale).length > 0) {
    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      spacingCSS += `.p-${name} {
  padding: var(--spacing-${name});
}

.pt-${name} {
  padding-top: var(--spacing-${name});
}

.pr-${name} {
  padding-right: var(--spacing-${name});
}

.pb-${name} {
  padding-bottom: var(--spacing-${name});
}

.pl-${name} {
  padding-left: var(--spacing-${name});
}

.px-${name} {
  padding-left: var(--spacing-${name});
  padding-right: var(--spacing-${name});
}

.py-${name} {
  padding-top: var(--spacing-${name});
  padding-bottom: var(--spacing-${name});
}

`;
    });
  }

  spacingCSS += `/* Gap utilities */
`;
  if (Object.keys(tokens.spacing.scale).length > 0) {
    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      spacingCSS += `.gap-${name} {
  gap: var(--spacing-${name});
}

.row-gap-${name} {
  row-gap: var(--spacing-${name});
}

.column-gap-${name} {
  column-gap: var(--spacing-${name});
}

`;
    });
  }

  // Write spacing.css
  fs.writeFileSync(config.outputFiles.css.spacing, spacingCSS);
  console.log(`Generated ${config.outputFiles.css.spacing}`);

  // Generate borders.css
  let bordersCSS = `/**
 * Border Styles
 * Generated automatically - DO NOT EDIT
 */

/* Border width utilities */
`;

  if (Object.keys(tokens.borders.width).length > 0) {
    Object.entries(tokens.borders.width).forEach(([name, value]) => {
      bordersCSS += `.border-${name} {
  border-width: var(--border-width-${name});
  border-style: solid;
}

`;
    });
  }

  bordersCSS += `/* Border radius utilities */
`;
  if (Object.keys(tokens.borders.radius).length > 0) {
    Object.entries(tokens.borders.radius).forEach(([name, value]) => {
      bordersCSS += `.rounded-${name} {
  border-radius: var(--border-radius-${name});
}

`;
    });
  }

  bordersCSS += `/* Shadow utilities */
`;
  if (Object.keys(tokens.borders.shadow).length > 0) {
    Object.entries(tokens.borders.shadow).forEach(([name, value]) => {
      bordersCSS += `.shadow-${name} {
  box-shadow: var(--shadow-${name});
}

`;
    });
  }

  // Write borders.css
  fs.writeFileSync(config.outputFiles.css.borders, bordersCSS);
  console.log(`Generated ${config.outputFiles.css.borders}`);

  // Generate animations.css
  let animationsCSS = `/**
 * Animation Styles
 * Generated automatically - DO NOT EDIT
 */

/* Duration utilities */
`;

  if (Object.keys(tokens.animations.duration).length > 0) {
    Object.entries(tokens.animations.duration).forEach(([name, value]) => {
      animationsCSS += `.duration-${name} {
  transition-duration: var(--duration-${name});
}

`;
    });
  }

  animationsCSS += `/* Timing function utilities */
`;
  if (Object.keys(tokens.animations.timingFunction).length > 0) {
    Object.entries(tokens.animations.timingFunction).forEach(([name, value]) => {
      animationsCSS += `.ease-${name} {
  transition-timing-function: var(--ease-${name});
}

`;
    });
  }

  // Add keyframe animations if available
  if (Object.keys(tokens.animations.keyframes).length > 0) {
    animationsCSS += `/* Keyframe animations */
`;

    Object.entries(tokens.animations.keyframes).forEach(([name, keyframes]) => {
      animationsCSS += `@keyframes ${name} {
`;

      keyframes.forEach(keyframe => {
        animationsCSS += `  ${keyframe.keyText} {
`;

        Object.entries(keyframe.properties).forEach(([prop, value]) => {
          animationsCSS += `    ${prop}: ${value};
`;
        });

        animationsCSS += `  }
`;
      });

      animationsCSS += `}

.animate-${name} {
  animation-name: ${name};
}

`;
    });
  }

  // Write animations.css
  fs.writeFileSync(config.outputFiles.css.animations, animationsCSS);
  console.log(`Generated ${config.outputFiles.css.animations}`);
}

/**
 * Generate JSON token files
 * @param {Object} tokens - Design tokens
 */
function generateJSONTokens(tokens) {
  console.log('Generating JSON token files...');

  // Generate standard JSON tokens
  const jsonTokens = {
    typography: tokens.typography,
    colors: tokens.colors,
    spacing: tokens.spacing,
    borders: tokens.borders,
    animations: tokens.animations
  };

  // Write JSON tokens
  fs.writeFileSync(config.outputFiles.tokens.json, JSON.stringify(jsonTokens, null, 2));
  console.log(`Generated ${config.outputFiles.tokens.json}`);

  // Generate Figma-compatible tokens
  const figmaTokens = {
    global: {
      typography: {},
      color: {},
      spacing: {},
      borderRadius: {},
      borderWidth: {},
      shadow: {},
      motion: {}
    }
  };

  // Convert typography tokens to Figma format
  if (Object.keys(tokens.typography.fontFamily).length > 0) {
    figmaTokens.global.typography.fontFamilies = {};
    Object.entries(tokens.typography.fontFamily).forEach(([name, value]) => {
      figmaTokens.global.typography.fontFamilies[name] = {
        value,
        type: 'fontFamilies'
      };
    });
  }

  if (Object.keys(tokens.typography.fontSize).length > 0) {
    figmaTokens.global.typography.fontSize = {};
    Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
      figmaTokens.global.typography.fontSize[name] = {
        value,
        type: 'fontSizes'
      };
    });
  }

  if (Object.keys(tokens.typography.fontWeight).length > 0) {
    figmaTokens.global.typography.fontWeight = {};
    Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
      figmaTokens.global.typography.fontWeight[name] = {
        value,
        type: 'fontWeights'
      };
    });
  }

  if (Object.keys(tokens.typography.lineHeight).length > 0) {
    figmaTokens.global.typography.lineHeight = {};
    Object.entries(tokens.typography.lineHeight).forEach(([name, value]) => {
      figmaTokens.global.typography.lineHeight[name] = {
        value,
        type: 'lineHeights'
      };
    });
  }

  if (Object.keys(tokens.typography.letterSpacing).length > 0) {
    figmaTokens.global.typography.letterSpacing = {};
    Object.entries(tokens.typography.letterSpacing).forEach(([name, value]) => {
      figmaTokens.global.typography.letterSpacing[name] = {
        value,
        type: 'letterSpacing'
      };
    });
  }

  // Convert color tokens to Figma format
  if (Object.keys(tokens.colors.primary).length > 0) {
    figmaTokens.global.color.primary = {};
    Object.entries(tokens.colors.primary).forEach(([name, value]) => {
      figmaTokens.global.color.primary[name] = {
        value,
        type: 'color'
      };
    });
  }

  if (Object.keys(tokens.colors.secondary).length > 0) {
    figmaTokens.global.color.secondary = {};
    Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
      figmaTokens.global.color.secondary[name] = {
        value,
        type: 'color'
      };
    });
  }

  if (Object.keys(tokens.colors.neutral).length > 0) {
    figmaTokens.global.color.neutral = {};
    Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
      figmaTokens.global.color.neutral[name] = {
        value,
        type: 'color'
      };
    });
  }

  if (Object.keys(tokens.colors.accent).length > 0) {
    figmaTokens.global.color.accent = {};
    Object.entries(tokens.colors.accent).forEach(([name, value]) => {
      figmaTokens.global.color.accent[name] = {
        value,
        type: 'color'
      };
    });
  }

  if (Object.keys(tokens.colors.semantic).length > 0) {
    figmaTokens.global.color.semantic = {};
    Object.entries(tokens.colors.semantic).forEach(([name, value]) => {
      figmaTokens.global.color.semantic[name] = {
        value,
        type: 'color'
      };
    });
  }

  // Convert spacing tokens to Figma format
  if (Object.keys(tokens.spacing.scale).length > 0) {
    figmaTokens.global.spacing = {};
    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      figmaTokens.global.spacing[name] = {
        value,
        type: 'spacing'
      };
    });
  }

  // Convert border tokens to Figma format
  if (Object.keys(tokens.borders.radius).length > 0) {
    figmaTokens.global.borderRadius = {};
    Object.entries(tokens.borders.radius).forEach(([name, value]) => {
      figmaTokens.global.borderRadius[name] = {
        value,
        type: 'borderRadius'
      };
    });
  }

  if (Object.keys(tokens.borders.width).length > 0) {
    figmaTokens.global.borderWidth = {};
    Object.entries(tokens.borders.width).forEach(([name, value]) => {
      figmaTokens.global.borderWidth[name] = {
        value,
        type: 'borderWidth'
      };
    });
  }

  if (Object.keys(tokens.borders.shadow).length > 0) {
    figmaTokens.global.shadow = {};
    Object.entries(tokens.borders.shadow).forEach(([name, value]) => {
      figmaTokens.global.shadow[name] = {
        value,
        type: 'boxShadow'
      };
    });
  }

  // Convert animation tokens to Figma format
  if (Object.keys(tokens.animations.duration).length > 0) {
    figmaTokens.global.motion.duration = {};
    Object.entries(tokens.animations.duration).forEach(([name, value]) => {
      figmaTokens.global.motion.duration[name] = {
        value,
        type: 'duration'
      };
    });
  }

  if (Object.keys(tokens.animations.timingFunction).length > 0) {
    figmaTokens.global.motion.easing = {};
    Object.entries(tokens.animations.timingFunction).forEach(([name, value]) => {
      figmaTokens.global.motion.easing[name] = {
        value,
        type: 'cubicBezier'
      };
    });
  }

  // Write Figma tokens
  fs.writeFileSync(config.outputFiles.tokens.figma, JSON.stringify(figmaTokens, null, 2));
  console.log(`Generated ${config.outputFiles.tokens.figma}`);

  console.log('\nDesign token generation completed!');
  console.log(`CSS files saved to: ${path.dirname(config.outputFiles.css.variables)}`);
  console.log(`Token files saved to: ${path.dirname(config.outputFiles.tokens.json)}`);

  return tokens;
}

/**
 * Load extracted data from JSON files
 * @returns {Object} Extracted data
 */
function loadExtractedData() {
  const data = {};

  // Load typography data if available
  try {
    if (fs.existsSync(config.inputFiles.typography)) {
      data.typography = JSON.parse(fs.readFileSync(config.inputFiles.typography, 'utf8'));
      console.log('Loaded typography data');
      // Log the structure to help debug
      console.log(`Typography data contains: ${data.typography.allFontFamilies ? data.typography.allFontFamilies.length : 0} font families, ${data.typography.allFontSizes ? data.typography.allFontSizes.length : 0} font sizes, ${data.typography.allFontWeights ? data.typography.allFontWeights.length : 0} font weights`);
    }
  } catch (error) {
    console.warn('Could not load typography data:', error.message);
  }

  // Load colors data if available
  try {
    if (fs.existsSync(config.inputFiles.colors)) {
      data.colors = JSON.parse(fs.readFileSync(config.inputFiles.colors, 'utf8'));
      console.log('Loaded colors data');
    }
  } catch (error) {
    console.warn('Could not load colors data:', error.message);
  }

  // Load spacing data if available
  try {
    if (fs.existsSync(config.inputFiles.spacing)) {
      data.spacing = JSON.parse(fs.readFileSync(config.inputFiles.spacing, 'utf8'));
      console.log('Loaded spacing data');
    }
  } catch (error) {
    console.warn('Could not load spacing data:', error.message);
  }

  // Load borders data if available
  try {
    if (fs.existsSync(config.inputFiles.borders)) {
      data.borders = JSON.parse(fs.readFileSync(config.inputFiles.borders, 'utf8'));
      console.log('Loaded borders data');
    }
  } catch (error) {
    console.warn('Could not load borders data:', error.message);
  }

  // Load animations data if available
  try {
    if (fs.existsSync(config.inputFiles.animations)) {
      data.animations = JSON.parse(fs.readFileSync(config.inputFiles.animations, 'utf8'));
      console.log('Loaded animations data');
    }
  } catch (error) {
    console.warn('Could not load animations data:', error.message);
  }

  return data;
}

// If this script is run directly, execute the token generation
if (require.main === module) {
  generateDesignTokens().catch(error => {
    console.error('Token generation failed:', error);
    process.exit(1);
  });
}

// Export the function for use in other scripts
module.exports = { generateDesignTokens };
