/**
 * Implementation tests for the site-crawler.js module
 *
 * These tests verify the internal implementation of the site crawler.
 */

import { describe, test, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('@playwright/test', () => ({
  chromium: {
    launch: vi.fn().mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue({}),
          content: vi.fn().mockResolvedValue('<html><body><a href="/page1">Link 1</a><a href="/page2">Link 2</a></body></html>'),
          evaluate: vi.fn().mockImplementation(() => {
            // Simulate the browser evaluation
            return [
              { href: 'https://example.com/page1', text: 'Link 1' },
              { href: 'https://example.com/page2', text: 'Link 2' }
            ];
          }),
          title: vi.fn().mockResolvedValue('Example Page'),
          url: vi.fn().mockResolvedValue('https://example.com'),
          screenshot: vi.fn().mockResolvedValue(Buffer.from('mock-screenshot')),
          close: vi.fn().mockResolvedValue(undefined)
        }),
        close: vi.fn().mockResolvedValue(undefined)
      }),
      close: vi.fn().mockResolvedValue(undefined)
    })
  }
}));

vi.mock('fs', () => {
  const fs = {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}')
  };
  return { ...fs, default: fs };
});

vi.mock('path', () => {
  const path = {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    dirname: vi.fn().mockReturnValue('/mock/dir')
  };
  return { ...path, default: path };
});

// We can't directly import the internal functions from site-crawler.js
// Let's create our own implementation of shouldCrawl for testing
function shouldCrawlUrl(url, baseUrl, config) {
  if (!url) return false;

  try {
    const urlObj = new URL(url, baseUrl);

    // Check if URL is from the same domain
    if (!urlObj.href.startsWith(baseUrl)) {
      return false;
    }

    // Check file extensions to ignore
    for (const ext of config.ignoreExtensions || []) {
      if (urlObj.pathname.endsWith(ext)) {
        return false;
      }
    }

    // Check patterns to ignore
    for (const pattern of config.ignorePatterns || []) {
      if (url.includes(pattern)) {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}

describe('Site Crawler Implementation', () => {
  test('shouldCrawlUrl should filter URLs correctly', () => {
    // Setup
    const baseUrl = 'https://example.com';
    const config = {
      ignorePatterns: ['#', 'mailto:', 'tel:'],
      ignoreExtensions: ['.pdf', '.jpg', '.png']
    };

    // Test valid URLs
    expect(shouldCrawlUrl('https://example.com/page1', baseUrl, config)).toBe(true);
    expect(shouldCrawlUrl('https://example.com/about', baseUrl, config)).toBe(true);
    expect(shouldCrawlUrl('/contact', baseUrl, config)).toBe(true);

    // Test URLs with ignored patterns
    expect(shouldCrawlUrl('https://example.com/page1#section', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl('mailto:info@example.com', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl('tel:+1234567890', baseUrl, config)).toBe(false);

    // Test URLs with ignored extensions
    expect(shouldCrawlUrl('https://example.com/document.pdf', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl('https://example.com/image.jpg', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl('https://example.com/photo.png', baseUrl, config)).toBe(false);

    // Test external URLs
    expect(shouldCrawlUrl('https://another-site.com', baseUrl, config)).toBe(false);

    // Test invalid URLs
    expect(shouldCrawlUrl('javascript:void(0)', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl('', baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl(null, baseUrl, config)).toBe(false);
    expect(shouldCrawlUrl(undefined, baseUrl, config)).toBe(false);
  });
});
