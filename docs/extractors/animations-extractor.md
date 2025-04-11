# Animations Extractor

## Overview

The Animations Extractor is responsible for analyzing web pages and extracting animation-related design elements, including transition durations, timing functions, delays, and keyframe animations. It helps identify the animation system used in a website and generates standardized tokens for design systems.

## Features

- Extracts transition duration values from various elements
- Identifies timing functions (ease, linear, cubic-bezier, etc.)
- Captures transition delay values
- Detects keyframe animations and their properties
- Detects CSS animation variables
- Generates animation visualizations
- Creates CSS variables for animation tokens

## Usage

### Basic Usage

```javascript
const extractAnimations = require('./src/extractors/extract-animations');

// Extract animations from crawled pages
const result = await extractAnimations.extractAnimationsFromCrawledPages();

if (result.success) {
  console.log('Animation extraction completed successfully!');
  console.log(`Durations found: ${result.data.allDurations.length}`);
  console.log(`Timing functions found: ${result.data.allTimingFunctions.length}`);
  console.log(`Delays found: ${result.data.allDelays.length}`);
  console.log(`Keyframes found: ${Object.keys(result.data.keyframes).length}`);
} else {
  console.error('Animation extraction failed:', result.error.message);
}
```

### Configuration Options

The Animations Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted animation data
  outputFile: './results/raw/animations-analysis.json',
  
  // Directory for screenshots and visualizations
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for an animation value to be considered significant
  minOccurrences: 3,
  
  // Whether to normalize time values (convert to ms)
  normalizeValues: true,
  
  // Whether to group similar animation values
  groupSimilarValues: true,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/animations',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractAnimations.extractAnimationsFromCrawledPages(config);
```

## API Reference

### Functions

#### `extractAnimationsFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract animations from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Animation extraction results

#### `extractAnimationsFromPage(page, url = null, config = defaultConfig)`

Extract animations from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Animation data for the page

#### `generateAnimationVisualization(page, animationData, outputDir)`

Generate visualizations for animation data.

**Parameters:**
- `page` (Page): Playwright page object
- `animationData` (Object): Animation data
- `outputDir` (string): Output directory for visualizations

**Returns:**
- Promise<void>

#### `extractAnimations(page, config)`

Internal function to extract animations from the current page.

**Parameters:**
- `page` (Page): Playwright page object
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Extracted animation data

## Output Format

The Animations Extractor generates a JSON file with the following structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website",
      "animations": {
        "durations": ["200ms", "300ms", "500ms"],
        "timingFunctions": ["ease", "ease-in-out", "cubic-bezier(0.42, 0, 0.58, 1)"],
        "delays": ["0ms", "100ms", "200ms"],
        "keyframes": {
          "fade-in": "@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }",
          "slide-in": "@keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }"
        }
      }
    }
  ],
  "allDurations": [
    {
      "value": "200ms",
      "occurrences": 42,
      "elements": ["button", "a", ".card"]
    },
    {
      "value": "300ms",
      "occurrences": 25,
      "elements": [".modal", ".dropdown"]
    }
  ],
  "allTimingFunctions": [
    {
      "value": "ease",
      "occurrences": 50,
      "elements": ["button", "a", ".card"]
    },
    {
      "value": "ease-in-out",
      "occurrences": 30,
      "elements": [".modal", ".dropdown"]
    }
  ],
  "allDelays": [
    {
      "value": "0ms",
      "occurrences": 60,
      "elements": ["button", "a", ".card"]
    },
    {
      "value": "100ms",
      "occurrences": 15,
      "elements": [".staggered-item"]
    }
  ],
  "keyframes": {
    "fade-in": {
      "definition": "@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }",
      "occurrences": 10,
      "elements": [".fade-in", ".modal"]
    },
    "slide-in": {
      "definition": "@keyframes slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }",
      "occurrences": 8,
      "elements": [".slide-in", ".drawer"]
    }
  },
  "cssVars": {
    "--duration-fast": "200ms",
    "--duration-medium": "300ms",
    "--duration-slow": "500ms",
    "--timing-default": "ease",
    "--timing-smooth": "ease-in-out",
    "--timing-bounce": "cubic-bezier(0.42, 0, 0.58, 1)",
    "--delay-none": "0ms",
    "--delay-short": "100ms",
    "--delay-medium": "200ms"
  }
}
```

## Examples

### Extracting Animations with Custom Configuration

```javascript
const extractAnimations = require('./src/extractors/extract-animations');
const { chromium } = require('@playwright/test');

async function extractAnimationsWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-results/animations.json',
    minOccurrences: 2,
    normalizeValues: true,
    groupSimilarValues: true
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract animations
    const result = await extractAnimations.extractAnimationsFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Animation extraction completed successfully!');
      console.log(`Durations found: ${result.data.allDurations.length}`);
      console.log(`Timing functions found: ${result.data.allTimingFunctions.length}`);
      console.log(`Keyframes found: ${Object.keys(result.data.keyframes).length}`);
    } else {
      console.error('Animation extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractAnimationsWithCustomConfig();
```

### Extracting Animations from a Single Page

```javascript
const extractAnimations = require('./src/extractors/extract-animations');
const { chromium } = require('@playwright/test');

async function extractAnimationsFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract animations from a specific page
    const result = await extractAnimations.extractAnimationsFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Animation extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Animation extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractAnimationsFromSinglePage();
```

## Animation Processing

### Value Normalization

When `normalizeValues` is enabled, the Animations Extractor converts all time values to milliseconds (ms) for consistency. It handles various time formats including:

- Milliseconds (ms)
- Seconds (s)

### Timing Function Parsing

The extractor parses timing functions to extract:
- Predefined functions (ease, linear, ease-in, ease-out, ease-in-out)
- Cubic Bezier functions with their control points
- Step functions with their step count and direction

This allows for better categorization and grouping of timing functions based on their visual impact.

### Keyframe Analysis

The extractor analyzes keyframe animations to extract:
- Animation name
- Keyframe percentages (from, to, 0%, 25%, 50%, 75%, 100%)
- Properties being animated
- Property values at each keyframe

## Troubleshooting

### Common Issues

1. **No animation values extracted**
   - Check if the website uses standard CSS properties for animations
   - Ensure the website is accessible and loads properly
   - Try increasing the timeout value in the configuration

2. **Missing animation variables**
   - Some websites don't use CSS variables for animations
   - Check if the website uses inline styles or other methods for applying animations

3. **Inconsistent animation values**
   - Try enabling `normalizeValues` to convert all time units to milliseconds
   - Adjust the `minOccurrences` value to filter out less common animation values

### Error Handling

The Animations Extractor provides detailed error information in the result object:

```javascript
const result = await extractAnimations.extractAnimationsFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Animation extraction can be resource-intensive on large websites
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- The `normalizeValues` and `groupSimilarValues` options add additional processing time when enabled

## Related Components

- [Typography Extractor](./typography-extractor.md)
- [Colors Extractor](./colors-extractor.md)
- [Spacing Extractor](./spacing-extractor.md)
- [Borders Extractor](./borders-extractor.md)
