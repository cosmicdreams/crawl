# Site Crawler

A phased approach to site crawling and analysis tool.

## Features

- Initial crawl: Scans a site 1 level deep from the homepage
- Deepen crawl: Extends crawling depth in phases
- Metadata gathering: Collects information about page templates, components, and structure
- Test plan generation: Creates a QA test plan prompt for AI-assisted testing

## Installation

Before you execute the crawler, modify the `config/config.json` file to set your base URL and other settings.

Available Configuration to modify:

```json5
{
  "base_url": "https://local.ddev.site",
  // Used as the starting point for the crawl
  "name": "Local Website Analysis",
  // Name used in reports
  "crawl_settings": {
    // Maximum depth of the crawl
    "max_depth": 3,
    // Number of paths to process in each batch
    "batch_size": 20,
    // Maximum number of retries for failed requests
    "max_retries": 2,
    // Timeout for page requests
    "timeout": 45000
  }
}
```

## Usage

The site crawler is designed to work in phases to prevent timeouts and to make the process more manageable:

```bash
# Run the complete process (initial, deepen twice, metadata)
npm run all

# Run just the initial 1-level deep crawl
npm run initial

# Go one level deeper from current paths
npm run deepen

# Gather metadata for existing paths
npm run metadata

# After the metadata is generated, build test plan.
npm run test-plan
