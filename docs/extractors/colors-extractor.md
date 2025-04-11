# Colors Extractor

## Overview

The Colors Extractor is responsible for analyzing web pages and extracting color-related design elements, including text colors, background colors, border colors, and color variables. It helps identify the color system used in a website and generates standardized tokens for design systems.

## Features

- Extracts text colors from various elements
- Identifies background colors used across the website
- Captures border and outline colors
- Detects CSS color variables
- Groups similar colors to identify color palettes
- Generates color swatches for visualization
- Creates CSS variables for color tokens

## Usage

### Basic Usage

```javascript
const extractColors = require('./src/extractors/extract-colors');

// Extract colors from crawled pages
const result = await extractColors.extractColorsFromCrawledPages();

if (result.success) {
  console.log('Color extraction completed successfully!');
  console.log(`Unique color values found: ${result.data.allColorValues.length}`);
  console.log(`CSS variables found: ${Object.keys(result.data.cssVars).length}`);
} else {
  console.error('Color extraction failed:', result.error.message);
}
```

### Configuration Options

The Colors Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted color data
  outputFile: './results/raw/colors-analysis.json',
  
  // Directory for screenshots and color swatches
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a color to be considered significant
  minOccurrences: 3,
  
  // Whether to group similar colors
  groupSimilarColors: true,
  
  // Threshold for considering colors similar (0-100)
  colorSimilarityThreshold: 95,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/colors',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractColors.extractColorsFromCrawledPages(config);
```

## API Reference

### Functions

#### `extractColorsFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract colors from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Color extraction results

#### `extractColorsFromPage(page, url = null, config = defaultConfig)`

Extract colors from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Color data for the page

#### `generateColorSwatches(page, colors, outputDir)`

Generate color swatches for visualization.

**Parameters:**
- `page` (Page): Playwright page object
- `colors` (Array): Array of color values
- `outputDir` (string): Output directory for swatches

**Returns:**
- Promise<void>

#### `extractColors(page, config)`

Internal function to extract colors from the current page.

**Parameters:**
- `page` (Page): Playwright page object
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Extracted color data

## Output Format

The Colors Extractor generates a JSON file with the following structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website",
      "colors": {
        "text": ["#333333", "#666666"],
        "background": ["#FFFFFF", "#F5F5F5"],
        "border": ["#DDDDDD", "#CCCCCC"]
      }
    }
  ],
  "allColorValues": [
    {
      "value": "#333333",
      "type": "text",
      "occurrences": 42,
      "elements": ["p", "h1", "h2"]
    },
    {
      "value": "#FFFFFF",
      "type": "background",
      "occurrences": 15,
      "elements": ["body", "div", "section"]
    }
  ],
  "colorGroups": {
    "primary": ["#0066CC", "#0077DD", "#0088EE"],
    "secondary": ["#FF5500", "#FF6600", "#FF7700"],
    "neutral": ["#333333", "#666666", "#999999", "#CCCCCC"]
  },
  "cssVars": {
    "--primary-color": "#0066CC",
    "--secondary-color": "#FF5500",
    "--text-color": "#333333",
    "--background-color": "#FFFFFF",
    "--border-color": "#DDDDDD"
  }
}
```

## Examples

### Extracting Colors with Custom Configuration

```javascript
const extractColors = require('./src/extractors/extract-colors');
const { chromium } = require('@playwright/test');

async function extractColorsWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-results/colors.json',
    minOccurrences: 2,
    groupSimilarColors: true,
    colorSimilarityThreshold: 90
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract colors
    const result = await extractColors.extractColorsFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Color extraction completed successfully!');
      console.log(`Unique color values found: ${result.data.allColorValues.length}`);
      console.log(`Color groups identified: ${Object.keys(result.data.colorGroups).length}`);
    } else {
      console.error('Color extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractColorsWithCustomConfig();
```

### Extracting Colors from a Single Page

```javascript
const extractColors = require('./src/extractors/extract-colors');
const { chromium } = require('@playwright/test');

async function extractColorsFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract colors from a specific page
    const result = await extractColors.extractColorsFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Color extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Color extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractColorsFromSinglePage();
```

## Color Processing

### Color Normalization

The Colors Extractor normalizes all color values to hexadecimal format (#RRGGBB) for consistency. It handles various color formats including:

- Hexadecimal: #RGB, #RRGGBB
- RGB: rgb(r, g, b)
- RGBA: rgba(r, g, b, a)
- HSL: hsl(h, s%, l%)
- HSLA: hsla(h, s%, l%, a)
- Named colors: red, blue, green, etc.

### Color Grouping

When `groupSimilarColors` is enabled, the extractor groups similar colors based on perceptual similarity. This helps identify color palettes and reduce the number of unique colors in the design system.

The `colorSimilarityThreshold` determines how similar colors need to be to be grouped together. A higher value (closer to 100) means colors must be very similar to be grouped, while a lower value allows more variation within groups.

## Troubleshooting

### Common Issues

1. **No colors extracted**
   - Check if the website uses standard CSS properties for colors
   - Ensure the website is accessible and loads properly
   - Try increasing the timeout value in the configuration

2. **Missing color variables**
   - Some websites don't use CSS variables for colors
   - Check if the website uses inline styles or other methods for applying colors

3. **Too many similar colors**
   - Try adjusting the `colorSimilarityThreshold` value
   - Enable `groupSimilarColors` to reduce the number of unique colors

### Error Handling

The Colors Extractor provides detailed error information in the result object:

```javascript
const result = await extractColors.extractColorsFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Color extraction can be resource-intensive on large websites
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- The `groupSimilarColors` option adds additional processing time when enabled

## Related Components

- [Typography Extractor](./typography-extractor.md)
- [Spacing Extractor](./spacing-extractor.md)
- [Borders Extractor](./borders-extractor.md)
- [Animations Extractor](./animations-extractor.md)
