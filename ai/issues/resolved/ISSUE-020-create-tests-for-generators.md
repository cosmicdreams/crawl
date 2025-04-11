---
id: ISSUE-020
title: Create Tests for Token and Report Generators
created: 2024-05-15
resolved: 2024-05-15
status: resolved
severity: high
category: testing
related_components: generators
related_pages: src/generators/generate-tokens.js, src/generators/generate-reports.js
---

# Create Tests for Token and Report Generators

## Description
The token and report generators are critical components of the Design Token Crawler application, responsible for transforming extracted data into usable design tokens and visual reports. Currently, these components lack automated tests, making it difficult to ensure their reliability and correctness when making changes to the codebase.

## Impact
- No automated verification of token generation logic
- Risk of introducing bugs when modifying generator code
- Difficult to ensure consistent output formats
- No validation of report generation functionality
- Reduced confidence in the reliability of generated tokens and reports

## Reproduction Steps
1. Examine the codebase and note the lack of tests for:
   - `src/generators/generate-tokens.js`
   - `src/generators/generate-reports.js`
2. Check the `tests` directory and confirm no tests exist for these components

## Expected Behavior
The application should have comprehensive tests for the generator components that:
1. Verify token generation from various input data
2. Ensure correct CSS variable generation
3. Validate JSON token format
4. Test report generation with different inputs
5. Verify HTML report structure and content

## Actual Behavior
No tests exist for the generator components, leaving their functionality unverified.

## Screenshots/Evidence
N/A

## Suggested Solution
Create comprehensive test suites for both generator components:

### 1. Tests for Token Generator (`tests/generators/generate-tokens.test.js`)

```javascript
const fs = require('fs');
const path = require('path');
const generateTokens = require('../../src/generators/generate-tokens');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
}));

describe('Token Generator', () => {
  // Mock data
  const mockTypographyData = {
    fontFamilies: ['Arial', 'Roboto'],
    fontSizes: ['12px', '16px', '24px'],
    fontWeights: ['400', '700'],
    // Add other typography properties
  };

  const mockColorData = {
    colorValues: ['#FF0000', '#00FF00', '#0000FF'],
    cssVars: {
      '--primary-color': '#FF0000',
      '--secondary-color': '#00FF00'
    },
    // Add other color properties
  };

  // Add mock data for spacing, borders, and animations

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock file system
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('typography')) {
        return JSON.stringify({ data: mockTypographyData });
      } else if (filePath.includes('color')) {
        return JSON.stringify({ data: mockColorData });
      }
      // Add other mock implementations
      return '{}';
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should generate tokens from extracted data', async () => {
    // Call the generator
    const result = await generateTokens();

    // Verify the result structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    expect(result).toHaveProperty('spacing');
    expect(result).toHaveProperty('borders');
    expect(result).toHaveProperty('animations');
  });

  test('should generate CSS variables', async () => {
    // Call the generator
    await generateTokens();

    // Verify CSS variables were written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('variables.css'),
      expect.stringContaining('--primary-color')
    );
  });

  test('should generate JSON tokens', async () => {
    // Call the generator
    await generateTokens();

    // Verify JSON tokens were written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('tokens.json'),
      expect.any(String)
    );
  });

  test('should handle missing input files', async () => {
    // Mock missing files
    fs.existsSync.mockReturnValue(false);

    // Call the generator
    const result = await generateTokens();

    // Verify the result still has the expected structure
    expect(result).toHaveProperty('typography');
    expect(result).toHaveProperty('colors');
    // Other assertions
  });

  // Add more tests for specific token generation functions
});
```

### 2. Tests for Report Generator (`tests/generators/generate-reports.test.js`)

```javascript
const fs = require('fs');
const path = require('path');
const generateReports = require('../../src/generators/generate-reports');

// Mock fs and path modules
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
}));

describe('Report Generator', () => {
  // Mock data
  const mockCrawlResults = {
    pages: [
      { url: 'https://example.com', title: 'Example' },
      { url: 'https://example.com/about', title: 'About' }
    ]
  };

  const mockTokens = {
    typography: { /* mock typography tokens */ },
    colors: { /* mock color tokens */ },
    spacing: { /* mock spacing tokens */ },
    borders: { /* mock border tokens */ },
    animations: { /* mock animation tokens */ }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock file system
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('crawl-results')) {
        return JSON.stringify(mockCrawlResults);
      } else if (filePath.includes('tokens')) {
        return JSON.stringify(mockTokens);
      }
      // Add other mock implementations
      return '{}';
    });
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should generate crawl report', async () => {
    // Call the generator
    await generateReports();

    // Verify crawl report was written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-report.html'),
      expect.stringContaining('Example')
    );
  });

  test('should generate design system report', async () => {
    // Call the generator
    await generateReports();

    // Verify design system report was written
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('design-system-report.html'),
      expect.any(String)
    );
  });

  test('should handle missing input files', async () => {
    // Mock missing files
    fs.existsSync.mockReturnValue(false);

    // Call the generator
    await generateReports();

    // Verify reports were still generated with default content
    expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
  });

  // Add more tests for specific report generation functions
});
```

### 3. Implementation Steps

1. Create the test files in the appropriate directories
2. Implement the tests as outlined above
3. Ensure all tests pass with the current implementation
4. Add additional tests for edge cases and error handling
5. Update the generators if needed to improve testability

## Related Issues
- ISSUE-007: Create Tests for Extract Spacing
- ISSUE-008: Create Tests for Extract Borders
- ISSUE-009: Create Tests for Extract Animations
- ISSUE-010: Create Tests for Extract Components
- ISSUE-021: Create Tests for Site Crawler

## History
- 2024-05-15: Issue created
- 2024-05-15: Issue resolved - Implemented comprehensive tests for token and report generators
