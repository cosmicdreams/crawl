# Design Token Crawler Extractors

## Overview

The Design Token Crawler includes several specialized extractors that analyze web pages and extract design elements. Each extractor focuses on a specific aspect of the design system, such as typography, colors, spacing, borders, animations, and components.

This documentation provides comprehensive information about each extractor, including their features, configuration options, API references, output formats, and usage examples.

## Available Extractors

| Extractor | Description | Documentation |
|-----------|-------------|---------------|
| Typography Extractor | Extracts font families, sizes, weights, line heights, letter spacing, and text styles | [Typography Extractor](./typography-extractor.md) |
| Colors Extractor | Extracts text colors, background colors, border colors, and color variables | [Colors Extractor](./colors-extractor.md) |
| Spacing Extractor | Extracts margin, padding, and gap values | [Spacing Extractor](./spacing-extractor.md) |
| Borders Extractor | Extracts border widths, styles, radii, and box shadows | [Borders Extractor](./borders-extractor.md) |
| Animations Extractor | Extracts transition durations, timing functions, delays, and keyframe animations | [Animations Extractor](./animations-extractor.md) |
| Components Extractor | Identifies UI components, their structure, styles, and variations | [Components Extractor](./components-extractor.md) |

## Common Features

All extractors share the following common features:

- **Page Analysis**: Each extractor analyzes web pages to extract specific design elements
- **Value Extraction**: Extractors identify and extract values from computed styles
- **Value Normalization**: Most extractors can normalize values to a consistent format
- **Value Grouping**: Extractors can group similar values to identify patterns
- **CSS Variable Detection**: Extractors detect and extract CSS variables
- **Visualization Generation**: Extractors can generate visualizations of the extracted data
- **Token Generation**: Extractors provide data for generating design tokens
- **Telemetry**: All extractors support performance monitoring through telemetry

## Using Extractors

### Basic Usage Pattern

All extractors follow a similar usage pattern:

```javascript
const extractor = require('./src/extractors/extract-[type]');

// Extract from crawled pages
const result = await extractor.extract[Type]FromCrawledPages();

if (result.success) {
  console.log('Extraction completed successfully!');
  console.log(result.data);
} else {
  console.error('Extraction failed:', result.error.message);
}
```

### Configuration Options

All extractors accept a configuration object with common options:

```javascript
const config = {
  // Output file path for the extracted data
  outputFile: './results/raw/[type]-analysis.json',
  
  // Directory for screenshots and visualizations
  screenshotsDir: './results/screenshots',
  
  // Whether to write results to file
  writeToFile: true,
  
  // Whether to generate visualizations
  generateVisualizations: true,
  
  // Minimum occurrences for a value to be considered significant
  minOccurrences: 3,
  
  // Telemetry options for performance monitoring
  telemetry: {
    enabled: true,
    outputDir: './results/telemetry/[type]',
    logToConsole: true,
    writeToFile: true,
    minDuration: 5,
    includeTimestamps: true,
    includeMemoryUsage: true
  }
};
```

Each extractor may have additional configuration options specific to its functionality.

### Extractor Output

All extractors generate a JSON file with a similar structure:

```json
{
  "pagesAnalyzed": [
    {
      "url": "https://example.com",
      "title": "Example Website",
      "[type]": {
        // Type-specific data
      }
    }
  ],
  "all[Type]Values": [
    {
      "value": "value",
      "occurrences": 42,
      "elements": ["selector1", "selector2"]
    }
  ],
  "[type]Groups": {
    // Grouped values
  },
  "cssVars": {
    // CSS variables
  }
}
```

The specific structure varies depending on the extractor type.

## Extending Extractors

You can extend the existing extractors or create new ones by following these guidelines:

1. Create a new file in the `src/extractors` directory
2. Follow the naming convention: `extract-[type].js`
3. Implement the main extraction function: `extract[Type]FromCrawledPages`
4. Implement the page extraction function: `extract[Type]FromPage`
5. Implement the visualization function: `generate[Type]Visualization`
6. Export the functions for use in the main application

See the existing extractors for examples of the implementation pattern.

## Performance Considerations

- Extraction can be resource-intensive, especially on large websites
- Use the telemetry options to monitor performance
- Consider limiting the number of pages analyzed for very large sites
- Some extraction options (normalization, grouping) add processing overhead

## Related Documentation

- [Design Token Crawler Overview](../index.md)
- [Site Crawler Documentation](../crawler/site-crawler.md)
- [Token Generator Documentation](../generators/token-generator.md)
- [Report Generator Documentation](../generators/report-generator.md)
