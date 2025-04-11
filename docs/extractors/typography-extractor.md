# Typography Extractor

## Overview

The Typography Extractor is responsible for analyzing web pages and extracting typography-related design elements, including font families, font sizes, font weights, line heights, letter spacing, and text styles. It helps identify the typography system used in a website and generates standardized tokens for design systems.

## Features

- Extracts font families used across the website
- Identifies font sizes and creates a size scale
- Captures font weights for different text elements
- Analyzes line heights and letter spacing
- Identifies text styles (headings, body text, etc.)
- Supports responsive typography analysis
- Generates CSS variables for typography tokens

## Usage

### Basic Usage

```javascript
const extractTypography = require('./src/extractors/extract-typography');

// Extract typography from crawled pages
const result = await extractTypography.extractTypographyFromCrawledPages();

if (result.success) {
  console.log('Typography extraction completed successfully!');
  console.log(`Font families found: ${result.data.fontFamilies.length}`);
  console.log(`Font sizes found: ${result.data.fontSizes.length}`);
} else {
  console.error('Typography extraction failed:', result.error.message);
}
```

### Configuration Options

The Typography Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted typography data
  outputFile: './results/raw/typography-analysis.json',
  
  // Directory for screenshots (if enabled)
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a value to be considered significant
  minOccurrences: 3,
  
  // Whether to analyze responsive typography
  analyzeResponsive: true,
  
  // Viewport sizes to analyze for responsive typography
  viewports: [
    { width: 375, height: 667, name: 'mobile' },
    { width: 768, height: 1024, name: 'tablet' },
    { width: 1440, height: 900, name: 'desktop' }
  ],
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/typography',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractTypography.extractTypographyFromCrawledPages(config);
```

## API Reference

### Functions

#### `extractTypographyFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract typography from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Typography extraction results

#### `extractTypographyFromPage(page, url = null, config = defaultConfig)`

Extract typography from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Typography data for the page

#### `generateTypographyVisualization(page, typographyData, outputDir)`

Generate visualizations for typography data.

**Parameters:**
- `page` (Page): Playwright page object
- `typographyData` (Object): Typography data
- `outputDir` (string): Output directory for visualizations

**Returns:**
- Promise<void>

## Output Format

The Typography Extractor generates a JSON file with the following structure:

```json
{
  "fontFamilies": [
    "Arial",
    "Roboto",
    "Open Sans"
  ],
  "fontSizes": [
    "12px",
    "14px",
    "16px",
    "18px",
    "24px",
    "32px"
  ],
  "fontWeights": [
    "400",
    "500",
    "700"
  ],
  "lineHeights": [
    "1.2",
    "1.5",
    "1.7"
  ],
  "letterSpacings": [
    "normal",
    "0.5px",
    "1px"
  ],
  "textStyles": [
    {
      "name": "heading-1",
      "selector": "h1",
      "fontFamily": "Roboto",
      "fontSize": "32px",
      "fontWeight": "700",
      "lineHeight": "1.2",
      "letterSpacing": "normal",
      "occurrences": 5
    },
    {
      "name": "body",
      "selector": "p",
      "fontFamily": "Arial",
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "1.5",
      "letterSpacing": "normal",
      "occurrences": 42
    }
  ],
  "responsiveStyles": {
    "mobile": {
      "fontSizes": ["12px", "14px", "18px", "24px"],
      "textStyles": [
        // Mobile-specific text styles
      ]
    },
    "tablet": {
      "fontSizes": ["14px", "16px", "20px", "28px"],
      "textStyles": [
        // Tablet-specific text styles
      ]
    },
    "desktop": {
      "fontSizes": ["16px", "18px", "24px", "32px"],
      "textStyles": [
        // Desktop-specific text styles
      ]
    }
  },
  "cssVars": {
    "--font-family-primary": "Roboto",
    "--font-family-secondary": "Arial",
    "--font-size-xs": "12px",
    "--font-size-sm": "14px",
    "--font-size-md": "16px",
    "--font-size-lg": "18px",
    "--font-size-xl": "24px",
    "--font-size-xxl": "32px",
    "--font-weight-regular": "400",
    "--font-weight-medium": "500",
    "--font-weight-bold": "700",
    "--line-height-tight": "1.2",
    "--line-height-normal": "1.5",
    "--line-height-loose": "1.7",
    "--letter-spacing-normal": "normal",
    "--letter-spacing-wide": "0.5px",
    "--letter-spacing-wider": "1px"
  }
}
```

## Examples

### Extracting Typography with Custom Configuration

```javascript
const extractTypography = require('./src/extractors/extract-typography');
const { chromium } = require('@playwright/test');

async function extractTypographyWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-results/typography.json',
    minOccurrences: 2,
    analyzeResponsive: true,
    viewports: [
      { width: 375, height: 667, name: 'mobile' },
      { width: 1440, height: 900, name: 'desktop' }
    ]
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract typography
    const result = await extractTypography.extractTypographyFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Typography extraction completed successfully!');
      console.log(`Font families found: ${result.data.fontFamilies.length}`);
      console.log(`Font sizes found: ${result.data.fontSizes.length}`);
      console.log(`Text styles found: ${result.data.textStyles.length}`);
    } else {
      console.error('Typography extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractTypographyWithCustomConfig();
```

### Extracting Typography from a Single Page

```javascript
const extractTypography = require('./src/extractors/extract-typography');
const { chromium } = require('@playwright/test');

async function extractTypographyFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract typography from a specific page
    const result = await extractTypography.extractTypographyFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Typography extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Typography extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractTypographyFromSinglePage();
```

## Troubleshooting

### Common Issues

1. **No typography data extracted**
   - Check if the website uses standard CSS properties for typography
   - Ensure the website is accessible and loads properly
   - Try increasing the timeout value in the configuration

2. **Missing font families**
   - Some websites load fonts dynamically or use font-face declarations
   - Check if the website uses web fonts that might not be detected

3. **Inconsistent text styles**
   - Try adjusting the `minOccurrences` value to filter out less common styles
   - Some websites use inline styles that can create noise in the results

### Error Handling

The Typography Extractor provides detailed error information in the result object:

```javascript
const result = await extractTypography.extractTypographyFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Typography extraction can be resource-intensive on large websites
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- The `analyzeResponsive` option adds additional processing time when enabled

## Related Components

- [Color Extractor](./colors-extractor.md)
- [Spacing Extractor](./spacing-extractor.md)
- [Borders Extractor](./borders-extractor.md)
- [Animations Extractor](./animations-extractor.md)
