---
id: ISSUE-022
title: Improve Site Crawler Test Coverage
created: 2024-05-15
status: open
severity: high
category: testing
related_components: crawler
related_pages: src/crawler/site-crawler.js
---

# Improve Site Crawler Test Coverage

## Description
The site crawler component has extremely low test coverage (4.8% statements, 2.58% branches, 0% functions, 5.21% lines), making it one of the most critical areas for test improvement. The site crawler is a fundamental component of the application, and its reliability is essential for the entire extraction process.

## Impact
- High risk of introducing bugs when modifying the site crawler
- No automated verification of crawler functionality
- Difficult to ensure the crawler behaves correctly in different scenarios
- Reduced confidence in the reliability of the crawling process

## Reproduction Steps
1. Run the test coverage report: `npm test -- --coverage`
2. Observe the extremely low coverage for the crawler component:
   ```
   crawler | 4.8  | 2.58 | 0    | 5.21 | 
   ....js  | 4.8  | 2.58 | 0    | 5.21 | 62-571,576-580
   ```

## Expected Behavior
The site crawler should have comprehensive test coverage (at least 80% for all metrics) that verifies:
1. URL discovery and filtering
2. Handling of different page types
3. Screenshot capture functionality
4. Error handling
5. Configuration options (max pages, timeout, etc.)
6. Robots.txt handling
7. Rate limiting functionality

## Actual Behavior
The site crawler has almost no test coverage, with 0% function coverage and only 5.21% line coverage. The existing tests are minimal and do not verify the core functionality of the crawler.

## Screenshots/Evidence
```
crawler | 4.8  | 2.58 | 0    | 5.21 | 
....js  | 4.8  | 2.58 | 0    | 5.21 | 62-571,576-580
```

## Suggested Solution
Expand the existing site crawler tests to cover all major functionality:

1. **URL Discovery and Filtering**:
   ```javascript
   test('should discover and filter URLs correctly', async () => {
     // Mock page.evaluate to return a mix of internal and external links
     mockPage.evaluate.mockResolvedValue([
       { href: 'https://example.com/about', text: 'About' },
       { href: 'https://external-site.com', text: 'External' },
       { href: 'https://example.com/admin', text: 'Admin' },
       { href: 'https://example.com/contact', text: 'Contact' }
     ]);
     
     // Call the crawler with ignore patterns
     const result = await siteCrawler.crawlSite('https://example.com', 10, {
       ignorePatterns: ['/admin']
     });
     
     // Verify internal links are discovered
     expect(result.links).toContainEqual(expect.objectContaining({
       source: 'https://example.com',
       target: 'https://example.com/about'
     }));
     
     // Verify external links are recorded but not crawled
     expect(result.links).toContainEqual(expect.objectContaining({
       source: 'https://example.com',
       target: 'https://external-site.com'
     }));
     expect(result.pages.map(p => p.url)).not.toContain('https://external-site.com');
     
     // Verify ignored patterns are filtered
     expect(result.pages.map(p => p.url)).not.toContain('https://example.com/admin');
   });
   ```

2. **Screenshot Functionality**:
   ```javascript
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
   ```

3. **Error Handling**:
   ```javascript
   test('should handle navigation errors gracefully', async () => {
     // Mock navigation error
     mockPage.goto.mockRejectedValueOnce(new Error('Navigation failed'));
     
     // Call the crawler
     const result = await siteCrawler.crawlSite('https://example.com', 10);
     
     // Verify error was handled and crawling continued
     expect(result.errors.length).toBeGreaterThan(0);
     expect(result.errors[0].message).toContain('Navigation failed');
   });
   ```

4. **Configuration Options**:
   ```javascript
   test('should respect maxPages limit', async () => {
     // Mock multiple links
     mockPage.evaluate.mockResolvedValue([
       { href: 'https://example.com/page1', text: 'Page 1' },
       { href: 'https://example.com/page2', text: 'Page 2' },
       { href: 'https://example.com/page3', text: 'Page 3' }
     ]);
     
     // Call the crawler with a low maxPages limit
     const result = await siteCrawler.crawlSite('https://example.com', 2);
     
     // Verify the number of pages doesn't exceed the limit
     expect(result.pages.length).toBeLessThanOrEqual(2);
   });
   ```

5. **Robots.txt Handling**:
   ```javascript
   test('should respect robots.txt when configured', async () => {
     // Mock robots.txt parser
     jest.mock('robots-parser', () => {
       return jest.fn().mockImplementation(() => ({
         isAllowed: (url, userAgent) => !url.includes('/disallowed')
       }));
     });
     
     // Mock links including disallowed paths
     mockPage.evaluate.mockResolvedValue([
       { href: 'https://example.com/allowed', text: 'Allowed' },
       { href: 'https://example.com/disallowed', text: 'Disallowed' }
     ]);
     
     // Call the crawler with respectRobotsTxt option
     const result = await siteCrawler.crawlSite('https://example.com', 10, {
       respectRobotsTxt: true
     });
     
     // Verify disallowed paths are not crawled
     expect(result.pages.map(p => p.url)).toContain('https://example.com/allowed');
     expect(result.pages.map(p => p.url)).not.toContain('https://example.com/disallowed');
   });
   ```

6. **Rate Limiting**:
   ```javascript
   test('should respect rate limiting', async () => {
     // Mock Date.now to track timing
     const originalNow = Date.now;
     const mockNow = jest.fn();
     global.Date.now = mockNow;
     
     // Set up mock timing
     mockNow.mockReturnValueOnce(1000); // First call
     mockNow.mockReturnValueOnce(1100); // Second call (100ms later)
     
     // Call the crawler with rate limiting
     await siteCrawler.crawlSite('https://example.com', 2, {
       rateLimit: 500 // 500ms between requests
     });
     
     // Verify delay was added between requests
     expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));
     
     // Restore original Date.now
     global.Date.now = originalNow;
   });
   ```

## Implementation Steps

1. Expand the existing site crawler test file with the tests outlined above
2. Mock all external dependencies (Playwright, fs, path, etc.)
3. Test all major functionality of the crawler
4. Ensure tests are robust and handle edge cases
5. Verify test coverage reaches at least 80% for all metrics

## Related Issues
- ISSUE-020: Create Tests for Token and Report Generators
- ISSUE-021: Create Tests for Site Crawler

## History
- 2024-05-15: Issue created
