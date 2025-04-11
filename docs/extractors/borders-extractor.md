# Borders Extractor

## Overview

The Borders Extractor is responsible for analyzing web pages and extracting border-related design elements, including border widths, border styles, border radii, and box shadows. It helps identify the border system used in a website and generates standardized tokens for design systems.

## Features

- Extracts border width values from various elements
- Identifies border style values (solid, dashed, dotted, etc.)
- Captures border radius values for rounded corners
- Detects box shadow values for depth and elevation
- Detects CSS border variables
- Generates border visualizations
- Creates CSS variables for border tokens

## Usage

### Basic Usage

```javascript
const extractBorders = require('./src/extractors/extract-borders');

// Extract borders from crawled pages
const result = await extractBorders.extractBordersFromCrawledPages();

if (result.success) {
  console.log('Border extraction completed successfully!');
  console.log(`Border widths found: ${result.data.allBorderWidths.length}`);
  console.log(`Border styles found: ${result.data.allBorderStyles.length}`);
  console.log(`Border radii found: ${result.data.allBorderRadii.length}`);
  console.log(`Shadows found: ${result.data.allShadows.length}`);
} else {
  console.error('Border extraction failed:', result.error.message);
}
```

### Configuration Options

The Borders Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted border data
  outputFile: './results/raw/borders-analysis.json',
  
  // Directory for screenshots and visualizations
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a border value to be considered significant
  minOccurrences: 3,
  
  // Whether to normalize border values (convert to px)
  normalizeValues: true,
  
  // Whether to group similar border values
  groupSimilarValues: true,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/borders',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractBorders.extractBordersFromCrawledPages(config);
```

## API Reference

### Functions

#### `extractBordersFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract borders from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Border extraction results

#### `extractBordersFromPage(page, url = null, config = defaultConfig)`

Extract borders from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Border data for the page

#### `generateBorderVisualization(page, borderData, outputDir)`

Generate visualizations for border data.

**Parameters:**
- `page` (Page): Playwright page object
- `borderData` (Object): Border data
- `outputDir` (string): Output directory for visualizations

**Returns:**
- Promise<void>

#### `extractBorders(page, config)`

Internal function to extract borders from the current page.

**Parameters:**
- `page` (Page): Playwright page object
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Extracted border data

## Output Format

The Borders Extractor generates a JSON file with the following structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website",
      "borders": {
        "widths": ["1px", "2px", "3px"],
        "styles": ["solid", "dashed", "dotted"],
        "radii": ["4px", "8px", "16px", "50%"],
        "shadows": ["0 1px 3px rgba(0,0,0,0.1)", "0 4px 6px rgba(0,0,0,0.2)"]
      }
    }
  ],
  "allBorderWidths": [
    {
      "value": "1px",
      "occurrences": 42,
      "elements": ["div", "button", "input"]
    },
    {
      "value": "2px",
      "occurrences": 15,
      "elements": ["button:hover", "input:focus"]
    }
  ],
  "allBorderStyles": [
    {
      "value": "solid",
      "occurrences": 50,
      "elements": ["div", "button", "input"]
    },
    {
      "value": "dashed",
      "occurrences": 8,
      "elements": ["div.dashed", "hr"]
    }
  ],
  "allBorderRadii": [
    {
      "value": "4px",
      "occurrences": 30,
      "elements": ["button", "input", "card"]
    },
    {
      "value": "50%",
      "occurrences": 12,
      "elements": [".avatar", ".circle"]
    }
  ],
  "allShadows": [
    {
      "value": "0 1px 3px rgba(0,0,0,0.1)",
      "occurrences": 25,
      "elements": [".card", ".button"]
    },
    {
      "value": "0 4px 6px rgba(0,0,0,0.2)",
      "occurrences": 15,
      "elements": [".card:hover", ".dropdown"]
    }
  ],
  "cssVars": {
    "--border-width-sm": "1px",
    "--border-width-md": "2px",
    "--border-width-lg": "3px",
    "--border-radius-sm": "4px",
    "--border-radius-md": "8px",
    "--border-radius-lg": "16px",
    "--border-radius-circle": "50%",
    "--shadow-sm": "0 1px 3px rgba(0,0,0,0.1)",
    "--shadow-md": "0 4px 6px rgba(0,0,0,0.2)"
  }
}
```

## Examples

### Extracting Borders with Custom Configuration

```javascript
const extractBorders = require('./src/extractors/extract-borders');
const { chromium } = require('@playwright/test');

async function extractBordersWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-results/borders.json',
    minOccurrences: 2,
    normalizeValues: true,
    groupSimilarValues: true
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract borders
    const result = await extractBorders.extractBordersFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Border extraction completed successfully!');
      console.log(`Border widths found: ${result.data.allBorderWidths.length}`);
      console.log(`Border styles found: ${result.data.allBorderStyles.length}`);
      console.log(`Border radii found: ${result.data.allBorderRadii.length}`);
      console.log(`Shadows found: ${result.data.allShadows.length}`);
    } else {
      console.error('Border extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractBordersWithCustomConfig();
```

### Extracting Borders from a Single Page

```javascript
const extractBorders = require('./src/extractors/extract-borders');
const { chromium } = require('@playwright/test');

async function extractBordersFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract borders from a specific page
    const result = await extractBorders.extractBordersFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Border extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Border extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractBordersFromSinglePage();
```

## Border Processing

### Value Normalization

When `normalizeValues` is enabled, the Borders Extractor converts all border values to pixels (px) for consistency. It handles various units including:

- Pixels (px)
- Ems (em)
- Rems (rem)
- Percentages (%)
- Viewport units (vw, vh)
- Points (pt)

### Shadow Parsing

The extractor parses box shadow values to extract:
- Horizontal offset
- Vertical offset
- Blur radius
- Spread radius
- Color
- Inset property

This allows for better categorization and grouping of shadow values based on their visual impact.

## Troubleshooting

### Common Issues

1. **No border values extracted**
   - Check if the website uses standard CSS properties for borders
   - Ensure the website is accessible and loads properly
   - Try increasing the timeout value in the configuration

2. **Missing border variables**
   - Some websites don't use CSS variables for borders
   - Check if the website uses inline styles or other methods for applying borders

3. **Inconsistent border values**
   - Try enabling `normalizeValues` to convert all units to pixels
   - Adjust the `minOccurrences` value to filter out less common border values

### Error Handling

The Borders Extractor provides detailed error information in the result object:

```javascript
const result = await extractBorders.extractBordersFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Border extraction can be resource-intensive on large websites
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- The `normalizeValues` and `groupSimilarValues` options add additional processing time when enabled

## Related Components

- [Typography Extractor](./typography-extractor.md)
- [Colors Extractor](./colors-extractor.md)
- [Spacing Extractor](./spacing-extractor.md)
- [Animations Extractor](./animations-extractor.md)
