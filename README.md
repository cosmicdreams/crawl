# Frontend Crawl Tool

This tool crawls your website and extracts design tokens for typography, colors, spacing, borders, and animations.

## Features

- **Site Crawling**: Automatically discovers and crawls pages on your site
- **Design Token Extraction**: Analyzes the site to extract design tokens
- **Report Generation**: Creates HTML and Markdown reports of the findings
- **Smart Caching**: Avoids unnecessary processing by tracking changes
- **Interactive Mode**: Lets you choose which steps to run based on what's changed
- **Configuration**: Simple setup with automatic configuration on first run

## Usage

### Basic Usage

```bash
# Run the full extraction process
npm run crawl

# List available extractors
npm run crawl:list

# Run specific extractors
npm run crawl:typography
npm run crawl:colors
npm run crawl:spacing
npm run crawl:borders
npm run crawl:animations
```

### Cache Options

The tool includes a smart caching system that detects what's changed and only runs the necessary steps:

```bash
# Force run all steps (ignore cache)
npm run crawl:force

# Non-interactive mode: automatically answer yes to all prompts except paths.json review
npm run crawl:yes
```

### Advanced Options

```bash
# Specify a custom URL to crawl
npm run crawl -- --url https://example.com

# Limit the number of pages to crawl
npm run crawl -- --max-pages 50

# Specify a custom output directory
npm run crawl -- --output ./my-results
```

## How It Works

1. **Crawling**: The tool crawls your site starting from the homepage, collecting all internal links.
2. **Paths Review**: After crawling, you can review and edit the discovered paths.
3. **Extraction**: The tool analyzes the pages to extract design tokens.
4. **Token Generation**: Design tokens are generated in various formats.
5. **Report Generation**: HTML and Markdown reports are created.

## Caching System

The tool includes a smart caching system that:

1. Tracks changes to input files (paths.json)
2. Detects when analysis results have been manually modified
3. Determines which steps need to be rerun based on dependencies
4. Provides an interactive interface to choose what to update

When you run the tool, it will:

1. Analyze what's changed since the last run
2. Show you which steps would normally run and why
3. Let you choose to run all necessary steps, selected steps, or skip all steps
4. Update only what's needed, saving time and resources

## Configuration

On first run, the tool will prompt you for your site's domain and create a `config.json` file with sensible defaults. You can edit this file to customize the crawler's behavior.

```json
{
  "baseUrl": "https://example.com",  // Your site's domain
  "maxPages": 100,                  // Maximum pages to crawl
  "timeout": 30000,                // Page load timeout in milliseconds
  "ignorePatterns": [...],         // URL patterns to ignore
  "ignoreExtensions": [...],       // File extensions to ignore
  "outputDir": "./results",        // Output directory
  "screenshotsEnabled": false,     // Whether to save screenshots
  "respectRobotsTxt": true         // Whether to respect robots.txt
}
```

You can override these settings via command line options:

```bash
# Override the base URL
npm run crawl -- --url https://mysite.com

# Override the maximum pages
npm run crawl -- --max-pages 50

# Override the output directory
npm run crawl -- --output ./custom-results
```

## Paths File

The `paths.json` file contains the URLs that will be analyzed. After the initial crawl, you can:

1. Review and edit this file
2. Remove paths you don't want to include
3. Add paths that might have been missed
4. The paths are automatically deduplicated to reduce redundancy

## Output

The tool generates several outputs in the `results` directory:

- `raw/`: Raw analysis data
- `css/`: CSS variables
- `tokens/`: Design tokens in JSON format
- `reports/`: HTML reports
- `DesignTokens.md`: Markdown documentation of the design tokens
