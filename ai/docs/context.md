# Design Token Crawler - Context Document

This document provides a comprehensive overview of the Design Token Crawler application, its architecture, functionality, and purpose. It is intended to serve as a reference for AI assistants working with this codebase.

## Application Overview

The Design Token Crawler is a Node.js application that:

1. Crawls a locally running website
2. Extracts design elements (typography, colors, spacing, borders, animations, components)
3. Analyzes and categorizes these elements
4. Generates design tokens in various formats (CSS variables, JSON, Figma tokens)
5. Creates visual reports and documentation

The primary purpose is to automatically extract and document design systems from existing websites, making it easier to:
- Understand the current design implementation
- Identify inconsistencies
- Create a standardized design token system
- Generate documentation for designers and developers

## 

## Project Structure

The project is organized into several key directories:

```
/src
  /crawler        - Website crawling functionality
  /extractors     - Design element extraction modules
  /generators     - Token and report generation
  /utils          - Utility functions and helpers
/results          - Output files (generated during runtime)
  /css            - CSS variable definitions
  /raw            - Raw extraction data (JSON)
  /reports        - HTML reports and visualizations
  /screenshots    - Visual captures of elements
  /tokens         - Design tokens in various formats
/tests            - Test files for the application
/ai               - AI-related resources and data
  /docs           - Documentation for AI assistants
  /issues         - Tracked issues and improvements
  /prompts        - Prompt templates for AI analysis
```

## Core Components

### 1. Site Crawler (`src/crawler/site-crawler.js`)

The crawler uses Playwright to:
- Navigate to a specified URL
- Discover and follow internal links
- Capture screenshots (if enabled)
- Build a site map
- Store paths for further analysis

Configuration options include:
- Base URL to crawl
- Maximum number of pages
- Timeout settings
- URL patterns to ignore
- File extensions to ignore
- Screenshot settings

### 2. Extractors (`src/extractors/`)

The application includes several specialized extractors:

#### Typography Extractor (`extract-typography.js`)
- Extracts font families, sizes, weights, line heights, letter spacing
- Identifies heading styles, body text styles, and special text treatments
- Analyzes text styles across different viewport sizes

#### Color Extractor (`extract-colors.js`)
- Extracts color values from text, backgrounds, borders
- Identifies primary, secondary, and accent colors
- Detects color variables and themes

#### Spacing Extractor (`extract-spacing.js`)
- Extracts margin, padding, and gap values
- Identifies spacing patterns and scales
- Categorizes spacing by unit type (px, rem, em, %)

#### Border Extractor (`extract-borders.js`)
- Extracts border widths, styles, colors
- Identifies border radius values
- Extracts box shadow styles

#### Animation Extractor (`extract-animations.js`)
- Extracts transition properties (duration, timing function, delay)
- Identifies animation keyframes
- Captures animation patterns

#### Component Extractor (`extract-components.js`)
- Identifies UI components based on selectors
- Extracts component structure and styles
- Generates component documentation

Each extractor:
1. Takes input from the crawler results
2. Analyzes specific design elements
3. Outputs structured data to the results directory
4. Generates visualizations for reports

### 3. Generators (`src/generators/`)

#### Token Generator (`generate-tokens.js`)
- Processes extracted design data
- Generates standardized design tokens
- Outputs tokens in multiple formats:
  - CSS variables
  - JSON for design systems
  - Figma-compatible tokens

#### Report Generator (`generate-reports.js`)
- Creates HTML reports with visualizations
- Generates design system documentation
- Provides interactive component library

### 4. Utilities (`src/utils/`)

#### Config Manager (`config-manager.js`)
- Manages application configuration
- Loads settings from config.json
- Provides defaults when needed
- Merges command-line options

#### Cache Manager (`cache-manager.js`)
- Tracks extraction state between runs
- Determines which steps need to be re-run
- Improves performance by avoiding redundant work

## Workflow

The application follows this general workflow:

1. **Configuration**: Load settings from config.json and command-line arguments
2. **Crawling**: Navigate the website and collect URLs
3. **Extraction**: Run selected extractors on the crawled pages
4. **Token Generation**: Convert extracted data into design tokens
5. **Report Generation**: Create visual reports and documentation

The process is controlled by the main `run.js` script, which:
- Parses command-line options
- Determines which extractors to run
- Executes the workflow steps
- Handles caching and optimization

## Output Files

The application generates several types of output files:

### Raw Data (JSON)
- `results/raw/crawl-results.json` - Raw crawler output
- `results/raw/typography-analysis.json` - Typography extraction data
- `results/raw/color-analysis.json` - Color extraction data
- `results/raw/spacing-analysis.json` - Spacing extraction data
- `results/raw/borders-analysis.json` - Border extraction data
- `results/raw/animations-analysis.json` - Animation extraction data

### Design Tokens
- `results/css/variables.css` - All CSS variables
- `results/css/typography.css` - Typography-specific CSS
- `results/css/colors.css` - Color-specific CSS
- `results/css/spacing.css` - Spacing-specific CSS
- `results/css/borders.css` - Border-specific CSS
- `results/css/animations.css` - Animation-specific CSS
- `results/tokens/tokens.json` - JSON format tokens
- `results/tokens/figma-tokens.json` - Figma-compatible tokens

### Reports
- `results/reports/crawl-report.html` - Site crawl summary
- `results/reports/design-system-report.html` - Design system overview
- `results/reports/component-library.html` - Component documentation

### Other
- `config/paths.json` - List of discovered URLs
- `config/components.json` - Component extraction data
- `results/screenshots/` - Visual captures of elements

## Technologies Used

The application is built with:

- **Node.js** - Runtime environment
- **Playwright** - Browser automation for crawling and extraction
- **Commander** - Command-line interface
- **Jest** - Testing framework

## Usage

The application can be run with various command-line options:

```bash
# Basic usage
node run.js --url https://example.com

# List available extractors
node run.js --list

# Run specific extractors
node run.js --only colors,typography

# Force run all steps (ignore cache)
node run.js --force

# Set maximum pages
node run.js --max-pages 50

# Specify output directory
node run.js --output ./my-results
```

There are also npm scripts for common operations:

```bash
# Run the crawler
npm run crawl

# Run specific extractors
npm run crawl:typography
npm run crawl:colors
npm run crawl:spacing
npm run crawl:borders
npm run crawl:animations

# Run tests
npm test
npm run test:watch
npm run test:coverage

# Clear all results
npm run nuke
```

## Testing

The application includes Jest tests for:
- Utility functions
- Extractor modules
- Token generation

Currently, tests exist for:
- Typography extractor
- Color extractor

Tests are being developed for:
- Spacing extractor
- Border extractor
- Animation extractor
- Component extractor

## Current Development Focus

The team is currently focused on:
1. Improving test coverage for extractors
2. Refactoring extractors to make them more testable
3. Identifying and fixing bugs
4. Planning future improvements

## Common Issues and Challenges

1. **Browser Automation Complexity**: Working with Playwright for browser automation can be challenging, especially for complex CSS extraction.

2. **CSS Parsing Limitations**: Extracting meaningful design tokens from arbitrary CSS requires handling many edge cases.

3. **Performance Considerations**: Crawling and analyzing many pages can be time-consuming, requiring optimization and caching.

4. **Component Detection**: Identifying components without explicit markup is challenging and may require heuristic approaches.

## Future Directions

Potential future enhancements include:

1. **AI-Powered Analysis**: Using AI to identify patterns and suggest improvements to the design system.

2. **Design System Recommendations**: Automatically suggesting standardized tokens based on extracted values.

3. **Integration with Design Tools**: Direct export to design tools beyond Figma.

4. **Accessibility Analysis**: Evaluating color contrast and other accessibility concerns.

5. **Version Tracking**: Tracking changes to design tokens over time.

## Conclusion

The Design Token Crawler is a powerful tool for automatically extracting and documenting design systems from existing websites. It bridges the gap between implemented designs and formal design systems, making it easier to maintain consistency and create documentation.

When working with this codebase, focus on understanding the extraction process, the structure of the generated tokens, and how the various components interact to produce the final output.
