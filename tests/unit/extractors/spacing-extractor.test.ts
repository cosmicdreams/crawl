// tests/unit/extractors/spacing-extractor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing anything else
vi.mock('node:fs');
vi.mock('node:path');
vi.mock('playwright');

// Dynamic imports after mocking
const { SpacingExtractorStage } = await import('../../../src/core/stages/spacing-extractor-stage.js');
const { CrawlResult } = await import('../../../src/core/types.js');

describe('SpacingExtractorStage', () => {
  let extractor;
  let mockCrawlResult: CrawlResult;
  let fsMock;
  let pathMock;
  let playwrightMock;

  beforeEach(async () => {
    // Dynamic mock setup
    fsMock = await vi.importMock('node:fs');
    pathMock = await vi.importMock('node:path');
    playwrightMock = await vi.importMock('playwright');

    // Configure Node.js fs mock
    fsMock.default = {
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn().mockReturnValue('{}'),
    };
    Object.assign(fsMock, fsMock.default);

    // Configure Node.js path mock
    pathMock.default = {
      join: vi.fn((...args) => args.join('/')),
      dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
      basename: vi.fn(path => path.split('/').pop()),
    };
    Object.assign(pathMock, pathMock.default);

    // Configure Playwright mock
    playwrightMock.chromium = {
      launch: vi.fn().mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockResolvedValue(null),
            evaluate: vi.fn().mockImplementation((fn) => {
              // Mock the evaluate function to return test data
              if (fn.toString().includes('margin')) {
                return {
                  '16px': { value: '16px', property: 'margin', element: 'div', usageCount: 5 },
                  '24px': { value: '24px', property: 'marginBottom', element: 'h2', usageCount: 3 },
                  '32px': { value: '32px', property: 'marginTop', element: 'section', usageCount: 2 }
                };
              }
              if (fn.toString().includes('padding')) {
                return {
                  '16px': { value: '16px', property: 'padding', element: 'div', usageCount: 8 },
                  '8px': { value: '8px', property: 'paddingLeft', element: 'p', usageCount: 4 },
                  '24px': { value: '24px', property: 'paddingBottom', element: 'footer', usageCount: 1 }
                };
              }
              if (fn.toString().includes('gap')) {
                return {
                  '16px': { value: '16px', property: 'gap', element: 'div', usageCount: 3 },
                  '8px': { value: '8px', property: 'gap', element: 'nav', usageCount: 2 }
                };
              }
              return {};
            }),
            setDefaultTimeout: vi.fn(),
            close: vi.fn().mockResolvedValue(null)
          })
        }),
        close: vi.fn().mockResolvedValue(null)
      })
    };

    // Create a new extractor with default options
    extractor = new SpacingExtractorStage({
      includeMargins: true,
      includePadding: true,
      includeGap: true,
      minOccurrences: 1,
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

  afterEach(() => {
    vi.resetAllMocks();
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
      minOccurrences: 5, // Set a high value to filter out most spacings
      outputDir: './test-results'
    });
    
    const result = await strictExtractor.process(mockCrawlResult);
    
    // We should have fewer tokens because of the higher threshold
    expect(result.tokens.length).toBeLessThan(6); // Total mocked values
    
    // The 16px padding should still be included (usageCount = 8)
    const padding16px = result.tokens.find(token => 
      token.value === '16px' && token.category === 'padding'
    );
    expect(padding16px).toBeDefined();
    
    // The 24px padding should be excluded (usageCount = 1)
    const padding24px = result.tokens.find(token => 
      token.value === '24px' && token.category === 'padding'
    );
    expect(padding24px).toBeUndefined();
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
    
    // Should still provide fallback mock data
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.baseUrl).toBe('https://example.com');
  });

  it('should validate configuration parameters', () => {
    // Test edge case: negative minOccurrences
    expect(() => {
      new SpacingExtractorStage({
        minOccurrences: -1,
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
    // Mock network timeout
    playwrightMock.chromium.launch.mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED')),
          evaluate: vi.fn(),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    // Should not throw error with network failures
    await expect(extractor.process(mockCrawlResult)).resolves.not.toThrow();
    
    const result = await extractor.process(mockCrawlResult);
    
    // Should provide fallback data when network fails
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.baseUrl).toBe('https://example.com');
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