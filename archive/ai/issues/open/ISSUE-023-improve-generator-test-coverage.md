---
id: ISSUE-023
title: Improve Generator Test Coverage
created: 2024-05-15
status: open
severity: high
category: testing
related_components: generators
related_pages: src/generators/generate-tokens.js, src/generators/generate-reports.js
---

# Improve Generator Test Coverage

## Description
The generator components (generate-tokens.js and generate-reports.js) have very low test coverage (0.74% statements, 0.23% branches, 0% functions, 0.75% lines for generate-tokens.js), making them critical areas for test improvement. These components are responsible for transforming extracted data into usable design tokens and reports, and their reliability is essential for the application's output.

## Impact
- High risk of introducing bugs when modifying the generators
- No automated verification of token and report generation
- Difficult to ensure consistent output formats
- Reduced confidence in the reliability of generated tokens and reports

## Reproduction Steps
1. Run the test coverage report: `npm test -- --coverage`
2. Observe the extremely low coverage for the generator components:
   ```
   ....js | 9.8  | 1.21 | 0    | 11.62 | 35-711,716-718   
   ....js | 0.74 | 0.23 | 0    | 0.75  | 44-1796,1801-1803
   ```

## Expected Behavior
The generator components should have comprehensive test coverage (at least 80% for all metrics) that verifies:
1. Token generation from various input data
2. CSS variable generation
3. JSON token format validation
4. Report generation with different inputs
5. HTML report structure and content
6. Error handling

## Actual Behavior
The generator components have almost no test coverage, with 0% function coverage for generate-tokens.js and only 0.75% line coverage. The existing tests are minimal and do not verify the core functionality of the generators.

## Screenshots/Evidence
```
....js | 9.8  | 1.21 | 0    | 11.62 | 35-711,716-718   
....js | 0.74 | 0.23 | 0    | 0.75  | 44-1796,1801-1803
```

## Suggested Solution
Expand the existing generator tests to cover all major functionality:

### 1. Token Generator Tests

```javascript
// Tests for token generation from typography data
test('should generate typography tokens correctly', async () => {
  // Mock typography data
  fs.readFileSync.mockImplementation((filePath) => {
    if (filePath.includes('typography')) {
      return JSON.stringify({
        data: {
          fontFamilies: ['Arial', 'Roboto'],
          fontSizes: ['12px', '16px', '24px'],
          fontWeights: ['400', '700'],
          lineHeights: ['1.2', '1.5'],
          letterSpacings: ['0.5px', '1px']
        }
      });
    }
    return '{}';
  });
  
  // Call the generator
  const result = await generateTokens.generateDesignTokens();
  
  // Verify typography tokens
  expect(result.typography).toHaveProperty('fontFamilies');
  expect(result.typography.fontFamilies).toContain('Arial');
  expect(result.typography.fontFamilies).toContain('Roboto');
  
  // Verify CSS variables were generated
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('typography.css'),
    expect.stringContaining('--font-family-')
  );
});

// Tests for token generation from color data
test('should generate color tokens correctly', async () => {
  // Mock color data
  fs.readFileSync.mockImplementation((filePath) => {
    if (filePath.includes('color')) {
      return JSON.stringify({
        data: {
          colorValues: ['#FF0000', '#00FF00', '#0000FF'],
          cssVars: {
            '--primary-color': '#FF0000',
            '--secondary-color': '#00FF00'
          }
        }
      });
    }
    return '{}';
  });
  
  // Call the generator
  const result = await generateTokens.generateDesignTokens();
  
  // Verify color tokens
  expect(result.colors).toHaveProperty('values');
  expect(result.colors.values).toContain('#FF0000');
  
  // Verify CSS variables were generated
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('colors.css'),
    expect.stringContaining('--primary-color')
  );
});

// Tests for JSON token format
test('should generate JSON tokens in the correct format', async () => {
  // Call the generator
  await generateTokens.generateDesignTokens();
  
  // Verify JSON tokens were written
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('tokens.json'),
    expect.stringMatching(/"typography":\s*{/)
  );
  
  // Verify Figma tokens were written
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('figma-tokens.json'),
    expect.any(String)
  );
});

// Tests for error handling
test('should handle missing input files gracefully', async () => {
  // Mock file system to return no files
  fs.existsSync.mockReturnValue(false);
  
  // Call the generator
  const result = await generateTokens.generateDesignTokens();
  
  // Verify the result still has the expected structure
  expect(result).toHaveProperty('typography');
  expect(result).toHaveProperty('colors');
  expect(result).toHaveProperty('spacing');
  expect(result).toHaveProperty('borders');
  expect(result).toHaveProperty('animations');
});
```

### 2. Report Generator Tests

```javascript
// Tests for crawl report generation
test('should generate crawl report correctly', async () => {
  // Mock crawl results
  fs.readFileSync.mockImplementation((filePath) => {
    if (filePath.includes('crawl-results')) {
      return JSON.stringify({
        pages: [
          { url: 'https://example.com', title: 'Example' },
          { url: 'https://example.com/about', title: 'About' }
        ],
        links: [
          { source: 'https://example.com', target: 'https://example.com/about' }
        ]
      });
    }
    return '{}';
  });
  
  // Call the generator
  await generateReports.generateReports();
  
  // Verify crawl report was written
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('crawl-report.html'),
    expect.stringContaining('Example')
  );
  
  // Verify links are included
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('crawl-report.html'),
    expect.stringContaining('https://example.com/about')
  );
});

// Tests for design system report generation
test('should generate design system report correctly', async () => {
  // Mock token data
  fs.readFileSync.mockImplementation((filePath) => {
    if (filePath.includes('tokens')) {
      return JSON.stringify({
        typography: {
          fontFamilies: ['Arial', 'Roboto']
        },
        colors: {
          values: ['#FF0000', '#00FF00']
        }
      });
    }
    return '{}';
  });
  
  // Call the generator
  await generateReports.generateReports();
  
  // Verify design system report was written
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('design-system-report.html'),
    expect.stringContaining('Typography')
  );
  
  // Verify color information is included
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('design-system-report.html'),
    expect.stringContaining('Colors')
  );
});

// Tests for error handling
test('should handle missing input files gracefully', async () => {
  // Mock file system to return no files
  fs.existsSync.mockReturnValue(false);
  
  // Call the generator
  await generateReports.generateReports();
  
  // Verify reports were still generated with default content
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('crawl-report.html'),
    expect.any(String)
  );
  
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('design-system-report.html'),
    expect.any(String)
  );
});

// Tests for different report formats
test('should generate reports in different formats', async () => {
  // Call the generator with markdown format
  await generateReports.generateReports({ format: 'markdown' });
  
  // Verify markdown report was written
  expect(fs.writeFileSync).toHaveBeenCalledWith(
    expect.stringContaining('.md'),
    expect.stringContaining('# ')
  );
});
```

## Implementation Steps

1. Expand the existing generator test files with the tests outlined above
2. Mock all external dependencies (fs, path, etc.)
3. Test all major functionality of the generators
4. Ensure tests are robust and handle edge cases
5. Verify test coverage reaches at least 80% for all metrics

## Related Issues
- ISSUE-020: Create Tests for Token and Report Generators
- ISSUE-021: Create Tests for Site Crawler
- ISSUE-022: Improve Site Crawler Test Coverage

## History
- 2024-05-15: Issue created
