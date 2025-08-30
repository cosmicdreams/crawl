# Extractor Test Plan

This document outlines the test plan for the extractor modules in the crawl project. It covers what needs to be tested, how to approach testing, and specific test cases for each extractor.

## Overview

The crawl project includes several extractor modules that extract different types of design elements from web pages:

1. `extract-typography.js` - Extracts typography styles (has tests)
2. `extract-colors.js` - Extracts color values (has tests)
3. `extract-spacing.js` - Extracts spacing patterns (no tests)
4. `extract-borders.js` - Extracts border and shadow styles (no tests)
5. `extract-animations.js` - Extracts animation and transition styles (no tests)
6. `extract-components.js` - Extracts UI components (no tests)

We need to create tests for the extractors that don't have tests yet, following the pattern established by the existing tests.

## Testing Approach

For each extractor, we'll create a test file that:

1. Mocks dependencies (fs, playwright)
2. Tests the main extraction function
3. Tests any helper functions
4. Tests error handling

We'll use Jest as the testing framework, with mocks to avoid actual browser interactions and file system operations.

## Common Test Structure

Each test file should follow this structure:

```javascript
/**
 * Tests for the extract-X.js module
 */

// Mock dependencies
jest.mock('fs');
jest.mock('@playwright/test');

// Import modules after mocking
const fs = require('fs');
const { chromium } = require('@playwright/test');
const extractX = require('../../src/extractors/extract-X');

// Setup mock implementations for chromium
chromium.launch = jest.fn().mockResolvedValue({
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn(),
      close: jest.fn(),
      setContent: jest.fn(),
      screenshot: jest.fn().mockResolvedValue(Buffer.from('fake-image'))
    }),
    close: jest.fn()
  }),
  close: jest.fn()
});

describe('X Extractor', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.readFileSync to return controlled content
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200
        }
      ]
    }));

    // Mock fs.writeFileSync
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();
  });

  describe('extractXFromCrawledPages', () => {
    test('processes crawl results and extracts X', async () => {
      // Setup
      // ...

      // Execute
      await extractX.extractXFromCrawledPages();

      // Verify
      // ...
    });

    test('handles errors gracefully', async () => {
      // Setup
      // ...

      // Execute
      // ...

      // Verify
      // ...
    });
  });

  describe('extractXFromPage', () => {
    test('extracts X from a page', async () => {
      // Setup
      // ...

      // Execute
      // ...

      // Verify
      // ...
    });

    test('handles evaluation errors', async () => {
      // Setup
      // ...

      // Execute
      // ...

      // Verify
      // ...
    });
  });

  // Additional tests for helper functions
});
```

## Specific Test Cases

### 1. extract-spacing.js Tests

#### Main Function Tests
- Test that `extractSpacingFromCrawledPages` correctly processes crawl results
- Test that it handles file not found errors
- Test that it handles browser launch errors
- Test that it correctly merges spacing styles from multiple pages

#### Helper Function Tests
- Test that `extractSpacing` correctly extracts spacing values from a page
- Test that it handles different units (px, rem, em, %)
- Test that it correctly identifies CSS variables related to spacing
- Test that it handles evaluation errors

#### Visualization Tests
- Test that `generateSpacingVisualization` creates the expected HTML
- Test that it takes a screenshot of the visualization

### 2. extract-borders.js Tests

#### Main Function Tests
- Test that `extractBordersFromCrawledPages` correctly processes crawl results
- Test that it handles file not found errors
- Test that it handles browser launch errors
- Test that it correctly merges border styles from multiple pages

#### Helper Function Tests
- Test that `extractBorders` correctly extracts border properties from a page
- Test that it correctly identifies different border styles
- Test that it extracts border radii values
- Test that it extracts box shadows
- Test that it handles evaluation errors

#### Visualization Tests
- Test that border visualization creates the expected HTML
- Test that it takes a screenshot of the visualization

### 3. extract-animations.js Tests

#### Main Function Tests
- Test that `extractAnimationsFromCrawledPages` correctly processes crawl results
- Test that it handles file not found errors
- Test that it handles browser launch errors
- Test that it correctly merges animation styles from multiple pages

#### Helper Function Tests
- Test that `extractAnimations` correctly extracts animation properties from a page
- Test that it correctly identifies different timing functions
- Test that it extracts duration and delay values
- Test that it extracts keyframe animations
- Test that it handles evaluation errors

#### Visualization Tests
- Test that animation visualization creates the expected HTML
- Test that it takes a screenshot of the visualization

### 4. extract-components.js Tests

#### Main Function Tests
- Test that `extractComponents` correctly identifies components using selectors
- Test that it extracts component properties and styles
- Test that it handles evaluation errors

#### Helper Function Tests
- Test that `generateComponentLibrary` correctly processes component data
- Test that `saveComponentLibrary` writes the expected output
- Test that `generateComponentReport` creates the expected HTML
- Test that `generateComponentJavaScript` creates valid JavaScript

## Mock Data

For each test, we'll need to create mock data that mimics the structure of the data returned by the page evaluation functions. This mock data should cover all the properties and edge cases we want to test.

Example mock data for spacing:

```javascript
const mockSpacingData = {
  elementStyles: {
    'div': [
      {
        classes: 'container',
        id: null,
        styles: {
          'margin': '10px',
          'padding': '20px'
        }
      }
    ],
    'h1': [
      {
        classes: 'title',
        id: 'main-title',
        styles: {
          'margin-bottom': '30px'
        }
      }
    ]
  },
  spacingValues: ['10px', '20px', '30px', '1rem', '2em', '50%'],
  cssVars: {
    '--spacing-unit': '8px',
    '--container-margin': '20px'
  }
};
```

## Test Implementation Plan

1. Start with the simplest extractor (probably `extract-spacing.js`)
2. Create the test file structure
3. Implement the main function tests
4. Implement the helper function tests
5. Implement the visualization tests
6. Repeat for the other extractors

## Refactoring Considerations

As we write tests, we may identify areas where the extractors could be refactored to make them more testable. These refactoring suggestions are documented in the `extractor-refactoring-suggestions.md` file.

Some key refactoring considerations:
- Extract the page evaluation logic into separate functions
- Make the config object injectable for testing
- Add functions for single-page extraction
- Improve error handling
- Separate visualization logic from data extraction

## Conclusion

By implementing these tests, we'll improve the reliability and maintainability of the extractor modules. The tests will serve as documentation for how the extractors should work and make it safer to refactor the code in the future.
