# Spacing Extractor

## Overview

The Spacing Extractor is responsible for analyzing web pages and extracting spacing-related design elements, including margins, paddings, and gaps. It helps identify the spacing system used in a website and generates standardized tokens for design systems.

## Features

- Extracts margin values from various elements
- Identifies padding values used across the website
- Captures gap values for flex and grid layouts
- Detects CSS spacing variables
- Groups spacing values to identify spacing scales
- Generates spacing visualizations
- Creates CSS variables for spacing tokens

## Usage

### Basic Usage

```javascript
const extractSpacing = require('./src/extractors/extract-spacing');

// Extract spacing from crawled pages
const result = await extractSpacing.extractSpacingFromCrawledPages();

if (result.success) {
  console.log('Spacing extraction completed successfully!');
  console.log(`Unique spacing values found: ${result.data.allSpacingValues.length}`);
  console.log(`CSS variables found: ${Object.keys(result.data.cssVars).length}`);
} else {
  console.error('Spacing extraction failed:', result.error.message);
}
```

### Configuration Options

The Spacing Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted spacing data
  outputFile: './results/raw/spacing-analysis.json',
  
  // Directory for screenshots and visualizations
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a spacing value to be considered significant
  minOccurrences: 3,
  
  // Whether to normalize spacing values (convert to px)
  normalizeValues: true,
  
  // Whether to group spacing values into scales
  groupValues: true,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/spacing',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractSpacing.extractSpacingFromCrawledPages(config);
```

## API Reference

### Functions

#### `extractSpacingFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract spacing from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Spacing extraction results

#### `extractSpacingFromPage(page, url = null, config = defaultConfig)`

Extract spacing from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Spacing data for the page

#### `generateSpacingVisualization(page, spacingData, outputDir)`

Generate visualizations for spacing data.

**Parameters:**
- `page` (Page): Playwright page object
- `spacingData` (Object): Spacing data
- `outputDir` (string): Output directory for visualizations

**Returns:**
- Promise<void>

#### `extractSpacing(page, config)`

Internal function to extract spacing from the current page.

**Parameters:**
- `page` (Page): Playwright page object
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Extracted spacing data

## Output Format

The Spacing Extractor generates a JSON file with the following structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website",
      "spacing": {
        "margin": ["0px", "8px", "16px", "24px"],
        "padding": ["8px", "16px", "24px", "32px"],
        "gap": ["8px", "16px"]
      }
    }
  ],
  "allSpacingValues": [
    {
      "value": "8px",
      "type": "margin",
      "occurrences": 42,
      "elements": ["div", "section", "article"]
    },
    {
      "value": "16px",
      "type": "padding",
      "occurrences": 35,
      "elements": ["div", "header", "footer"]
    }
  ],
  "spacingGroups": {
    "xs": ["4px", "8px"],
    "sm": ["12px", "16px"],
    "md": ["20px", "24px"],
    "lg": ["32px", "40px"],
    "xl": ["48px", "64px"]
  },
  "cssVars": {
    "--spacing-xs": "8px",
    "--spacing-sm": "16px",
    "--spacing-md": "24px",
    "--spacing-lg": "32px",
    "--spacing-xl": "48px"
  }
}
```

## Examples

### Extracting Spacing with Custom Configuration

```javascript
const extractSpacing = require('./src/extractors/extract-spacing');
const { chromium } = require('@playwright/test');

async function extractSpacingWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-results/spacing.json',
    minOccurrences: 2,
    normalizeValues: true,
    groupValues: true
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract spacing
    const result = await extractSpacing.extractSpacingFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Spacing extraction completed successfully!');
      console.log(`Unique spacing values found: ${result.data.allSpacingValues.length}`);
      console.log(`Spacing groups identified: ${Object.keys(result.data.spacingGroups).length}`);
    } else {
      console.error('Spacing extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractSpacingWithCustomConfig();
```

### Extracting Spacing from a Single Page

```javascript
const extractSpacing = require('./src/extractors/extract-spacing');
const { chromium } = require('@playwright/test');

async function extractSpacingFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract spacing from a specific page
    const result = await extractSpacing.extractSpacingFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Spacing extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Spacing extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractSpacingFromSinglePage();
```

## Spacing Processing

### Value Normalization

When `normalizeValues` is enabled, the Spacing Extractor converts all spacing values to pixels (px) for consistency. It handles various units including:

- Pixels (px)
- Ems (em)
- Rems (rem)
- Percentages (%)
- Viewport units (vw, vh)
- Points (pt)

### Value Grouping

When `groupValues` is enabled, the extractor groups similar spacing values to identify spacing scales. This helps create a consistent spacing system for the design tokens.

The grouping algorithm:
1. Sorts all spacing values numerically
2. Identifies patterns and clusters of values
3. Creates named groups (xs, sm, md, lg, xl) based on the value ranges

## Troubleshooting

### Common Issues

1. **No spacing values extracted**
   - Check if the website uses standard CSS properties for spacing
   - Ensure the website is accessible and loads properly
   - Try increasing the timeout value in the configuration

2. **Missing spacing variables**
   - Some websites don't use CSS variables for spacing
   - Check if the website uses inline styles or other methods for applying spacing

3. **Inconsistent spacing values**
   - Try enabling `normalizeValues` to convert all units to pixels
   - Adjust the `minOccurrences` value to filter out less common spacing values

### Error Handling

The Spacing Extractor provides detailed error information in the result object:

```javascript
const result = await extractSpacing.extractSpacingFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Spacing extraction can be resource-intensive on large websites
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- The `normalizeValues` and `groupValues` options add additional processing time when enabled

## Related Components

- [Typography Extractor](./typography-extractor.md)
- [Colors Extractor](./colors-extractor.md)
- [Borders Extractor](./borders-extractor.md)
- [Animations Extractor](./animations-extractor.md)
