# Design Token Crawler Documentation

## Overview

The Design Token Crawler is a Node.js application that analyzes websites to extract design elements and generate design tokens. It helps bridge the gap between implemented designs and formal design systems by automatically documenting the design patterns used in a website.

## Features

- **Website Crawling**: Automatically discovers and navigates web pages
- **Design Element Extraction**: Extracts typography, colors, spacing, borders, animations, and components
- **Design Token Generation**: Creates standardized design tokens in various formats
- **Report Generation**: Produces visual reports and documentation
- **Performance Monitoring**: Includes telemetry for performance tracking

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/design-token-crawler.git
cd design-token-crawler

# Install dependencies
npm install
```

### Basic Usage

```bash
# Run with default settings
node run.js --url https://example.com

# List available extractors
node run.js --list

# Run specific extractors
node run.js --url https://example.com --only typography,colors

# Set maximum pages to crawl
node run.js --url https://example.com --max-pages 10

# Specify output directory
node run.js --url https://example.com --output ./my-results
```

### Configuration

Create a `config.json` file in the project root to customize the crawler's behavior:

```json
{
  "baseUrl": "https://example.com",
  "maxPages": 10,
  "timeout": 30000,
  "ignorePatterns": ["/admin/", "/login/"],
  "ignoreExtensions": [".pdf", ".zip", ".jpg", ".png"],
  "screenshotsEnabled": true,
  "extractors": ["typography", "colors", "spacing", "borders", "animations"],
  "outputDir": "./results"
}
```

## Architecture

The Design Token Crawler is organized into several key components:

### Site Crawler

The [Site Crawler](./crawler/site-crawler.md) is responsible for:
- Navigating to the specified URL
- Discovering and following internal links
- Building a site map
- Capturing screenshots (if enabled)

### Extractors

The Design Token Crawler includes several specialized extractors:

- [Typography Extractor](./extractors/typography-extractor.md): Extracts font families, sizes, weights, line heights, letter spacing, and text styles
- [Colors Extractor](./extractors/colors-extractor.md): Extracts text colors, background colors, border colors, and color variables
- [Spacing Extractor](./extractors/spacing-extractor.md): Extracts margin, padding, and gap values
- [Borders Extractor](./extractors/borders-extractor.md): Extracts border widths, styles, radii, and box shadows
- [Animations Extractor](./extractors/animations-extractor.md): Extracts transition durations, timing functions, delays, and keyframe animations
- [Components Extractor](./extractors/components-extractor.md): Identifies UI components, their structure, styles, and variations

See the [Extractors Index](./extractors/index.md) for more information.

### Generators

The Design Token Crawler includes generators for creating design tokens and reports:

- [Token Generator](./generators/token-generator.md): Generates design tokens in various formats (CSS variables, JSON, Figma tokens)
- [Report Generator](./generators/report-generator.md): Creates visual reports and documentation

### Utilities

The Design Token Crawler includes several utility modules:

- [Config Manager](./utils/config-manager.md): Manages application configuration
- [Cache Manager](./utils/cache-manager.md): Handles caching for improved performance
- [Telemetry Manager](./utils/telemetry-manager.md): Provides performance monitoring
- [Parallel Processor](./utils/parallel-processor.md): Enables parallel processing for improved performance

## Workflow

The Design Token Crawler follows this general workflow:

1. **Configuration**: Load settings from config.json and command-line arguments
2. **Crawling**: Navigate the website and collect URLs
3. **Extraction**: Run selected extractors on the crawled pages
4. **Token Generation**: Convert extracted data into design tokens
5. **Report Generation**: Create visual reports and documentation

## Output

The Design Token Crawler generates several types of output:

### Raw Data (JSON)

- `results/raw/crawl-results.json`: Raw crawler output
- `results/raw/typography-analysis.json`: Typography extraction data
- `results/raw/color-analysis.json`: Color extraction data
- `results/raw/spacing-analysis.json`: Spacing extraction data
- `results/raw/borders-analysis.json`: Border extraction data
- `results/raw/animations-analysis.json`: Animation extraction data

### Design Tokens

- `results/css/variables.css`: All CSS variables
- `results/css/typography.css`: Typography-specific CSS
- `results/css/colors.css`: Color-specific CSS
- `results/css/spacing.css`: Spacing-specific CSS
- `results/css/borders.css`: Border-specific CSS
- `results/css/animations.css`: Animation-specific CSS
- `results/tokens/tokens.json`: JSON format tokens
- `results/tokens/figma-tokens.json`: Figma-compatible tokens

### Reports

- `results/reports/crawl-report.html`: Site crawl summary
- `results/reports/design-system-report.html`: Design system overview
- `results/reports/component-library.html`: Component documentation

### Other

- `config/paths.json`: List of discovered URLs
- `config/components.json`: Component extraction data
- `results/screenshots/`: Visual captures of elements
- `results/telemetry/`: Performance monitoring data

## Advanced Usage

### Running Specific Extractors

```bash
# Run only typography and colors extractors
node run.js --url https://example.com --only typography,colors

# Run all extractors except animations
node run.js --url https://example.com --skip animations
```

### Caching

The Design Token Crawler uses caching to improve performance. You can control caching behavior with these options:

```bash
# Force run all steps (ignore cache)
node run.js --url https://example.com --force

# Clear cache before running
node run.js --url https://example.com --clear-cache
```

### Parallel Processing

The Design Token Crawler supports parallel processing for improved performance:

```bash
# Enable parallel processing with 4 workers
node run.js --url https://example.com --parallel 4
```

### Telemetry

The Design Token Crawler includes telemetry for performance monitoring:

```bash
# Enable telemetry
node run.js --url https://example.com --telemetry

# Specify telemetry output directory
node run.js --url https://example.com --telemetry --telemetry-dir ./telemetry-results
```

## Troubleshooting

### Common Issues

1. **Crawler can't access the website**
   - Check if the website is accessible from your machine
   - Ensure you have the necessary permissions to access the website
   - Try increasing the timeout value

2. **Extractors don't find expected values**
   - Check if the website uses standard CSS properties
   - Try running with the `--verbose` flag for more detailed output
   - Inspect the raw extraction data in the results directory

3. **Performance issues on large websites**
   - Limit the number of pages with the `--max-pages` option
   - Enable parallel processing with the `--parallel` option
   - Use the telemetry feature to identify bottlenecks

### Getting Help

If you encounter issues not covered in this documentation, please:
1. Check the [FAQ](./faq.md) for common questions
2. Review the [Troubleshooting Guide](./troubleshooting.md) for more detailed solutions
3. Submit an issue on the GitHub repository

## Contributing

Contributions to the Design Token Crawler are welcome! Please see the [Contributing Guide](./contributing.md) for more information.

## License

The Design Token Crawler is licensed under the MIT License. See the [LICENSE](../LICENSE) file for details.
