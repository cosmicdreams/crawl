// tests/unit/extractors/spacing-extractor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SpacingExtractorStage } from '../../../src/core/stages/spacing-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import fs from 'node:fs';
import path from 'node:path';

// Mock the Playwright browser
vi.mock('playwright', () => {
  return {
    chromium: {
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
            })
          })
        }),
        close: vi.fn().mockResolvedValue(null)
      })
    }
  };
});

// Mock the file system
vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  };
});

describe('SpacingExtractorStage', () => {
  let extractor: SpacingExtractorStage;
  let mockCrawlResult: CrawlResult;

  beforeEach(() => {
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
    
    expect(fs.existsSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'), { recursive: true });
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

  it('should respect the includeMargins option', async () => {
    // Create an extractor that excludes margins
    const noMarginsExtractor = new SpacingExtractorStage({
      includeMargins: false,
      includePadding: true,
      includeGap: true,
      minOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noMarginsExtractor.process(mockCrawlResult);
    
    // We should have no margin values
    expect(result.tokens.some(token => token.category === 'margin')).toBe(false);
    
    // But we should still have other values
    expect(result.tokens.some(token => token.category === 'padding')).toBe(true);
    expect(result.tokens.some(token => token.category === 'gap')).toBe(true);
  });

  it('should respect the includePadding option', async () => {
    // Create an extractor that excludes padding
    const noPaddingExtractor = new SpacingExtractorStage({
      includeMargins: true,
      includePadding: false,
      includeGap: true,
      minOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noPaddingExtractor.process(mockCrawlResult);
    
    // We should have no padding values
    expect(result.tokens.some(token => token.category === 'padding')).toBe(false);
    
    // But we should still have other values
    expect(result.tokens.some(token => token.category === 'margin')).toBe(true);
    expect(result.tokens.some(token => token.category === 'gap')).toBe(true);
  });

  it('should respect the includeGap option', async () => {
    // Create an extractor that excludes gap
    const noGapExtractor = new SpacingExtractorStage({
      includeMargins: true,
      includePadding: true,
      includeGap: false,
      minOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noGapExtractor.process(mockCrawlResult);
    
    // We should have no gap values
    expect(result.tokens.some(token => token.category === 'gap')).toBe(false);
    
    // But we should still have other values
    expect(result.tokens.some(token => token.category === 'margin')).toBe(true);
    expect(result.tokens.some(token => token.category === 'padding')).toBe(true);
  });

  it('should generate appropriate spacing names', async () => {
    const result = await extractor.process(mockCrawlResult);
    
    // Check that spacing names follow the expected pattern
    for (const token of result.tokens) {
      if (token.category === 'margin') {
        expect(token.name).toMatch(/^margin-/);
      } else if (token.category === 'padding') {
        expect(token.name).toMatch(/^padding-/);
      } else if (token.category === 'gap') {
        expect(token.name).toMatch(/^gap-/);
      }
    }
    
    // Check for specific naming patterns
    const px16Token = result.tokens.find(token => token.value === '16px');
    if (px16Token) {
      // 16px is 1rem, which should map to spacing-4 in the common scale
      expect(px16Token.name).toContain('4');
    }
  });

  it('should save results to the specified output file', async () => {
    await extractor.process(mockCrawlResult);
    
    // Check that the results were saved
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join('./test-results', 'raw', 'spacing-analysis.json'),
      expect.any(String)
    );
  });

  it('should handle errors during page processing', async () => {
    // Mock a page that throws an error
    vi.mocked(chromium.launch).mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockRejectedValue(new Error('Failed to load page')),
          evaluate: vi.fn()
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    // The extractor should not throw an error
    await expect(extractor.process(mockCrawlResult)).resolves.not.toThrow();
    
    // But we should have mock data since no real data was extracted
    const result = await extractor.process(mockCrawlResult);
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it('should use mock data when no spacing is found', async () => {
    // Mock empty evaluation results
    vi.mocked(chromium.launch).mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockResolvedValue({})
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    const result = await extractor.process(mockCrawlResult);
    
    // Should still have tokens from mock data
    expect(result.tokens.length).toBeGreaterThan(0);
    
    // Should have common spacing values from the mock data
    const commonSpacings = ['0.25rem', '0.5rem', '1rem', '2rem'];
    for (const spacing of commonSpacings) {
      expect(result.tokens.some(token => token.value === spacing)).toBe(true);
    }
  });
});
