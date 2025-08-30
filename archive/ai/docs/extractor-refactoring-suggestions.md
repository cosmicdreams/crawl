# Refactoring Suggestions to Make Extractors More Testable

This document outlines specific refactoring suggestions to make the extractor modules more testable. These suggestions are based on an analysis of the current codebase and common testing best practices.

## Implementation Status

Many of these suggestions have been implemented in the refactored versions of the extractors:

- ✅ `extract-spacing-refactored.js` - Fully implemented
- ✅ `extract-borders-refactored.js` - Fully implemented
- ✅ `extract-animations-refactored.js` - Fully implemented
- ✅ `extract-colors-refactored.js` - Fully implemented
- ✅ `extract-typography-refactored.js` - Fully implemented
- ✅ `extract-components-refactored.js` - Fully implemented

The refactored extractors follow a consistent pattern with standardized function names, error handling, and return values. Tests have been created for each refactored extractor to verify their functionality.

## Common Issues Across Extractors

The current extractor modules have several characteristics that make them difficult to test:

1. Hardcoded dependencies and configurations
2. Mixed concerns (browser control, data extraction, file I/O)
3. Limited error handling
4. Side effects (file writing, console logging)
5. Inconsistent APIs between extractors

## Specific Refactoring Suggestions

### 1. Dependency Injection

#### Current Issue
Extractors have hardcoded dependencies and configurations, making it difficult to mock or replace them in tests.

#### Suggested Changes

**Config Object Injection:**
```javascript
// Before
const config = {
  // Hardcoded config
};

async function extractSpacingFromCrawledPages() {
  // Uses hardcoded config
}

// After
const defaultConfig = {
  // Default config values
};

async function extractSpacingFromCrawledPages(customConfig = {}) {
  const config = { ...defaultConfig, ...customConfig };
  // Use merged config
}
```

**Browser/Page Injection:**
```javascript
// Before
async function extractSpacingFromCrawledPages() {
  const browser = await chromium.launch();
  // Use browser
  await browser.close();
}

// After
async function extractSpacingFromCrawledPages(customConfig = {}, browser = null) {
  const config = { ...defaultConfig, ...customConfig };

  // Use provided browser or create a new one
  const shouldCloseBrowser = !browser;
  browser = browser || await chromium.launch();

  try {
    // Use browser
    return results;
  } finally {
    // Only close the browser if we created it
    if (shouldCloseBrowser) {
      await browser.close();
    }
  }
}
```

### 2. Separate Browser Logic from Extraction Logic

#### Current Issue
Extractors mix browser control with data extraction, making it difficult to test the extraction logic independently.

#### Suggested Changes

**Create Single-Page Extraction Functions:**
```javascript
// New function for single page extraction
async function extractSpacingFromPage(page, url = null) {
  if (url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  }

  // Extract spacing
  const spacing = await extractSpacing(page);

  // Process and return results
  return {
    spacingValues: spacing.spacingValues,
    elementStyles: spacing.elementStyles,
    cssVars: spacing.cssVars
  };
}
```

**Separate Page Evaluation Logic:**
```javascript
// Extract the page.evaluate function into a testable function
function createPageEvaluationFunction(config) {
  return function evaluateSpacing() {
    const styles = {};
    const spacingValues = new Set();

    // Extraction logic

    return {
      elementStyles: styles,
      spacingValues: Array.from(spacingValues),
      cssVars
    };
  };
}

// Use it in the extractor
async function extractSpacing(page, config) {
  const evaluationFn = createPageEvaluationFunction(config);
  return page.evaluate(evaluationFn);
}
```

### 3. Improve Error Handling

#### Current Issue
Error handling is inconsistent and often just logs to console, making it difficult to test error cases.

#### Suggested Changes

**Return Error Objects:**
```javascript
// Before
try {
  // Do something
} catch (error) {
  console.error(`Error: ${error.message}`);
}

// After
try {
  // Do something
  return { success: true, data: result };
} catch (error) {
  return {
    success: false,
    error: {
      message: error.message,
      type: error.name,
      stack: error.stack
    }
  };
}
```

**Add Specific Error Types:**
```javascript
class ExtractorError extends Error {
  constructor(message, type = 'ExtractorError') {
    super(message);
    this.name = type;
  }
}

class FileNotFoundError extends ExtractorError {
  constructor(filePath) {
    super(`File not found: ${filePath}`, 'FileNotFoundError');
    this.filePath = filePath;
  }
}

// Usage
if (!fs.existsSync(config.inputFile)) {
  throw new FileNotFoundError(config.inputFile);
}
```

### 4. Separate Visualization Logic

#### Current Issue
Visualization generation is mixed with data extraction, making it difficult to test each independently.

#### Suggested Changes

**Move Visualization to Separate Module:**
```javascript
// In a new file: visualization-generator.js
async function generateSpacingVisualization(page, groupedSpacing, outputPath) {
  // Visualization logic
}

// In extract-spacing.js
const { generateSpacingVisualization } = require('../utils/visualization-generator');

// Make visualization optional
async function extractSpacingFromCrawledPages(customConfig = {}) {
  // Extraction logic

  // Only generate visualization if enabled
  if (config.generateVisualizations) {
    await generateSpacingVisualization(page, groupedSpacing, config.screenshotsDir);
  }
}
```

### 5. Consistent API Across Extractors

#### Current Issue
Each extractor has a slightly different API, making it difficult to create consistent tests.

#### Suggested Changes

**Standardize Function Names and Parameters:**
```javascript
// For each extractor, use consistent naming and parameters
async function extractXFromCrawledPages(customConfig = {}, browser = null)
async function extractXFromPage(page, url = null)
async function extractX(page, config = defaultConfig)
```

**Create Common Interfaces:**
```javascript
/**
 * @typedef {Object} ExtractorResult
 * @property {boolean} success - Whether the extraction was successful
 * @property {Object} data - The extracted data (if successful)
 * @property {Object} error - Error information (if not successful)
 */

/**
 * @typedef {Object} ExtractorConfig
 * @property {string} baseUrl - Base URL of the site
 * @property {string} inputFile - Input file path
 * @property {string} outputFile - Output file path
 * @property {boolean} generateVisualizations - Whether to generate visualizations
 * @property {string} screenshotsDir - Directory for screenshots
 * @property {number} maxPages - Maximum pages to analyze
 */

/**
 * Extract data from crawled pages
 * @param {ExtractorConfig} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance
 * @returns {Promise<ExtractorResult>} - Extraction result
 */
async function extractXFromCrawledPages(customConfig = {}, browser = null) {
  // Implementation
}
```

### 6. Reduce Side Effects

#### Current Issue
Extractors have many side effects (file I/O, console logs), making them difficult to test in isolation.

#### Suggested Changes

**Make File I/O Optional:**
```javascript
// Before
fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));

// After
if (config.writeToFile) {
  fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
}
return results;
```

**Replace Console.log with Injectable Logger:**
```javascript
// Before
console.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

// After
function extractSpacingFromCrawledPages(customConfig = {}, browser = null, logger = console) {
  // ...
  logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);
  // ...
}
```

## Example Refactored Extractor

Here's a simplified example of how `extract-spacing.js` could be refactored:

```javascript
// @ts-check
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Default configuration
const defaultConfig = {
  baseUrl: process.env.SITE_DOMAIN || 'https://definitivehc.ddev.site',
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),
  outputFile: path.join(__dirname, '../../results/raw/spacing-analysis.json'),
  cssProperties: [
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'gap', 'row-gap', 'column-gap',
    'grid-gap', 'grid-row-gap', 'grid-column-gap',
    'width', 'height', 'max-width', 'max-height', 'min-width', 'min-height'
  ],
  elements: [
    // Elements to analyze
  ],
  maxPages: 20,
  screenshotsDir: path.join(__dirname, '../../results/screenshots/spacing'),
  writeToFile: true,
  generateVisualizations: true
};

/**
 * Extract spacing styles from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Spacing styles
 */
async function extractSpacing(page, config = defaultConfig) {
  try {
    return await page.evaluate((config) => {
      // Page evaluation logic
    }, config);
  } catch (error) {
    console.error(`Error extracting spacing: ${error.message}`);
    return {
      elementStyles: {},
      spacingValues: [],
      cssVars: {}
    };
  }
}

/**
 * Extract spacing from a single page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {string} url - URL to navigate to (optional)
 * @param {Object} config - Configuration object
 * @returns {Promise<Object>} - Spacing data
 */
async function extractSpacingFromPage(page, url = null, config = defaultConfig) {
  try {
    if (url) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    // Extract spacing
    const spacing = await extractSpacing(page, config);

    return {
      success: true,
      data: spacing
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      }
    };
  }
}

/**
 * Main function to extract spacing from crawled pages
 * @param {Object} customConfig - Custom configuration
 * @param {import('playwright').Browser} browser - Browser instance (optional)
 * @param {Object} logger - Logger object (optional)
 * @returns {Promise<Object>} - Spacing results
 */
async function extractSpacingFromCrawledPages(customConfig = {}, browser = null, logger = console) {
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };

  logger.log('Starting spacing extraction...');

  try {
    // Create screenshots directory if needed and enabled
    if (config.generateVisualizations && !fs.existsSync(config.screenshotsDir)) {
      fs.mkdirSync(config.screenshotsDir, { recursive: true });
    }

    // Read crawl results
    if (!fs.existsSync(config.inputFile)) {
      throw new Error(`Input file not found: ${config.inputFile}`);
    }

    const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
    const pages = crawlResults.crawledPages.filter(page => page.status === 200);

    // Limit the number of pages if needed
    const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

    logger.log(`Analyzing spacing on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    const shouldCloseBrowser = !browser;
    browser = browser || await chromium.launch();

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 }
    });

    // Create a new page
    const page = await context.newPage();

    // Results object
    const results = {
      baseUrl: crawlResults.baseUrl,
      pagesAnalyzed: [],
      spacingStyles: {},
      allSpacingValues: new Set(),
      cssVars: {}
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract spacing from page
        const { success, data, error } = await extractSpacingFromPage(page, pageInfo.url, config);

        if (!success) {
          logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
          continue;
        }

        // Process results
        // ...
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
      }
    }

    // Convert Set to Array for JSON serialization
    results.allSpacingValues = Array.from(results.allSpacingValues);

    // Group spacing values by unit
    const groupedSpacing = {
      // Grouping logic
    };

    // Add grouped spacing to results
    results.groupedSpacing = groupedSpacing;

    // Generate spacing visualization if enabled
    if (config.generateVisualizations) {
      await generateSpacingVisualization(page, groupedSpacing, config.screenshotsDir);
    }

    // Save results to file if enabled
    if (config.writeToFile) {
      fs.writeFileSync(config.outputFile, JSON.stringify(results, null, 2));
      logger.log(`Results saved to: ${config.outputFile}`);
    }

    logger.log('\nSpacing extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Unique spacing values found: ${results.allSpacingValues.length}`);

    return {
      success: true,
      data: results
    };
  } catch (error) {
    logger.error(`Spacing extraction failed: ${error.message}`);
    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      }
    };
  } finally {
    // Only close the browser if we created it
    if (browser && shouldCloseBrowser) {
      await browser.close();
    }
  }
}

// Visualization function moved to separate module
async function generateSpacingVisualization(page, groupedSpacing, screenshotsDir) {
  // Visualization logic
}

// Export functions
module.exports = {
  extractSpacingFromCrawledPages,
  extractSpacingFromPage,
  extractSpacing,
  defaultConfig
};
```

## Benefits of These Refactorings

1. **Improved Testability**: Functions can be tested in isolation with mocked dependencies
2. **Better Separation of Concerns**: Each function has a single responsibility
3. **More Consistent Error Handling**: Errors are handled consistently and returned as objects
4. **Reduced Side Effects**: Side effects are optional and configurable
5. **More Consistent API**: Functions have consistent names, parameters, and return types
6. **Better Documentation**: Types and interfaces document the expected inputs and outputs

These refactorings make it much easier to write comprehensive tests for the extractors while also improving the overall code quality and maintainability.

## Additional Recommendations (Prioritized)

Based on our experience refactoring the extractors, here are some additional recommendations for future improvements, ranked by importance:

### 1. Implement Retry Logic for Flaky Operations (HIGH)

Browser automation can sometimes be flaky. Implementing retry logic could improve reliability:

```javascript
async function withRetry(fn, maxRetries = 3, delay = 1000) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Usage
async function extractWithRetry(page, url, config) {
  return withRetry(() => extractFromPage(page, url, config));
}
```

### 2. Implement Caching for Performance (MEDIUM)

Extraction can be time-consuming, especially for large sites. Implementing a caching mechanism could improve performance during development and testing:

```javascript
const cache = new Map();

async function extractWithCache(page, url, config, cacheKey) {
  if (config.useCache && cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await extractFromPage(page, url, config);

  if (config.useCache) {
    cache.set(cacheKey, result);
  }

  return result;
}
```

### 3. Implement Parallel Processing (MEDIUM)

For large sites, processing pages in parallel could significantly improve performance:

```javascript
async function extractFromCrawledPagesParallel(customConfig = {}, logger = console) {
  const config = { ...defaultConfig, ...customConfig };
  const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
  const pages = crawlResults.crawledPages.filter(page => page.status === 200);

  // Limit concurrency to avoid overwhelming the system
  const concurrency = config.concurrency || 5;
  const chunks = [];

  for (let i = 0; i < pages.length; i += concurrency) {
    chunks.push(pages.slice(i, i + concurrency));
  }

  const results = [];

  for (const chunk of chunks) {
    const chunkPromises = chunk.map(async (pageInfo) => {
      const browser = await chromium.launch();
      try {
        const context = await browser.newContext();
        const page = await context.newPage();
        return await extractFromPage(page, pageInfo.url, config);
      } finally {
        await browser.close();
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}
```

### 4. Add Telemetry and Performance Metrics (MEDIUM)

Collecting performance metrics could help identify bottlenecks and optimize the extraction process:

```javascript
async function extractWithTelemetry(page, url, config, logger) {
  const startTime = performance.now();

  try {
    const result = await extractFromPage(page, url, config);

    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.log(`Extraction completed in ${duration.toFixed(2)}ms`);

    return {
      ...result,
      telemetry: {
        duration,
        timestamp: new Date().toISOString(),
        url
      }
    };
  } catch (error) {
    const endTime = performance.now();
    const duration = endTime - startTime;

    logger.error(`Extraction failed after ${duration.toFixed(2)}ms: ${error.message}`);
    throw error;
  }
}
```

### 5. Create a Common Extractor Base Class (LOW)

Many of the extractors share similar patterns and functionality. Creating a base class could further reduce duplication and standardize behavior:

```javascript
class BaseExtractor {
  constructor(defaultConfig = {}) {
    this.defaultConfig = defaultConfig;
  }

  async extractFromCrawledPages(customConfig = {}, browser = null, logger = console) {
    // Common implementation with hooks for extractor-specific behavior
  }

  async extractFromPage(page, url = null, config = {}) {
    // Common implementation with hooks for extractor-specific behavior
  }

  async extract(page, config = {}) {
    // Extractor-specific implementation to be overridden
    throw new Error('Not implemented');
  }
}

// Usage
class SpacingExtractor extends BaseExtractor {
  constructor() {
    super({
      // Default spacing config
    });
  }

  async extract(page, config) {
    // Spacing-specific extraction logic
  }
}
```

These additional recommendations would further improve the maintainability, performance, and reliability of the extractors.

## Testing Challenges and Best Practices (Prioritized)

During the refactoring process, we encountered several challenges with testing the extractors. Here are some best practices to address these challenges, ranked by importance:

### 1. Testing Error Handling (HIGH)

Testing error handling requires careful mocking of failures at different levels:

```javascript
// Test file not found errors
fs.existsSync.mockReturnValue(false);

// Test browser launch errors
chromium.launch.mockRejectedValue(new Error('Browser launch failed'));

// Test page navigation errors
const mockPage = {
  goto: jest.fn().mockRejectedValue(new Error('Navigation failed')),
  // Other mocks...
};

// Test page evaluation errors
const mockPage = {
  goto: jest.fn().mockResolvedValue({}),
  evaluate: jest.fn().mockRejectedValue(new Error('Evaluation failed')),
  // Other mocks...
};
```

### 2. Mocking Browser Interactions (HIGH)

Testing browser interactions can be challenging. Here's how to effectively mock Playwright:

```javascript
// Mock Playwright before importing the module
jest.mock('@playwright/test');

// Import modules after mocking
const { chromium } = require('@playwright/test');

// Setup mock implementations for chromium
chromium.launch = jest.fn().mockResolvedValue({
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn().mockResolvedValue({
        // Mock return value from page.evaluate
        elementStyles: { 'body': [{ styles: { 'color': '#000000' } }] },
        spacingValues: ['10px', '20px'],
        cssVars: { '--spacing-sm': '10px' }
      }),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image')),
      close: jest.fn(),
      setContent: jest.fn()
    }),
    close: jest.fn()
  }),
  close: jest.fn()
});
```

### 3. Testing File System Operations (MEDIUM)

Mock file system operations to avoid actual file I/O during tests:

```javascript
// Mock the fs module
jest.mock('fs');
const fs = require('fs');

// Mock file reading
fs.readFileSync.mockImplementation((path) => {
  if (path.includes('crawl-results.json')) {
    return JSON.stringify({
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200
        }
      ]
    });
  }
  throw new Error(`File not found: ${path}`);
});

// Mock file writing
fs.writeFileSync.mockImplementation(() => {});

// Mock directory checks and creation
fs.existsSync.mockImplementation((path) => {
  return path.includes('crawl-results.json');
});
fs.mkdirSync.mockImplementation(() => {});
```

### 4. Structuring Tests (MEDIUM)

Organize tests in a consistent way across all extractors:

```javascript
describe('extract-x-refactored', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup common mocks
  });

  describe('extractXFromCrawledPages', () => {
    test('processes crawl results and extracts data', async () => {
      // Test the main function
    });

    test('handles file not found errors', async () => {
      // Test error handling
    });

    // More tests...
  });

  describe('extractXFromPage', () => {
    test('extracts data from a page', async () => {
      // Test single page extraction
    });

    test('handles evaluation errors', async () => {
      // Test error handling
    });

    // More tests...
  });

  describe('extractX', () => {
    test('extracts values from a page', async () => {
      // Test base extraction function
    });

    // More tests...
  });
});
```

### 5. Testing Asynchronous Code (LOW)

Ensure proper handling of asynchronous code in tests:

```javascript
test('extracts data from a page', async () => {
  // Setup
  const mockPage = {
    goto: jest.fn().mockResolvedValue({}),
    evaluate: jest.fn().mockResolvedValue({
      // Mock data
    })
  };

  // Execute
  const result = await extractFromPage(mockPage, 'https://example.com');

  // Verify
  expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));
  expect(mockPage.evaluate).toHaveBeenCalled();
  expect(result.success).toBe(true);
  expect(result.data).toHaveProperty('elementStyles');
});
```

By following these testing best practices, we can ensure that the extractors are thoroughly tested and reliable.

## Conclusion and Next Steps

The refactoring of the extractors has significantly improved their testability, maintainability, and reliability. All extractors now follow a consistent pattern with standardized function names, error handling, and return values.

### Completed Work

- ✅ Standardized function names and signatures across all extractors
- ✅ Implemented consistent error handling with standardized return objects
- ✅ Separated browser control from extraction logic
- ✅ Made file I/O and visualization generation optional and configurable
- ✅ Added dependency injection for configuration, browser instances, and loggers
- ✅ Created comprehensive tests for all extractors

### Next Steps (Prioritized)

1. **Integration with Main Application** (HIGH): Update the main application to use the refactored extractors
   - This is critical as it allows the application to benefit from the improved code quality and reliability
   - Without this step, the refactoring work remains isolated from the main application
   - Should be done first to ensure the refactored code works in the production environment

2. **Error Handling Improvements** (HIGH): Implement custom error types and retry logic
   - Improves reliability in production environments where network issues and other transient errors are common
   - Provides better diagnostics when errors occur
   - Reduces manual intervention needed when running the crawler on large sites

3. **Performance Optimization** (MEDIUM): Implement the performance recommendations
   - Caching mechanism to avoid redundant processing
   - Parallel processing for faster extraction on large sites
   - Telemetry to identify and address performance bottlenecks
   - Important for large sites but not critical for basic functionality

4. **Documentation** (MEDIUM): Create comprehensive documentation for the extractors
   - API documentation for developers
   - Usage examples and configuration options
   - Explanation of the extraction process and output formats
   - Important for maintainability and onboarding new developers

5. **Visualization Improvements** (LOW): Enhance the visualization generation
   - More interactive features in the generated reports
   - Better organization of visual elements
   - Additional visualization types for different design elements
   - Nice to have but not essential for the core functionality

By continuing to follow these best practices and implementing the additional recommendations, the Design Token Crawler will become more maintainable, reliable, and performant.
