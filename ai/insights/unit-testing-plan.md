# Unit Testing Plan for Design Token Crawler

## Overview

This document outlines a comprehensive plan for implementing unit tests for the Design Token Crawler application using Vitest. The goal is to ensure code reliability, facilitate refactoring, and improve overall code quality through systematic testing of core functionality.

## Testing Strategy

We'll adopt a modular testing approach, focusing on:

1. **Pure Functions**: Prioritize testing pure functions that have clear inputs and outputs
2. **Core Utilities**: Test utility modules that are used throughout the application
3. **Data Processing**: Test data transformation and token generation logic
4. **Mocking External Dependencies**: Use Vitest's mocking capabilities for file system, network requests, etc.
5. **Integration Points**: Test key integration points between modules
6. **Test Organization**: Organize tests by type (unit, integration) and module

## Test Environment Setup

### Vitest Configuration

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    globals: true,

    // Include patterns for test files
    include: ['tests/**/*.test.js', 'tests/**/*.spec.js'],

    // Exclude patterns
    exclude: ['node_modules', 'results', 'backup'],

    // Browser testing configuration
    browser: {
      enabled: false, // Disabled by default, enable with --browser flag
      name: 'chromium',
      provider: 'playwright',
      headless: true
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/**', 'tests/**'],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70
      }
    }
  }
});
```

### Package.json Scripts

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:ui": "vitest --ui"
}
```

## Test Modules and Priorities

### High Priority

1. **Utility Functions**
   - `utils/cache-manager.js`
   - `utils/config-manager.js`

2. **Token Generation**
   - `scripts/generate-tokens.js`

3. **Data Processing**
   - Color categorization and processing
   - Typography classification
   - Spacing normalization

### Medium Priority

1. **Extraction Logic**
   - `scripts/extract-colors.js`
   - `scripts/extract-typography.js`
   - `scripts/extract-spacing.js`
   - `scripts/extract-borders.js`
   - `scripts/extract-animations.js`

2. **Report Generation**
   - `scripts/generate-reports.js`

### Lower Priority

1. **Crawling Logic**
   - `scripts/site-crawler.js` (focus on non-browser parts)

2. **Main Application Flow**
   - `run.js` (focus on configuration and orchestration)

## Detailed Testing Plan by Module

### 1. Cache Manager (`utils/cache-manager.js`)

```javascript
// __tests__/utils/cache-manager.test.js

const cacheManager = require('../../utils/cache-manager');
const fs = require('fs');
const path = require('path');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path');

describe('Cache Manager', () => {
  beforeEach(() => {
    // Setup mocks
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      lastRun: '2023-01-01T00:00:00.000Z',
      targetUrl: 'https://example.com',
      outputTimestamps: {},
      fileStats: {}
    }));
  });

  test('getCacheData returns default cache when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    const cache = cacheManager.getCacheData();
    expect(cache).toEqual({
      lastRun: null,
      targetUrl: null,
      outputTimestamps: {},
      fileStats: {}
    });
  });

  test('getCacheData returns parsed cache when file exists', () => {
    const cache = cacheManager.getCacheData();
    expect(cache.lastRun).toBe('2023-01-01T00:00:00.000Z');
    expect(cache.targetUrl).toBe('https://example.com');
  });

  test('saveCacheData writes cache to file', () => {
    const cacheData = { test: 'data' };
    cacheManager.saveCacheData(cacheData);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('checkIfStepNeedsRun returns correct result for crawl step', () => {
    const config = { baseUrl: 'https://example.com' };
    const result = cacheManager.checkIfStepNeedsRun('crawl', config);
    expect(result).toHaveProperty('needsRun');
    expect(result).toHaveProperty('reason');
  });

  // Additional tests for other functions...
});
```

### 2. Config Manager (`utils/config-manager.js`)

```javascript
// __tests__/utils/config-manager.test.js

const configManager = require('../../utils/config-manager');
const fs = require('fs');
const path = require('path');

jest.mock('fs');
jest.mock('path');

describe('Config Manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('readConfig returns default config when file does not exist', () => {
    fs.existsSync.mockReturnValue(false);
    const config = configManager.readConfig();
    expect(config).toHaveProperty('baseUrl');
    expect(config).toHaveProperty('maxPages');
    expect(config).toHaveProperty('timeout');
  });

  test('readConfig returns parsed config when file exists', () => {
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      baseUrl: 'https://test.com',
      maxPages: 10
    }));
    const config = configManager.readConfig();
    expect(config.baseUrl).toBe('https://test.com');
    expect(config.maxPages).toBe(10);
  });

  test('saveConfig writes config to file', () => {
    const config = { baseUrl: 'https://test.com' };
    configManager.saveConfig(config);
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  // Additional tests...
});
```

### 3. Token Generation (`scripts/generate-tokens.js`)

```javascript
// __tests__/scripts/generate-tokens.test.js

const generateTokens = require('../../scripts/generate-tokens');
const fs = require('fs');

jest.mock('fs');

describe('Generate Tokens', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock data
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('typography')) {
        return JSON.stringify({
          allFontFamilies: ['Arial', 'Helvetica'],
          allFontSizes: ['16px', '24px'],
          allFontWeights: ['400', '700']
        });
      } else if (path.includes('colors')) {
        return JSON.stringify({
          allColorValues: ['#ff0000', '#00ff00', '#0000ff']
        });
      }
      return '{}';
    });
  });

  test('generateTypographyTokens creates correct token structure', () => {
    const typographyData = {
      allFontFamilies: ['Arial', 'Helvetica'],
      allFontSizes: ['16px', '24px'],
      allFontWeights: ['400', '700']
    };

    const tokens = generateTokens.generateTypographyTokens(typographyData);

    expect(tokens).toHaveProperty('fontFamily');
    expect(tokens).toHaveProperty('fontSize');
    expect(tokens).toHaveProperty('fontWeight');
    expect(Object.keys(tokens.fontFamily).length).toBe(2);
    expect(Object.keys(tokens.fontSize).length).toBe(2);
    expect(Object.keys(tokens.fontWeight).length).toBe(2);
  });

  test('generateColorTokens categorizes colors correctly', () => {
    const colorData = {
      allColorValues: ['#ff0000', '#00ff00', '#0000ff', '#333333', '#f5f5f5']
    };

    const tokens = generateTokens.generateColorTokens(colorData);

    expect(tokens).toHaveProperty('primary');
    expect(tokens).toHaveProperty('secondary');
    expect(tokens).toHaveProperty('neutral');
    // Check that colors were categorized
    expect(Object.values(tokens).flat().length).toBe(5);
  });

  // Additional tests for spacing, borders, animations...
});
```

### 4. Color Extraction (`scripts/extract-colors.js`)

```javascript
// __tests__/scripts/extract-colors.test.js

const extractColors = require('../../scripts/extract-colors');
const { chromium } = require('@playwright/test');

// Mock Playwright
jest.mock('@playwright/test', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue({}),
          evaluate: jest.fn().mockResolvedValue({
            elementStyles: {
              'body': [{ styles: { color: '#000000' } }]
            },
            colorValues: ['#000000', '#ffffff'],
            cssVars: { '--primary-color': '#ff0000' }
          })
        }),
        close: jest.fn()
      }),
      close: jest.fn()
    })
  }
}));

describe('Extract Colors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('extractColorsFromPage returns correct color data structure', async () => {
    const page = (await chromium.launch()).newContext().then(ctx => ctx.newPage());
    const url = 'https://example.com';

    const result = await extractColors.extractColorsFromPage(page, url);

    expect(result).toHaveProperty('elementStyles');
    expect(result).toHaveProperty('colorValues');
    expect(result).toHaveProperty('cssVars');
    expect(result.colorValues).toContain('#000000');
    expect(result.colorValues).toContain('#ffffff');
    expect(result.cssVars['--primary-color']).toBe('#ff0000');
  });

  // Additional tests...
});
```

### 5. Nuke Function (`nuke.js`)

```javascript
// __tests__/nuke.test.js

const nukeModule = require('../nuke');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

jest.mock('fs');
jest.mock('path');
jest.mock('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: jest.fn((_, callback) => callback('y')),
    close: jest.fn()
  })
}));

describe('Nuke Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync.mockReturnValue(true);
    fs.readdirSync.mockReturnValue(['file1', 'file2']);
    fs.lstatSync.mockReturnValue({
      isDirectory: jest.fn().mockReturnValue(false)
    });
  });

  test('deleteDirectory removes all files and directories', () => {
    nukeModule.deleteDirectory('test-dir');
    expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    expect(fs.rmdirSync).toHaveBeenCalledTimes(1);
  });

  test('resetConfig writes default config to file', () => {
    nukeModule.resetConfig();
    expect(fs.writeFileSync).toHaveBeenCalled();
    const configArg = fs.writeFileSync.mock.calls[0][1];
    expect(JSON.parse(configArg)).toHaveProperty('baseUrl');
    expect(JSON.parse(configArg)).toHaveProperty('maxPages');
  });

  test('deleteCache removes cache file if it exists', () => {
    nukeModule.deleteCache();
    expect(fs.unlinkSync).toHaveBeenCalled();
  });

  // Additional tests...
});
```

## Testing Challenges and Solutions

### 1. Browser Interaction Testing

**Challenge**: Testing code that interacts with a browser via Playwright.

**Solution**:
- Mock Playwright's API for unit tests
- Create separate integration tests for browser interactions
- Use snapshot testing for HTML output
- Use @vitest/browser for browser-specific tests

### 2. File System Operations

**Challenge**: Testing code that reads from and writes to the file system.

**Solution**:
- Mock the fs module using Vitest's mocking capabilities
- Create test fixtures for file content
- Verify file operations through mock function calls
- Ensure proper default export mocking for ES modules

### 3. Asynchronous Code

**Challenge**: Testing asynchronous code with promises and async/await.

**Solution**:
- Use Vitest's async test capabilities
- Ensure proper error handling in tests
- Use fake timers for time-dependent code

### 4. Module Mocking

**Challenge**: Properly mocking modules with both named exports and default exports.

**Solution**:
- Mock modules before importing them
- Return both named exports and default export in the mock
- Use vi.mock() with a factory function for complex mocks
- Avoid using vi.spyOn() on already mocked functions

### 5. ESLint Integration

**Challenge**: ESLint rules for import order and named exports can conflict with test patterns.

**Solution**:
- Use targeted ESLint disable comments for specific rules in test files
- Configure ESLint to allow importing from dev dependencies in test files
- Organize imports consistently across test files

## Implementation Plan

### Phase 1: Setup and Core Utilities (Week 1)

1. Set up Jest configuration
2. Create test fixtures and mocks
3. Implement tests for cache-manager.js
4. Implement tests for config-manager.js
5. Implement tests for nuke.js

### Phase 2: Token Generation and Data Processing (Week 2)

1. Implement tests for generate-tokens.js
2. Create mocks for extraction data
3. Test color categorization logic
4. Test typography classification
5. Test spacing normalization

### Phase 3: Extraction Logic (Week 3)

1. Create mocks for Playwright
2. Implement tests for extract-colors.js
3. Implement tests for extract-typography.js
4. Implement tests for other extraction modules
5. Test integration between extraction and token generation

### Phase 4: Report Generation and Integration (Week 4)

1. Implement tests for generate-reports.js
2. Test HTML and CSS generation
3. Create integration tests for the full pipeline
4. Improve test coverage based on results
5. Document testing approach and patterns

## Continuous Integration

We recommend setting up a CI pipeline that:

1. Runs tests on every commit
2. Enforces minimum code coverage thresholds
3. Prevents merging code that breaks tests
4. Generates and publishes coverage reports

## Test Directory Structure

We've organized the tests into a clear directory structure:

```
/tests
  /fixtures                       - Shared test data and setup
    mock-data.js                  - Mock data for all tests
    test-setup.js                 - Common test setup code
    test-mocks.js                 - Mocking utilities for tests

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

    /crawler                      - Tests for crawler modules
      site-crawler.test.js        - Tests for site crawler

  /integration                    - Tests for module interactions
    crawler-extractors.test.js    - Tests for crawler + extractors
    extractors-generators.test.js - Tests for extractors + generators

  /setup                          - Test environment setup
    vitest-setup.test.js          - Vitest setup verification
```

## Lessons Learned

1. **Proper Module Mocking**: When using Vitest, it's important to mock modules before importing them. This ensures that the mocked version is used throughout the tests.

2. **Default Exports**: When mocking modules with default exports, make sure to include both the named exports and the default export in the mock.

3. **ESLint Configuration**: The ESLint rules for import order and named exports can be challenging when working with test files. Using targeted disable comments is a good approach.

4. **Test Organization**: Organizing tests by type (unit, integration) and module makes it easier to maintain and run specific tests.

5. **Playwright Mocking**: Mocking Playwright requires careful attention to the browser, context, and page objects and their methods.

6. **File System Mocking**: When mocking the fs module, remember to include both the named exports and the default export to support different import styles.

## Conclusion

This testing plan provides a comprehensive approach to ensuring the reliability and maintainability of the Design Token Crawler application. By focusing on pure functions and core utilities first, we can establish a solid testing foundation before moving on to more complex components.

The modular approach allows for incremental implementation of tests, with each phase building on the previous one. This will result in a robust test suite that provides confidence in the application's functionality and facilitates future enhancements.

By following the lessons learned and using the organized test directory structure, we can maintain a clean and effective test suite that grows with the application.
