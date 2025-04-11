// src/runner/extractor-exports.js - Provides uniform access to extractor modules
import extractTypography from '../extractors/extract-typography.js';
import extractColors from '../extractors/extract-colors.js';
import extractSpacing from '../extractors/extract-spacing.js';
import extractBorders from '../extractors/extract-borders.js';
import extractAnimations from '../extractors/extract-animations.js';

// Extract the main functions from each module
export const extractTypographyFromCrawledPages = extractTypography;
export const extractColorsFromCrawledPages = extractColors;
export const extractSpacingFromCrawledPages = extractSpacing;
export const extractBordersFromCrawledPages = extractBorders;
export const extractAnimationsFromCrawledPages = extractAnimations;

// Define the extractors for the UI
export const extractors = {
  typography: {
    name: 'typography',
    description: 'Extracts typography-related styles including font families, sizes, weights, line heights, and letter spacing.',
    run: extractTypography
  },
  colors: {
    name: 'colors',
    description: 'Extracts color values from text, backgrounds, borders, and other elements. Identifies primary, secondary, and accent colors.',
    run: extractColors
  },
  spacing: {
    name: 'spacing',
    description: 'Extracts spacing patterns including margins, padding, and gaps. Creates a consistent spacing scale.',
    run: extractSpacing
  },
  borders: {
    name: 'borders',
    description: 'Extracts border styles including widths, colors, and radius values.',
    run: extractBorders
  },
  animations: {
    name: 'animations',
    description: 'Extracts animation properties including durations, timing functions, and keyframes.',
    run: extractAnimations
  }
};