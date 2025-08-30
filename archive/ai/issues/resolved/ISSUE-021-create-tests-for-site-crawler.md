---
id: ISSUE-021
title: Create Tests for Site Crawler
created: 2024-05-15
resolved: 2024-05-15
status: resolved
severity: high
category: testing
related_components: crawler
related_pages: src/crawler/site-crawler.js
---

# Create Tests for Site Crawler

## Description
The site crawler is a fundamental component of the Design Token Crawler application, responsible for discovering and navigating web pages for analysis. Currently, this critical component lacks automated tests, making it difficult to ensure its reliability and correctness when making changes to the codebase.

## Impact
- No automated verification of crawler functionality
- Risk of introducing bugs when modifying crawler code
- Difficult to ensure proper URL discovery and filtering
- No validation of screenshot capture functionality
- Reduced confidence in the reliability of the crawling process

## Reproduction Steps
1. Examine the codebase and note the lack of tests for `src/crawler/site-crawler.js`
2. Check the `tests` directory and confirm no tests exist for this component

## Expected Behavior
The application should have comprehensive tests for the site crawler that:
1. Verify URL discovery and filtering
2. Test handling of different page types
3. Validate screenshot capture functionality
4. Ensure proper error handling
5. Test configuration options (max pages, timeout, etc.)

## Actual Behavior
No tests exist for the site crawler component, leaving its functionality unverified.

## Screenshots/Evidence
N/A

## Suggested Solution
Create a comprehensive test suite for the site crawler:

### 1. Tests for Site Crawler (`tests/crawler/site-crawler.test.js`)

```javascript
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');
const siteCrawler = require('../../src/crawler/site-crawler');

// Mock fs, path, and playwright modules
jest.mock('fs');
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn().mockImplementation((...args) => args.join('/'))
}));
jest.mock('@playwright/test', () => ({
  chromium: {
    launch: jest.fn()
  }
}));

describe('Site Crawler', () => {
  // Mock browser, context, and page
  const mockPage = {
    goto: jest.fn(),
    content: jest.fn(),
    title: jest.fn(),
    evaluate: jest.fn(),
    screenshot: jest.fn(),
    close: jest.fn()
  };

  const mockContext = {
    newPage: jest.fn().mockResolvedValue(mockPage)
  };

  const mockBrowser = {
    newContext: jest.fn().mockResolvedValue(mockContext),
    close: jest.fn()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup playwright mocks
    chromium.launch.mockResolvedValue(mockBrowser);

    // Mock page methods
    mockPage.goto.mockResolvedValue(null);
    mockPage.content.mockResolvedValue('<html><body><a href="/about">About</a><a href="/contact">Contact</a></body></html>');
    mockPage.title.mockResolvedValue('Test Page');
    mockPage.evaluate.mockImplementation((fn) => {
      // Mock the evaluate function to return links
      return Promise.resolve([
        { href: 'https://example.com/about', text: 'About' },
        { href: 'https://example.com/contact', text: 'Contact' }
      ]);
    });
    mockPage.screenshot.mockResolvedValue(Buffer.from('fake-screenshot'));

    // Mock file system
    fs.existsSync.mockReturnValue(false);
    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
  });

  test('should crawl pages and collect links', async () => {
    // Call the crawler
    const result = await siteCrawler.crawlSite('https://example.com', 10);

    // Verify the browser was launched
    expect(chromium.launch).toHaveBeenCalled();

    // Verify pages were navigated
    expect(mockPage.goto).toHaveBeenCalledWith('https://example.com', expect.any(Object));

    // Verify links were collected
    expect(result.pages.length).toBeGreaterThan(0);
    expect(result.pages[0].url).toBe('https://example.com');
    expect(result.pages[0].title).toBe('Test Page');
  });

  test('should respect maxPages limit', async () => {
    // Set a low maxPages limit
    const maxPages = 2;

    // Call the crawler
    const result = await siteCrawler.crawlSite('https://example.com', maxPages);

    // Verify the number of pages doesn't exceed the limit
    expect(result.pages.length).toBeLessThanOrEqual(maxPages);
  });

  test('should filter URLs based on ignorePatterns', async () => {
    // Mock the evaluate function to return links including ignored patterns
    mockPage.evaluate.mockResolvedValueOnce([
      { href: 'https://example.com/about', text: 'About' },
      { href: 'https://example.com/admin/dashboard', text: 'Admin' },
      { href: 'https://example.com/contact', text: 'Contact' }
    ]);

    // Call the crawler with ignore patterns
    const result = await siteCrawler.crawlSite('https://example.com', 10, {
      ignorePatterns: ['/admin/']
    });

    // Verify admin URL was filtered out
    const urls = result.pages.map(page => page.url);
    expect(urls).not.toContain('https://example.com/admin/dashboard');
  });

  test('should capture screenshots when enabled', async () => {
    // Call the crawler with screenshots enabled
    await siteCrawler.crawlSite('https://example.com', 10, {
      screenshotsEnabled: true
    });

    // Verify screenshots were captured
    expect(mockPage.screenshot).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('.png'),
      expect.any(Buffer)
    );
  });

  test('should handle navigation errors', async () => {
    // Mock navigation error
    mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));

    // Call the crawler
    const result = await siteCrawler.crawlSite('https://example.com', 10);

    // Verify error was handled and crawling continued
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].message).toContain('Navigation failed');
  });

  test('should save results to file', async () => {
    // Call the crawler
    await siteCrawler.crawlSite('https://example.com', 10);

    // Verify results were saved
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('crawl-results.json'),
      expect.any(String)
    );
  });

  // Add more tests for specific crawler functions and edge cases
});
```

### 2. Implementation Steps

1. Create the test file in the appropriate directory
2. Implement the tests as outlined above
3. Ensure all tests pass with the current implementation
4. Add additional tests for edge cases and error handling
5. Update the crawler if needed to improve testability

### 3. Additional Test Cases to Consider

- Test handling of different URL formats (relative, absolute, with query parameters)
- Test handling of redirects
- Test handling of different content types (HTML, PDF, images)
- Test handling of authentication requirements
- Test handling of rate limiting
- Test handling of robots.txt restrictions
- Test handling of large sites (performance and memory usage)
- Test handling of cyclic links
- Test handling of malformed HTML

## Related Issues
- ISSUE-007: Create Tests for Extract Spacing
- ISSUE-008: Create Tests for Extract Borders
- ISSUE-009: Create Tests for Extract Animations
- ISSUE-010: Create Tests for Extract Components
- ISSUE-020: Create Tests for Token and Report Generators

## History
- 2024-05-15: Issue created
- 2024-05-15: Issue resolved - Implemented comprehensive tests for site crawler
