// tests/unit/extractors/color-extractor.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Create mocks in hoisted scope to avoid initialization errors
const { fsMock, pathMock, playwrightMock } = vi.hoisted(() => {
  return {
    fsMock: {
      default: {
        existsSync: vi.fn().mockReturnValue(false),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn().mockReturnValue('{}'),
      },
      existsSync: vi.fn().mockReturnValue(false),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn().mockReturnValue('{}'),
    },
    pathMock: {
      default: {
        join: vi.fn((...args) => args.join('/')),
        dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
      },
      join: vi.fn((...args) => args.join('/')),
      dirname: vi.fn(path => path.split('/').slice(0, -1).join('/')),
    },
    playwrightMock: {
      chromium: {
        launch: vi.fn().mockResolvedValue({
          newContext: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              goto: vi.fn().mockResolvedValue(null),
              evaluate: vi.fn().mockResolvedValue({}),
              setDefaultTimeout: vi.fn(),
              close: vi.fn().mockResolvedValue(null)
            })
          }),
          close: vi.fn().mockResolvedValue(null)
        })
      }
    }
  };
});

// Properly mock Node.js modules using ESM-compatible approach
vi.mock('node:fs', () => fsMock);
vi.mock('node:path', () => pathMock);
vi.mock('playwright', () => playwrightMock);

// Import the mocked modules after mocking
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// Import the stage to test
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';

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

    // Create mock crawl result with multiple pages to simulate realistic usage counts
    mockCrawlResult = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page2',
          title: 'Page 2',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page3',
          title: 'Page 3',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page4',
          title: 'Page 4',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page5',
          title: 'Page 5',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page6',
          title: 'Page 6',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page7',
          title: 'Page 7',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page8',
          title: 'Page 8',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page9',
          title: 'Page 9',
          status: 200,
          contentType: 'text/html'
        },
        {
          url: 'https://example.com/page10',
          title: 'Page 10',
          status: 200,
          contentType: 'text/html'
        }
      ],
      timestamp: new Date().toISOString()
    };

    // Reset mock call counts
    vi.clearAllMocks();

    // Configure the mocks for this test run
    fsMock.existsSync.mockReturnValue(false);
    playwrightMock.chromium.launch.mockResolvedValue({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockImplementation((fn) => {
            // Mock the evaluate function to return test data in the correct format
            // The real methods return { "css-color-string": "element-name" }
            // With 10 pages, each color will appear 10 times (usageCount = 10)
            const fnString = fn.toString();
            if (fnString.includes('style.color') && !fnString.includes('backgroundColor') && !fnString.includes('borderColor')) {
              // Text colors
              return {
                'rgb(0, 0, 0)': 'body',
                'rgb(255, 0, 0)': 'div'
              };
            }
            if (fnString.includes('backgroundColor')) {
              return {
                'rgb(255, 255, 255)': 'body',
                'rgb(245, 245, 245)': 'div'
              };
            }
            if (fnString.includes('borderColor')) {
              return {
                'rgb(204, 204, 204)': 'div'
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
      minimumOccurrences: 5, // Set a high value to filter out most colors
      outputDir: './test-results'
    });
    
    const result = await strictExtractor.process(mockCrawlResult);

    // With minimumOccurrences = 5 and usageCount = 10 for all colors,
    // all 5 colors should pass the threshold
    expect(result.tokens.length).toBe(5);

    // The #000000 color should be included (usageCount = 10 >= minimumOccurrences = 5)
    const blackColor = result.tokens.find(token =>
      token.value.hex === '#000000' && token.category === 'text'
    );
    expect(blackColor).toBeDefined();

    // All tokens should have usage count >= minimumOccurrences
    expect(result.tokens.every(token => (token.usageCount || 0) >= 5)).toBe(true);
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
    expect(result.tokens.some(token => token.category === 'text')).toBe(false);

    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'background')).toBe(true);
    expect(result.tokens.some(token => token.category === 'border')).toBe(true);
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
    expect(result.tokens.some(token => token.category === 'background')).toBe(false);

    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'text')).toBe(true);
    expect(result.tokens.some(token => token.category === 'border')).toBe(true);
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
    expect(result.tokens.some(token => token.category === 'border')).toBe(false);

    // But we should still have other color types
    expect(result.tokens.some(token => token.category === 'text')).toBe(true);
    expect(result.tokens.some(token => token.category === 'background')).toBe(true);
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
    playwrightMock.chromium.launch.mockResolvedValueOnce({
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

    // The extractor should not throw an error and should return empty results
    const result = await extractor.process(mockCrawlResult);
    expect(result.tokens.length).toBe(0);
    expect(result.stats.totalColors).toBe(0);
  });

  it('should handle when no colors are found', async () => {
    // Mock empty evaluation results
    playwrightMock.chromium.launch.mockResolvedValueOnce({
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

    // When no colors are found, we should get empty results (no fake data)
    expect(result.tokens.length).toBe(0);
    expect(result.stats.totalColors).toBe(0);
    expect(result.stats.uniqueColors).toBe(0);
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
    expect(result.stats.totalColors).toBe(0);
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
    // Mock invalid color data in the correct format
    playwrightMock.chromium.launch.mockResolvedValueOnce({
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue({
          goto: vi.fn().mockResolvedValue(null),
          evaluate: vi.fn().mockImplementation((fn) => {
            const fnString = fn.toString();
            // Return invalid color values that will be filtered out
            if (fnString.includes('style.color')) {
              return {
                'not-a-color': 'div',
                '': 'span',
                'invalid-rgb(999,999,999)': 'p'
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

    // Should not throw error with invalid color data and should filter out invalid colors
    const result = await extractor.process(mockCrawlResult);

    // Invalid colors are filtered out, so we get empty results (no fake data)
    expect(result.tokens.length).toBe(0);
    expect(result.stats.totalColors).toBe(0);
  });
});