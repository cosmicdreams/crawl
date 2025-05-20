// tests/unit/extractors/color-extractor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
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
              if (fn.toString().includes('color')) {
                return { '#000000': 'body', '#ff0000': 'div' };
              }
              if (fn.toString().includes('backgroundColor')) {
                return { '#ffffff': 'body', '#f5f5f5': 'div' };
              }
              if (fn.toString().includes('borderColor')) {
                return { '#cccccc': 'div' };
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

describe('ColorExtractorStage', () => {
  let extractor: ColorExtractorStage;
  let mockCrawlResult: CrawlResult;

  beforeEach(() => {
    // Create a new extractor with default options
    extractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
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

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create output directory if it does not exist', async () => {
    await extractor.process(mockCrawlResult);
    
    expect(fs.existsSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'), { recursive: true });
  });

  it('should extract colors from crawled pages', async () => {
    const result = await extractor.process(mockCrawlResult);
    
    // Check that we have the expected number of tokens
    expect(result.tokens.length).toBeGreaterThan(0);
    
    // Check that we have text colors
    expect(result.tokens.some(token => token.category === 'text')).toBe(true);
    
    // Check that we have background colors
    expect(result.tokens.some(token => token.category === 'background')).toBe(true);
    
    // Check that we have border colors
    expect(result.tokens.some(token => token.category === 'border')).toBe(true);
  });

  it('should respect the minimumOccurrences option', async () => {
    // Create an extractor with a higher minimum occurrences
    const strictExtractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 10, // Set a high value to filter out all colors
      outputDir: './test-results'
    });
    
    const result = await strictExtractor.process(mockCrawlResult);
    
    // We should have no tokens because none meet the minimum occurrences
    expect(result.tokens.length).toBe(0);
  });

  it('should respect the includeTextColors option', async () => {
    // Create an extractor that excludes text colors
    const noTextExtractor = new ColorExtractorStage({
      includeTextColors: false,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noTextExtractor.process(mockCrawlResult);
    
    // We should have no text colors
    expect(result.tokens.some(token => token.category === 'text')).toBe(false);
    
    // But we should still have other colors
    expect(result.tokens.length).toBeGreaterThan(0);
  });

  it('should normalize colors to hex format when possible', async () => {
    // Mock the evaluate function to return RGB colors
    vi.mocked(chromium.launch).mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockImplementation((fn) => {
            if (fn.toString().includes('color')) {
              return { 'rgb(255, 0, 0)': 'div', 'rgba(0, 0, 255, 1)': 'span' };
            }
            return {};
          })
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    const result = await extractor.process(mockCrawlResult);
    
    // Check that RGB colors were normalized to hex
    const redToken = result.tokens.find(token => token.value === '#ff0000');
    const blueToken = result.tokens.find(token => token.value === '#0000ff');
    
    expect(redToken).toBeDefined();
    expect(blueToken).toBeDefined();
  });

  it('should generate appropriate color names', async () => {
    const result = await extractor.process(mockCrawlResult);
    
    // Check that color names follow the expected pattern
    for (const token of result.tokens) {
      if (token.category && token.value.startsWith('#')) {
        expect(token.name).toMatch(new RegExp(`^${token.category}-[0-9a-f]+$`));
      }
    }
  });

  it('should save results to the specified output file', async () => {
    await extractor.process(mockCrawlResult);
    
    // Check that the results were saved
    expect(fs.writeFileSync).toHaveBeenCalledWith(
      path.join('./test-results', 'raw', 'color-analysis.json'),
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
    
    // But we should have no tokens
    const result = await extractor.process(mockCrawlResult);
    expect(result.tokens.length).toBe(0);
  });
});
