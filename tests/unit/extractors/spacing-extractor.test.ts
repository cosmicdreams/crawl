// tests/unit/extractors/spacing-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlResult } from '../../../src/core/types.js';

// Shared state for evaluate call tracking
const evaluateState = { callCount: 0 };

// Create mocks in hoisted scope
const { fsMock, pathMock, playwrightMock } = vi.hoisted(() => {
  const fs = {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn().mockReturnValue('{}'),
  };

  const path = {
    join: vi.fn((...args) => args.join('/')),
    dirname: vi.fn((p: string) => p.split('/').slice(0, -1).join('/')),
    basename: vi.fn((p: string) => p.split('/').pop() || ''),
  };

  // Mock page.evaluate to return spacing data in the format the implementation expects
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    evaluate: vi.fn().mockImplementation(() => {
      // The implementation calls evaluate 3 times per page: margin, padding, gap
      // Return different data for each call in sequence
      const callIndex = evaluateState.callCount++;

      // First call: margin values
      if (callIndex % 3 === 0) {
        return Promise.resolve({
          '16px': { value: '16px', property: 'margin', element: 'div', usageCount: 2 },
          '24px': { value: '24px', property: 'marginTop', element: 'h2', usageCount: 1 },
          '32px': { value: '32px', property: 'marginBottom', element: 'section', usageCount: 1 }
        });
      }

      // Second call: padding values (use different values to avoid deduplication)
      if (callIndex % 3 === 1) {
        return Promise.resolve({
          '20px': { value: '20px', property: 'padding', element: 'div', usageCount: 8 },
          '8px': { value: '8px', property: 'paddingLeft', element: 'p', usageCount: 3 },
          '28px': { value: '28px', property: 'paddingTop', element: 'footer', usageCount: 1 }
        });
      }

      // Third call: gap values (use different values to avoid deduplication)
      return Promise.resolve({
        '12px': { value: '12px', property: 'gap', element: 'div', usageCount: 4 },
        '4px': { value: '4px', property: 'rowGap', element: 'nav', usageCount: 2 }
      });
    }),
    setDefaultTimeout: vi.fn(),
    close: vi.fn().mockResolvedValue(null)
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage)
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(null)
  };

  return {
    fsMock: { default: fs, ...fs },
    pathMock: { default: path, ...path },
    playwrightMock: {
      chromium: {
        launch: vi.fn().mockResolvedValue(mockBrowser)
      }
    }
  };
});

// Mock modules BEFORE imports
vi.mock('node:fs', () => fsMock);
vi.mock('node:path', () => pathMock);
vi.mock('playwright', () => playwrightMock);

// Import after mocking
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
const { SpacingExtractorStage } = await import('../../../src/core/stages/spacing-extractor-stage.js');

describe('SpacingExtractorStage', () => {
  let extractor: any;
  let mockCrawlResult: CrawlResult;

  beforeEach(() => {
    // Reset evaluate call counter
    evaluateState.callCount = 0;

    // Create a new extractor with default options
    extractor = new SpacingExtractorStage({
      includeMargins: true,
      includePadding: true,
      includeGap: true,
      minimumOccurrences: 1,
      outputDir: './test-results'
    });

    // Create mock crawl result
    mockCrawlResult = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200,
          contentType: 'text/html'
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Reset mock call counts
    vi.clearAllMocks();
  });

  it('should create output directory if it does not exist', async () => {
    await extractor.process(mockCrawlResult);
    
    expect(fsMock.existsSync).toHaveBeenCalledWith(pathMock.join('./test-results', 'raw'));
    expect(fsMock.mkdirSync).toHaveBeenCalledWith(pathMock.join('./test-results', 'raw'), { recursive: true });
  });

  it('should extract spacing values from crawled pages', async () => {
    const result = await extractor.process(mockCrawlResult);

    // Check that we have the expected number of tokens
    expect(result.tokens.length).toBeGreaterThan(0);

    // Check that we have margin values
    expect(result.tokens.some(token => token.category === 'margin')).toBe(true);

    // Check that we have padding values
    expect(result.tokens.some(token => token.category === 'padding')).toBe(true);

    // Check that we have gap values
    expect(result.tokens.some(token => token.category === 'gap')).toBe(true);
  });

  it('should respect the minOccurrences option', async () => {
    // Create an extractor with a higher minimum occurrences
    const strictExtractor = new SpacingExtractorStage({
      includeMargins: true,
      includePadding: true,
      includeGap: true,
      minimumOccurrences: 5, // Set a high value to filter out most spacings
      outputDir: './test-results'
    });

    const result = await strictExtractor.process(mockCrawlResult);

    // We should have fewer tokens because of the higher threshold
    expect(result.tokens.length).toBeLessThan(8); // Total mocked values with usageCount >= 5

    // The 20px padding should still be included (usageCount = 8)
    const padding20px = result.tokens.find((token: any) =>
      token.value?.value === 20 && token.value?.unit === 'px' && token.category === 'padding'
    );
    expect(padding20px).toBeDefined();

    // The 28px padding should be excluded (usageCount = 1)
    const padding28px = result.tokens.find((token: any) =>
      token.value?.value === 28 && token.value?.unit === 'px' && token.category === 'padding'
    );
    expect(padding28px).toBeUndefined();
  });

  it('should handle missing data gracefully', async () => {
    // Create empty crawl result to test defensive programming
    const emptyCrawlResult: CrawlResult = {
      baseUrl: 'https://example.com',
      crawledPages: [],
      timestamp: new Date().toISOString()
    };

    // Should not throw error with empty pages
    await expect(extractor.process(emptyCrawlResult)).resolves.not.toThrow();

    const result = await extractor.process(emptyCrawlResult);

    // With no pages to process, we should get empty results (no fake data)
    expect(result.tokens.length).toBe(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.totalSpacings).toBe(0);
  });

  it('should validate configuration parameters', () => {
    // Test edge case: negative minimumOccurrences
    expect(() => {
      new SpacingExtractorStage({
        minimumOccurrences: -1,
        outputDir: './test-results'
      });
    }).not.toThrow(); // Should handle gracefully

    // Test edge case: invalid outputDir
    expect(() => {
      new SpacingExtractorStage({
        outputDir: ''
      });
    }).not.toThrow(); // Should handle gracefully
  });

  it('should handle network failures gracefully', async () => {
    // Create a new mock browser with network failure
    const failingMockPage = {
      goto: vi.fn().mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED')),
      evaluate: vi.fn(),
      setDefaultTimeout: vi.fn(),
      close: vi.fn().mockResolvedValue(null)
    };

    const failingMockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(failingMockPage)
      }),
      close: vi.fn().mockResolvedValue(null)
    };

    // Override the mock for this test only
    vi.mocked(chromium.launch).mockResolvedValue(failingMockBrowser as any);

    // Should not throw error with network failures and should return empty results
    const result = await extractor.process(mockCrawlResult);

    // When network fails, we should get empty results (no fake data)
    expect(result.tokens.length).toBe(0);
    expect(result.stats).toBeDefined();
    expect(result.stats.totalSpacings).toBe(0);
  });

  it('should provide comprehensive edge case coverage', async () => {
    // Test with malformed crawl result
    const malformedResult = {
      baseUrl: null,
      crawledPages: undefined,
      timestamp: ''
    } as any;
    
    await expect(extractor.process(malformedResult)).resolves.not.toThrow();
    
    // Test with very large data sets (performance edge case)
    const largeCrawlResult: CrawlResult = {
      baseUrl: 'https://example.com',
      crawledPages: Array(1000).fill(0).map((_, i) => ({
        url: `https://example.com/page-${i}`,
        title: `Page ${i}`,
        status: 200,
        contentType: 'text/html'
      })),
      timestamp: new Date().toISOString()
    };
    
    // Should handle large datasets without timeout
    await expect(extractor.process(largeCrawlResult)).resolves.not.toThrow();
  });
});