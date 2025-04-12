# Design Token Crawler - Context Document

This document provides comprehensive guidance for Claude Code (claude.ai/code) when working with this repository. It includes an overview of the application, its architecture, functionality, and purpose.

## Project Overview

The Design Token Crawler is a Node.js application that:

1. Crawls a locally running website
2. Extracts design elements (typography, colors, spacing, borders, animations, components)
3. Analyzes and categorizes these elements
4. Generates design tokens in various formats (CSS variables, JSON, Figma tokens)
5. Creates visual reports and documentation

The primary purpose is to automatically extract and document design systems from existing websites, making it easier to:
- Understand the current design implementation
- Prepare for future evolution of the design system
- Create a standardized design token system
- Generate documentation for designers and developers

## Build and Test Commands

```bash
# Start app
npm start
npm run crawl

# Run specific extractors
npm run crawl:typography
npm run crawl:colors
npm run crawl:spacing
npm run crawl:borders
npm run crawl:animations

# Run with options
node run.js --url https://example.com --only colors,typography
node run.js --max-pages 50
node run.js --output ./my-results
node run.js --force  # Ignore cache
node run.js --list   # List available extractors

# Linting
npm run lint
npm run lint:fix

# Testing
npm test                                    # Run all tests
npm test -- tests/path/to/file.test.js      # Run single test file
npm test -- tests/unit                      # Run all unit tests
npm test -- tests/integration               # Run all integration tests
npm test -- tests/e2e                       # Run all end-to-end tests
npm test -- -t "test description"           # Run single test case
npm run test:watch                          # Run tests with watch mode
npm run test:coverage                       # Run test coverage
npm run test:ui                             # Run tests with UI

# Utilities
npm run nuke                                # Clear all results
```

## Code Style Guidelines
- Language: JavaScript only (no TypeScript)
- Types: JSDoc comments for type documentation (@typedef, @param, @returns)
- Imports: ES modules with import/export (tests use CommonJS)
- Functions: Regular for exports, arrow for callbacks
- Naming: camelCase for variables/functions, hyphenated-names for files
- Error handling: try/catch with detailed error objects
- Formatting: 2-space indent, max 120 chars line length, single quotes
- Always add JSDoc comments for functions with @param and @returns
- Tests use vitest with describe/test blocks and AAA pattern

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
/docs             - User and technical documentation
```

### Test Directory Structure:
```
/tests
  /fixtures                       - Shared test data and setup
    mock-data.js                  - Mock data for all tests
    test-setup.js                 - Common test setup code

  /unit                           - Unit tests for individual functions
    /utils                        - Tests for utility functions
      config-manager.test.js      - Tests for config manager
      telemetry-manager.test.js   - Tests for telemetry manager

    /extractors                   - Tests for extractor modules
      extract-colors.test.js      - Tests for color extractor
      extract-spacing.test.js     - Tests for spacing extractor
      extract-borders.test.js     - Tests for border extractor
      extract-animations.test.js  - Tests for animation extractor
      extract-components.test.js  - Tests for component extractor
      extract-typography.test.js  - Tests for typography extractor

    /generators                   - Tests for generator modules
      generate-tokens.test.js     - Tests for token generator
      generate-reports.test.js    - Tests for report generator

  /integration                    - Tests for module interactions
    crawler-extractors.test.js    - Tests for crawler + extractors
    extractors-generators.test.js - Tests for extractors + generators

  /setup                          - Test environment setup
    vitest-setup.test.js          - Vitest setup verification
```
- Tests mirror the src directory structure
- Each module has a corresponding test file (e.g., `extract-colors.js` → `extract-colors.test.js`)
- Tests use `describe` blocks for grouping and `test` for individual test cases
- Unit tests follow the Arrange-Act-Assert pattern
- Mock external dependencies (fs, Playwright) using Vitest mocks

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

## Architecture Patterns

- Extractors process specific design elements and save to results/raw/*.json
- Config managed via config-manager.js with defaults + CLI overrides
- Async/await for browser automation with Playwright
- Caching system to avoid redundant processing between runs

## Issue Management
- Issues are tracked in files at `/ai/issues/`
- Open issues are in `/ai/issues/` (root), resolved in `/ai/issues/resolved/`
- Use `issue.template.md` format for new issues
- Issue numbering follows `ISSUE-XXX` format (3-digit sequential number)
- Check `issue.json` for the next available issue number
- Issues include metadata (id, status, severity) and structured sections
- When resolving an issue, update status and move to the resolved directory

## AI Recommendations
- When asked to prepare recommendations, create a markdown file in `/ai/insights/`
- Name files descriptively (e.g., `feature-recommendations.md`, `refactoring-plan.md`)
- Include detailed analysis, reasoning, and specific action items
- Format with clear headings, bullet points, and code examples when relevant
- Follow existing files in the insights directory as structural examples

## Documentation
- User-targeted documentation goes in `/docs/` directory
- Technical documentation for extractors is in `/docs/extractors/`
- Use markdown format with clear headings and examples
- Include usage examples and configuration options
- For new features, create corresponding documentation
- Focus on clarity for end users rather than implementation details

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
- `results/raw/colors-analysis.json` - Color extraction data
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
- `results/paths.json` - List of discovered URLs
- `results/components.json` - Component extraction data
- `results/screenshots/` - Visual captures of elements

## Technologies Used

The application is built with:

- **Node.js** - Runtime environment
- **Playwright** - Browser automation for crawling and extraction
- **Commander** - Command-line interface
- **Vitest** - Testing framework (migrated from Jest)
- **Execa** - Process execution for end-to-end testing

## Testing

The application uses a multi-tiered testing approach:

### Unit Testing

Unit tests use Vitest and cover:
- Utility functions
- Extractor modules
- Token generation

Vitest was chosen for its better ES module support, faster performance, and simpler configuration compared to Jest.

Currently, unit tests exist for:
- Typography extractor
- Color extractor
- Utility modules (config manager, telemetry manager)

Unit tests are being developed for:
- Spacing extractor
- Border extractor
- Animation extractor
- Component extractor
- Report generators

### Integration Testing

Integration tests verify interactions between components:
- `tests/integration/crawler-extractors.test.js` - Tests for crawler + extractors interaction
- `tests/integration/extractors-generators.test.js` - Tests for extractors + generators interaction

### End-to-End Testing

End-to-end tests use Execa with Vitest to test the CLI application as a black box:

- Located in `tests/e2e/` directory
- Use Execa to execute CLI commands and verify outputs
- Test the entire workflow from command invocation to final output
- Verify proper file system interactions and exit codes
- Use temporary directories for file operations during tests

Execa was chosen over Playwright for CLI testing because:
- It's specifically designed for process execution and CLI testing
- It integrates well with the existing Vitest setup
- It's more lightweight and appropriate for CLI applications than browser-focused tools
- It provides better control over process execution than Node's built-in child_process

Example E2E test structure:
```javascript
// tests/e2e/cli-commands.test.js
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Design Token Crawler CLI', () => {
  let tempDir;

  beforeEach(() => {
    // Create a temporary directory for test outputs
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'design-token-crawler-'));
  });

  afterEach(() => {
    // Clean up temporary files
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('crawl command extracts tokens from a website', async () => {
    // Run the CLI command
    const { stdout } = await execa('node', [
      './bin/cli.js',
      'crawl',
      '--url=https://example.com',
      `--output=${tempDir}`
    ]);

    // Verify command output and generated files
    expect(stdout).toContain('Crawling completed');
    expect(fs.existsSync(path.join(tempDir, 'tokens/variables.css'))).toBeTruthy();
  });
});
```

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

## Ignored Directories

- The following directories should be ignored (per .gitignore):
  - `/results/` - Contains generated outputs (recreated at runtime)
  - `/node_modules/` - External dependencies
  - `/coverage/` - Test coverage reports
  - `/backup/` - Backup files
  - Other ignored files: `.crawl-cache.json`, `.idea`, `config.json`
- Do not modify or analyze files in these directories unless specifically requested

## Conclusion

The Design Token Crawler is a powerful tool for automatically extracting and documenting design systems from existing websites. It bridges the gap between implemented designs and formal design systems, making it easier to maintain consistency and create documentation.

When working with this codebase, focus on understanding the extraction process, the structure of the generated tokens, and how the various components interact to produce the final output.