# Components Extractor

## Overview

The Components Extractor is responsible for analyzing web pages and identifying repeating UI patterns as components. It extracts component structure, styles, and variations, helping to create a component library based on the actual implementation in a website.

## Features

- Identifies UI components based on selectors and patterns
- Extracts component HTML structure
- Captures component styles and properties
- Detects component variations and states
- Groups similar components into component types
- Generates component visualizations
- Creates a component library for documentation

## Usage

### Basic Usage

```javascript
const extractComponents = require('./src/extractors/extract-components');

// Extract components from crawled pages
const result = await extractComponents.extractComponentsFromCrawledPages();

if (result.success) {
  console.log('Component extraction completed successfully!');
  console.log(`Components found: ${result.data.results.components.reduce((total, page) => total + page.components.length, 0)}`);
  console.log(`Component types: ${result.data.componentLibrary.types.length}`);
} else {
  console.error('Component extraction failed:', result.error.message);
}
```

### Configuration Options

The Components Extractor accepts the following configuration options:

```javascript
const config = {
  // Output file path for the extracted component data
  outputFile: './config/components.json',
  
  // Filtered component list - only extract components matching these machine names
  FilteredComponentList: ['button', 'card', 'modal', 'navigation'],
  
  // Output file path for the component report
  reportFile: './results/reports/component-library.html',
  
  // Directory for screenshots and visualizations
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a component to be considered significant
  minOccurrences: 2,
  
  // Component selectors to look for
  componentSelectors: [
    '.card',
    '.button',
    '.nav-item',
    '.modal',
    '.form-group',
    '[data-component]'
  ],
  
  // Whether to use Twig debug mode for component detection
  twigDebugMode: false,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/components',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};

const result = await extractComponents.extractComponentsFromCrawledPages(config);
```

## Component Filtering

The extractor can filter components based on a list of machine names. This is useful when you only want to extract specific components from a website that has many different components.

When the `FilteredComponentList` is provided, the extractor will:

1. Only extract components whose type, class names, or data attributes match one of the filter terms
2. Check HTML comments surrounding the element for filter terms
3. Filter case-insensitively (e.g., "button" will match "Button", "BUTTON", etc.)

Example filter list:
```javascript
"FilteredComponentList": [
  "button",
  "card",
  "modal",
  "accordion",
  "tabs",
  "form",
  "hero",
  "banner"
]
```

If the list is empty or not provided, all components matching the selectors will be extracted.

## API Reference

### Functions

#### `extractComponentsFromCrawledPages(customConfig = {}, browser = null, logger = console)`

Main function to extract components from crawled pages.

**Parameters:**
- `customConfig` (Object): Custom configuration options
- `browser` (Browser, optional): Playwright browser instance
- `logger` (Object, optional): Logger object

**Returns:**
- Promise<Object>: Component extraction results

#### `extractComponentsFromPage(page, url = null, config = defaultConfig)`

Extract components from a single page.

**Parameters:**
- `page` (Page): Playwright page object
- `url` (string, optional): URL to navigate to
- `config` (Object): Configuration object

**Returns:**
- Promise<Object>: Component data for the page

#### `generateComponentLibrary(components)`

Generate a component library from extracted components.

**Parameters:**
- `components` (Array): Array of component data from pages

**Returns:**
- Object: Component library with types, variations, and examples

#### `generateComponentReport(componentLibrary, outputFile)`

Generate an HTML report for the component library.

**Parameters:**
- `componentLibrary` (Object): Component library data
- `outputFile` (string): Output file path for the report

**Returns:**
- Promise<void>

#### `extractComponents(page, config)`

Internal function to extract components from the current page.

**Parameters:**
- `page` (Page): Playwright page object
- `config` (Object): Configuration object

**Returns:**
- Promise<Array>: Extracted component data

## Output Format

The Components Extractor generates a JSON file with the following structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website"
    }
  ],
  "components": [
    {
      "url": "https://example.com",
      "components": [
        {
          "selector": ".card",
          "type": "card",
          "html": "<div class=\"card\"><div class=\"card-header\">Title</div><div class=\"card-body\">Content</div></div>",
          "styles": {
            "display": "flex",
            "flexDirection": "column",
            "borderRadius": "4px",
            "boxShadow": "0 1px 3px rgba(0,0,0,0.1)",
            "margin": "16px",
            "padding": "16px"
          },
          "children": [
            {
              "selector": ".card-header",
              "styles": {
                "fontWeight": "bold",
                "fontSize": "18px",
                "marginBottom": "8px"
              }
            },
            {
              "selector": ".card-body",
              "styles": {
                "fontSize": "16px"
              }
            }
          ],
          "variations": [
            {
              "selector": ".card.primary",
              "styles": {
                "backgroundColor": "#f0f8ff"
              }
            },
            {
              "selector": ".card.secondary",
              "styles": {
                "backgroundColor": "#f5f5f5"
              }
            }
          ],
          "occurrences": 12
        }
      ]
    }
  ],
  "componentLibrary": {
    "types": [
      {
        "name": "card",
        "selectors": [".card"],
        "occurrences": 12,
        "examples": [
          {
            "url": "https://example.com",
            "html": "<div class=\"card\"><div class=\"card-header\">Title</div><div class=\"card-body\">Content</div></div>",
            "screenshot": "card-example-1.png"
          }
        ],
        "variations": [
          {
            "name": "primary",
            "selector": ".card.primary",
            "styles": {
              "backgroundColor": "#f0f8ff"
            }
          },
          {
            "name": "secondary",
            "selector": ".card.secondary",
            "styles": {
              "backgroundColor": "#f5f5f5"
            }
          }
        ]
      }
    ]
  }
}
```

## Examples

### Extracting Components with Custom Configuration

```javascript
const extractComponents = require('./src/extractors/extract-components');
const { chromium } = require('@playwright/test');

async function extractComponentsWithCustomConfig() {
  // Custom configuration
  const config = {
    outputFile: './custom-config/components.json',
    minOccurrences: 2,
    componentSelectors: [
      '.button',
      '.card',
      '.modal',
      '[data-component]'
    ]
  };
  
  // Launch browser
  const browser = await chromium.launch();
  
  try {
    // Extract components
    const result = await extractComponents.extractComponentsFromCrawledPages(config, browser);
    
    if (result.success) {
      console.log('Component extraction completed successfully!');
      console.log(`Components found: ${result.data.results.components.reduce((total, page) => total + page.components.length, 0)}`);
      console.log(`Component types: ${result.data.componentLibrary.types.length}`);
    } else {
      console.error('Component extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractComponentsWithCustomConfig();
```

### Extracting Components from a Single Page

```javascript
const extractComponents = require('./src/extractors/extract-components');
const { chromium } = require('@playwright/test');

async function extractComponentsFromSinglePage() {
  // Launch browser
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Extract components from a specific page
    const result = await extractComponents.extractComponentsFromPage(
      page, 
      'https://example.com'
    );
    
    if (result.success) {
      console.log('Component extraction completed successfully!');
      console.log(result.data);
    } else {
      console.error('Component extraction failed:', result.error.message);
    }
  } finally {
    // Close browser
    await browser.close();
  }
}

extractComponentsFromSinglePage();
```

## Component Detection

### Detection Methods

The Components Extractor uses several methods to identify components:

1. **Selector-based detection**: Looks for elements matching the selectors specified in `componentSelectors`
2. **Data attribute detection**: Identifies elements with data attributes like `data-component`
3. **Pattern recognition**: Identifies repeating patterns in the DOM structure
4. **Twig debug mode**: When enabled, uses Twig debug comments to identify components in Twig templates

### Component Structure Analysis

For each identified component, the extractor:
1. Captures the HTML structure
2. Extracts computed styles for the component and its children
3. Identifies variations based on class modifiers
4. Captures screenshots for visual reference
5. Counts occurrences across pages

### Component Grouping

The extractor groups similar components into component types based on:
- Selector patterns
- HTML structure similarity
- Style property patterns

This helps create a more organized component library with clear component types and variations.

## Troubleshooting

### Common Issues

1. **No components detected**
   - Check if the website uses the component selectors specified in the configuration
   - Try adding more generic selectors or data attributes to the `componentSelectors` list
   - Enable `twigDebugMode` if the site uses Twig templates

2. **Too many false positives**
   - Increase the `minOccurrences` value to filter out less common patterns
   - Use more specific selectors in the `componentSelectors` list

3. **Missing component variations**
   - Check if the website uses consistent class naming for component variations
   - Some variations might be applied via JavaScript and may not be detected

### Error Handling

The Components Extractor provides detailed error information in the result object:

```javascript
const result = await extractComponents.extractComponentsFromCrawledPages();

if (!result.success) {
  console.error('Error type:', result.error.type);
  console.error('Error message:', result.error.message);
  console.error('Error stack:', result.error.stack);
}
```

## Performance Considerations

- Component extraction is the most resource-intensive of all extractors
- Consider using the telemetry options to monitor performance
- For very large sites, you may want to limit the number of pages analyzed
- Component detection can be slow on pages with complex DOM structures

## Related Components

- [Typography Extractor](./typography-extractor.md)
- [Colors Extractor](./colors-extractor.md)
- [Spacing Extractor](./spacing-extractor.md)
- [Borders Extractor](./borders-extractor.md)
- [Animations Extractor](./animations-extractor.md)
