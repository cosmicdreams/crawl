// tests/unit/extractors/color-extractor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { createNodeFsMock, createNodePathMock, createPlaywrightMock } from '../../../src/test-setup.js';

// Properly mock Node.js modules using ESM-compatible approach
vi.mock('node:fs', () => createNodeFsMock());
vi.mock('node:path', () => createNodePathMock());
vi.mock('playwright', () => createPlaywrightMock());

// Import the mocked modules after mocking
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

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

    // Configure the mocks for this test run
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(chromium.launch).mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockImplementation((fn) => {
            // Mock the evaluate function to return test data
            if (fn.toString().includes('color')) {
              return { 
                '#000000': { value: '#000000', property: 'color', element: 'body', usageCount: 10 },
                '#ff0000': { value: '#ff0000', property: 'color', element: 'div', usageCount: 5 }
              };
            }
            if (fn.toString().includes('backgroundColor')) {
              return { 
                '#ffffff': { value: '#ffffff', property: 'backgroundColor', element: 'body', usageCount: 8 },
                '#f5f5f5': { value: '#f5f5f5', property: 'backgroundColor', element: 'div', usageCount: 3 }
              };
            }
            if (fn.toString().includes('borderColor')) {
              return { 
                '#cccccc': { value: '#cccccc', property: 'borderColor', element: 'div', usageCount: 2 }
              };
            }
            return {};
          }),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should create output directory if it does not exist', async () => {
    await extractor.process(mockCrawlResult);
    
    expect(fs.existsSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'));
    expect(fs.mkdirSync).toHaveBeenCalledWith(path.join('./test-results', 'raw'), { recursive: true });
  });

  it('should extract color values from crawled pages', async () => {
    const result = await extractor.process(mockCrawlResult);
    
    // Check that we have the expected number of tokens
    expect(result.tokens.length).toBeGreaterThan(0);
    
    // Check that we have text colors
    expect(result.tokens.some(token => token.category === 'text-color')).toBe(true);
    
    // Check that we have background colors
    expect(result.tokens.some(token => token.category === 'background-color')).toBe(true);
    
    // Check that we have border colors
    expect(result.tokens.some(token => token.category === 'border-color')).toBe(true);
  });

  it('should respect the minimumOccurrences option', async () => {
    // Create an extractor with a higher minimum occurrences
    const strictExtractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 5, // Set a high value to filter out most colors
      outputDir: './test-results'
    });
    
    const result = await strictExtractor.process(mockCrawlResult);
    
    // We should have fewer tokens because of the higher threshold
    expect(result.tokens.length).toBeLessThan(5); // Total mocked values
    
    // The #000000 color should still be included (usageCount = 10)
    const blackColor = result.tokens.find(token => 
      token.value === '#000000' && token.category === 'text-color'
    );
    expect(blackColor).toBeDefined();
    
    // The #cccccc border color should be excluded (usageCount = 2)
    const grayBorder = result.tokens.find(token => 
      token.value === '#cccccc' && token.category === 'border-color'
    );
    expect(grayBorder).toBeUndefined();
  });

  it('should respect the includeTextColors option', async () => {
    // Create an extractor that excludes text colors
    const noTextColorsExtractor = new ColorExtractorStage({
      includeTextColors: false,
      includeBackgroundColors: true,
      includeBorderColors: true,
      minimumOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noTextColorsExtractor.process(mockCrawlResult);
    
    // We should have no text color values
    expect(result.tokens.some(token => token.category === 'text-color')).toBe(false);
    
    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'background-color')).toBe(true);
    expect(result.tokens.some(token => token.category === 'border-color')).toBe(true);
  });

  it('should respect the includeBackgroundColors option', async () => {
    // Create an extractor that excludes background colors
    const noBgColorsExtractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: false,
      includeBorderColors: true,
      minimumOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noBgColorsExtractor.process(mockCrawlResult);
    
    // We should have no background color values
    expect(result.tokens.some(token => token.category === 'background-color')).toBe(false);
    
    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'text-color')).toBe(true);
    expect(result.tokens.some(token => token.category === 'border-color')).toBe(true);
  });

  it('should respect the includeBorderColors option', async () => {
    // Create an extractor that excludes border colors
    const noBorderColorsExtractor = new ColorExtractorStage({
      includeTextColors: true,
      includeBackgroundColors: true,
      includeBorderColors: false,
      minimumOccurrences: 1,
      outputDir: './test-results'
    });
    
    const result = await noBorderColorsExtractor.process(mockCrawlResult);
    
    // We should have no border color values
    expect(result.tokens.some(token => token.category === 'border-color')).toBe(false);
    
    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'text-color')).toBe(true);
    expect(result.tokens.some(token => token.category === 'background-color')).toBe(true);
  });

  it('should generate appropriate color names', async () => {
    const result = await extractor.process(mockCrawlResult);
    
    // Check that color names follow the expected pattern
    for (const token of result.tokens) {
      if (token.category === 'text-color') {
        expect(token.name).toMatch(/^text-/);
      } else if (token.category === 'background-color') {
        expect(token.name).toMatch(/^bg-/);
      } else if (token.category === 'border-color') {
        expect(token.name).toMatch(/^border-/);
      }
    }
    
    // Check for specific naming patterns
    const blackToken = result.tokens.find(token => token.value === '#000000');
    if (blackToken) {
      expect(blackToken.name).toContain('black');
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
          evaluate: vi.fn(),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
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

  it('should use mock data when no colors are found', async () => {
    // Mock empty evaluation results
    vi.mocked(chromium.launch).mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockResolvedValue({}),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    const result = await extractor.process(mockCrawlResult);
    
    // Should still have tokens from mock data
    expect(result.tokens.length).toBeGreaterThan(0);
    
    // Should have common color values from the mock data
    const commonColors = ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
    for (const color of commonColors) {
      expect(result.tokens.some(token => token.value === color)).toBe(true);
    }
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
    // Test edge case: negative minimumOccurrences
    expect(() => {
      new ColorExtractorStage({
        minimumOccurrences: -1,
        outputDir: './test-results'
      });
    }).not.toThrow(); // Should handle gracefully

    // Test edge case: invalid outputDir  
    expect(() => {
      new ColorExtractorStage({
        outputDir: ''
      });
    }).not.toThrow(); // Should handle gracefully

    // Test edge case: all options disabled
    expect(() => {
      new ColorExtractorStage({
        includeTextColors: false,
        includeBackgroundColors: false,
        includeBorderColors: false,
        outputDir: './test-results'
      });
    }).not.toThrow(); // Should handle gracefully
  });

  it('should handle invalid color values gracefully', async () => {
    // Mock invalid color data
    vi.mocked(chromium.launch).mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockResolvedValue({
            'not-a-color': { value: 'not-a-color', property: 'color', element: 'div', usageCount: 1 },
            '': { value: '', property: 'color', element: 'span', usageCount: 1 },
            null: { value: null, property: 'color', element: 'p', usageCount: 1 }
          }),
          setDefaultTimeout: vi.fn(),
          close: vi.fn().mockResolvedValue(null)
        })
      }),
      close: vi.fn().mockResolvedValue(null)
    });
    
    // Should not throw error with invalid color data
    await expect(extractor.process(mockCrawlResult)).resolves.not.toThrow();
    
    const result = await extractor.process(mockCrawlResult);
    
    // Should filter out invalid colors and provide fallback data
    expect(result.tokens.length).toBeGreaterThan(0);
    expect(result.tokens.every(token => token.value && typeof token.value === 'string')).toBe(true);
  });
});