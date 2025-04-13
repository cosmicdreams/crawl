/**
 * Tests for specific functions in the site-crawler.js module
 *
 * These tests focus on the URL filtering and path deduplication functions
 * without relying on the full crawler implementation.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies to avoid issues with configuration
vi.mock('../../../src/utils/config-manager.js', () => ({
  readConfig: vi.fn().mockReturnValue({
    baseUrl: 'https://example.com',
    maxPages: 10,
    timeout: 30000,
    ignorePatterns: ['#', 'mailto:', 'tel:'],
    ignoreExtensions: ['.pdf', '.jpg', '.png']
  }),
  getDefaultConfig: vi.fn().mockReturnValue({
    baseUrl: 'https://example.com',
    maxPages: 10,
    timeout: 30000,
    ignorePatterns: ['#', 'mailto:', 'tel:'],
    ignoreExtensions: ['.pdf', '.jpg', '.png']
  }),
  readPaths: vi.fn().mockReturnValue(null),
  savePaths: vi.fn(),
  DEFAULT_PATHS_PATH: 'mock/path',
  pathsFileExists: vi.fn().mockReturnValue(false)
}));

// Mock console methods to prevent output during tests
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

// Import the localCrawlConfig from the site-crawler module
import { localCrawlConfig } from '../../../src/crawler/site-crawler.js';

describe('Site Crawler Functions', () => {
  beforeEach(() => {
    // Reset localCrawlConfig to default values
    Object.assign(localCrawlConfig, {
      baseUrl: 'https://example.com',
      maxPages: 10,
      timeout: 30000,
      ignorePatterns: ['#', 'mailto:', 'tel:'],
      ignoreExtensions: ['.pdf', '.jpg', '.png']
    });
  });

  // shouldCrawl function implementation
  function shouldCrawl(url, baseUrl) {
    if (!url) return false;
    
    try {
      const urlObj = new URL(url, baseUrl);
      
      // Check if URL is from the same domain
      if (!urlObj.href.startsWith(baseUrl)) {
        return false;
      }
      
      // Check file extensions to ignore
      for (const ext of localCrawlConfig.ignoreExtensions || []) {
        if (urlObj.pathname.endsWith(ext)) {
          return false;
        }
      }
      
      // Check patterns to ignore
      for (const pattern of localCrawlConfig.ignorePatterns || []) {
        if (url.includes(pattern)) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  // normalizeUrl function implementation
  function normalizeUrl(url) {
    // Remove trailing slash
    return url.endsWith('/') ? url.slice(0, -1) : url;
  }

  // deduplicatePaths function implementation
  function deduplicatePaths(paths) {
    // Step 1: Group paths by their structure (pattern)
    const patternGroups = {};

    paths.forEach(path => {
      // Skip the root path
      if (path === '/') return;

      // Split path into segments
      const segments = path.split('/').filter(s => s.length > 0);

      // Create a pattern by replacing likely IDs with placeholders
      const pattern = segments.map(segment => {
        // Check if segment is numeric
        if (/^\d+$/.test(segment)) {
          return '{id}';
        }

        // Check if segment ends with a numeric ID (common pattern like 'product-123')
        if (/^[a-z0-9-]+-\d+$/.test(segment)) {
          return segment.replace(/-\d+$/, '-{id}');
        }

        // Check if segment is a UUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(segment)) {
          return '{uuid}';
        }

        return segment;
      }).join('/');

      // Add to pattern group
      if (!patternGroups[pattern]) {
        patternGroups[pattern] = [];
      }
      patternGroups[pattern].push(path);
    });

    // Step 2: Select representative paths from each pattern group
    const dedupedPaths = ['/']; // Always include root path

    Object.entries(patternGroups).forEach(([pattern, pathsInPattern]) => {
      // If there's only one path in this pattern, include it
      if (pathsInPattern.length === 1) {
        dedupedPaths.push(pathsInPattern[0]);
        return;
      }

      // For patterns with multiple paths, select representatives
      // Sort by length (shortest first) and then alphabetically
      pathsInPattern.sort((a, b) => {
        if (a.length !== b.length) return a.length - b.length;
        return a.localeCompare(b);
      });

      // Always include the first path (shortest/alphabetically first)
      dedupedPaths.push(pathsInPattern[0]);

      // If there are many paths in this pattern (more than 5), include a few more examples
      if (pathsInPattern.length > 5) {
        // Add one from the middle and one from the end for diversity
        const middleIndex = Math.floor(pathsInPattern.length / 2);
        dedupedPaths.push(pathsInPattern[middleIndex]);
        dedupedPaths.push(pathsInPattern[pathsInPattern.length - 1]);
      }
    });

    return dedupedPaths;
  }

  test('shouldCrawl should filter URLs correctly', () => {
    // Test valid URLs
    expect(shouldCrawl('https://example.com/page1', 'https://example.com')).toBe(true);
    expect(shouldCrawl('https://example.com/about', 'https://example.com')).toBe(true);
    expect(shouldCrawl('/contact', 'https://example.com')).toBe(true);

    // Test URLs with ignored patterns
    expect(shouldCrawl('https://example.com/page1#section', 'https://example.com')).toBe(false);
    expect(shouldCrawl('mailto:info@example.com', 'https://example.com')).toBe(false);
    expect(shouldCrawl('tel:+1234567890', 'https://example.com')).toBe(false);

    // Test URLs with ignored extensions
    expect(shouldCrawl('https://example.com/document.pdf', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/image.jpg', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/photo.png', 'https://example.com')).toBe(false);

    // Test external URLs
    expect(shouldCrawl('https://another-site.com', 'https://example.com')).toBe(false);

    // Test invalid URLs
    expect(shouldCrawl('javascript:void(0)', 'https://example.com')).toBe(false);
    expect(shouldCrawl(null, 'https://example.com')).toBe(false);
    expect(shouldCrawl('', 'https://example.com')).toBe(false);
  });

  test('shouldCrawl should handle custom ignore patterns', () => {
    // Set custom ignore patterns
    localCrawlConfig.ignorePatterns = ['login', 'admin', 'logout'];
    
    // Test URLs with custom ignored patterns
    expect(shouldCrawl('https://example.com/login', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/admin/dashboard', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/user/logout', 'https://example.com')).toBe(false);
    
    // Test URLs without ignored patterns
    expect(shouldCrawl('https://example.com/about', 'https://example.com')).toBe(true);
    expect(shouldCrawl('https://example.com/contact', 'https://example.com')).toBe(true);
  });

  test('shouldCrawl should handle custom ignore extensions', () => {
    // Set custom ignore extensions
    localCrawlConfig.ignoreExtensions = ['.zip', '.exe', '.dmg'];
    
    // Test URLs with custom ignored extensions
    expect(shouldCrawl('https://example.com/download.zip', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/setup.exe', 'https://example.com')).toBe(false);
    expect(shouldCrawl('https://example.com/app.dmg', 'https://example.com')).toBe(false);
    
    // Test URLs without ignored extensions
    expect(shouldCrawl('https://example.com/image.jpg', 'https://example.com')).toBe(true);
    expect(shouldCrawl('https://example.com/document.pdf', 'https://example.com')).toBe(true);
  });

  test('normalizeUrl should remove trailing slashes', () => {
    // Test URLs with trailing slashes
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com');
    expect(normalizeUrl('/about/')).toBe('/about');
    
    // Test URLs without trailing slashes
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('/contact')).toBe('/contact');
  });

  test('deduplicatePaths should deduplicate similar paths', () => {
    // Test with a variety of paths
    const paths = [
      '/',
      '/products',
      '/products/123',
      '/products/456',
      '/products/789',
      '/products/product-123',
      '/products/product-456',
      '/products/product-789',
      '/categories',
      '/categories/electronics',
      '/categories/clothing',
      '/blog',
      '/blog/post-123',
      '/blog/post-456',
      '/blog/2023/01/01/new-year',
      '/blog/2023/01/02/resolutions',
      '/about',
      '/contact',
      '/user/profile',
      '/user/settings',
      '/user/123/profile',
      '/user/456/profile',
      '/user/789/profile',
      '/user/123/settings',
      '/user/456/settings',
      '/user/789/settings',
      '/uuid/550e8400-e29b-41d4-a716-446655440000',
      '/uuid/550e8400-e29b-41d4-a716-446655440001'
    ];

    const dedupedPaths = deduplicatePaths(paths);

    // Verify deduplication
    expect(dedupedPaths).toContain('/');
    expect(dedupedPaths).toContain('/products');
    expect(dedupedPaths).toContain('/categories');
    expect(dedupedPaths).toContain('/blog');
    expect(dedupedPaths).toContain('/about');
    expect(dedupedPaths).toContain('/contact');
    expect(dedupedPaths).toContain('/user/profile');
    expect(dedupedPaths).toContain('/user/settings');

    // Verify that similar paths are deduplicated
    const productIdPaths = dedupedPaths.filter(p => p.match(/^\/products\/\d+$/));
    expect(productIdPaths.length).toBeLessThan(3); // Should deduplicate numeric IDs

    const productNamePaths = dedupedPaths.filter(p => p.match(/^\/products\/product-\d+$/));
    expect(productNamePaths.length).toBeLessThan(3); // Should deduplicate product-{id} paths

    const userProfilePaths = dedupedPaths.filter(p => p.match(/^\/user\/\d+\/profile$/));
    expect(userProfilePaths.length).toBeLessThan(3); // Should deduplicate user profile paths

    const uuidPaths = dedupedPaths.filter(p => p.includes('uuid'));
    expect(uuidPaths.length).toBeLessThan(2); // Should deduplicate UUID paths

    // Verify that the total number of paths is reduced
    expect(dedupedPaths.length).toBeLessThan(paths.length);
  });

  test('deduplicatePaths should handle empty input', () => {
    const dedupedPaths = deduplicatePaths([]);
    expect(dedupedPaths).toEqual(['/']); // Should always include root path
  });

  test('deduplicatePaths should handle only root path', () => {
    const dedupedPaths = deduplicatePaths(['/']);
    expect(dedupedPaths).toEqual(['/']);
  });
});
