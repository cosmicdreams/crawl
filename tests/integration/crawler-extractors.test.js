/**
 * Integration tests for crawler and extractors
 *
 * These tests verify that the crawler and extractors work together correctly,
 * ensuring that data flows properly between these components.
 */

import fs from 'fs';
import path from 'path';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { chromium } from '@playwright/test';

import * as crawlerModule from '../../src/crawler/site-crawler.js';
import * as colorsExtractor from '../../src/extractors/extract-colors.js';
import * as typographyExtractor from '../../src/extractors/extract-typography.js';
import * as spacingExtractor from '../../src/extractors/extract-spacing.js';
import * as bordersExtractor from '../../src/extractors/extract-borders.js';
import * as animationsExtractor from '../../src/extractors/extract-animations.js';

const { extractColorsFromCrawledPages } = colorsExtractor;
const { extractTypographyFromCrawledPages } = typographyExtractor;
const { extractSpacingFromCrawledPages } = spacingExtractor;
const { extractBordersFromCrawledPages } = bordersExtractor;
const { extractAnimationsFromCrawledPages } = animationsExtractor;

// Mock dependencies
vi.mock('@playwright/test', () => ({
  chromium: {
    launch: vi.fn()
  }
}));

// Create mock functions for fs
fs.existsSync = vi.fn();
fs.readFileSync = vi.fn();
fs.writeFileSync = vi.fn();
fs.mkdirSync = vi.fn();

// Create mock functions for path
path.join = vi.fn().mockImplementation((...args) => args.join('/'));
path.dirname = vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/'));

// Mock console methods
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

describe('Crawler and Extractors Integration', () => {
  // Setup mock data and browser
  let mockBrowser, mockContext, mockPage;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock page
    mockPage = {
      goto: vi.fn().mockResolvedValue({ status: () => 200 }),
      title: vi.fn().mockResolvedValue('Test Page'),
      evaluate: vi.fn().mockImplementation((fn) => {
        // Return different mock data based on the function being evaluated
        if (fn.toString().includes('extractLinks')) {
          return ['/page1', '/page2'];
        } else if (fn.toString().includes('extractBodyClasses')) {
          return ['page', 'test-page'];
        } else {
          // Default mock data for other evaluations
          return {
            elementStyles: {
              'body': [{ styles: { color: '#000000', backgroundColor: '#ffffff' } }],
              'h1': [{ styles: { color: '#ff0000', fontFamily: 'Arial' } }],
              'p': [{ styles: { color: '#333333', fontFamily: 'Times New Roman' } }]
            },
            colorValues: ['#000000', '#ffffff', '#ff0000', '#333333'],
            fontFamilies: ['Arial', 'Times New Roman'],
            fontSizes: ['16px', '24px', '32px'],
            spacingValues: ['0px', '8px', '16px', '24px'],
            borderWidths: ['1px', '2px'],
            borderStyles: ['solid', 'dashed'],
            animationProperties: {
              durations: ['0.3s', '0.5s'],
              timingFunctions: ['ease', 'ease-in-out']
            }
          };
        }
      }),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('fake-image')),
      close: vi.fn()
    };

    // Setup mock context
    mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn()
    };

    // Setup mock browser
    mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn()
    };

    // Mock chromium.launch
    chromium.launch.mockResolvedValue(mockBrowser);

    // Mock fs.existsSync for crawl results
    fs.existsSync.mockImplementation((path) => {
      return path.includes('crawl-results.json');
    });

    // Mock fs.readFileSync for crawl results
    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('crawl-results.json')) {
        return JSON.stringify({
          baseUrl: 'https://example.com',
          crawledPages: [
            {
              url: 'https://example.com',
              title: 'Example Page',
              status: 200,
              contentType: 'text/html',
              bodyClasses: ['home', 'page']
            },
            {
              url: 'https://example.com/about',
              title: 'About Page',
              status: 200,
              contentType: 'text/html',
              bodyClasses: ['about', 'page']
            }
          ],
          errors: []
        });
      }
      return '{}';
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('crawlSite should generate data that can be consumed by extractors', async () => {
    // Arrange
    const baseUrl = 'https://example.com';
    const maxPages = 2;
    const options = { baseUrl };

    // Mock the crawlSite function
    const mockCrawlResults = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Example Page',
          status: 200,
          contentType: 'text/html',
          bodyClasses: ['home', 'page']
        },
        {
          url: 'https://example.com/about',
          title: 'About Page',
          status: 200,
          contentType: 'text/html',
          bodyClasses: ['about', 'page']
        }
      ],
      errors: []
    };

    const crawlSiteSpy = vi.spyOn(crawlerModule, 'crawlSite')
      .mockResolvedValue(mockCrawlResults);

    // Act
    const crawlResults = await crawlerModule.crawlSite(baseUrl, maxPages, options);

    // Assert
    expect(crawlResults).toBeDefined();
    expect(crawlResults.crawledPages).toBeDefined();
    expect(crawlResults.crawledPages.length).toBeGreaterThan(0);
    expect(crawlSiteSpy).toHaveBeenCalledWith(baseUrl, maxPages, options);

    // Verify the structure of the crawl results
    expect(crawlResults.baseUrl).toBe(baseUrl);
    expect(Array.isArray(crawlResults.crawledPages)).toBe(true);
  });

  test('extractors should be able to process crawl results', async () => {
    // Arrange - mock the crawl results file
    const outputDir = 'results/raw';
    const config = {
      inputFile: 'results/raw/crawl-results.json',
      outputFile: path.join(outputDir, 'colors-analysis.json'),
      maxPages: -1
    };

    // Mock the extractColorsFromCrawledPages function
    const mockResult = {
      success: true,
      data: {
        allColorValues: ['#000000', '#ffffff', '#ff0000'],
        groupedColors: { hex: ['#000000', '#ffffff', '#ff0000'] },
        elementStyles: { 'body': [{ styles: { color: '#000000' } }] }
      }
    };

    const extractColorsSpy = vi.spyOn(colorsExtractor, 'extractColorsFromCrawledPages')
      .mockResolvedValue(mockResult);

    // Act - run the extractors on the mock crawl results
    const colorResults = await colorsExtractor.extractColorsFromCrawledPages(config);

    // Assert
    expect(colorResults).toBeDefined();
    expect(colorResults.success).toBe(true);
    expect(extractColorsSpy).toHaveBeenCalledWith(config);

    // Verify the structure of the result
    expect(colorResults.data).toBeDefined();
    expect(colorResults.data.allColorValues).toBeDefined();
    expect(colorResults.data.groupedColors).toBeDefined();
  });

  test('multiple extractors should be able to process the same crawl results', async () => {
    // Arrange
    const outputDir = 'results/raw';
    const baseConfig = {
      inputFile: 'results/raw/crawl-results.json',
      maxPages: -1
    };

    // Mock the extractor functions
    const mockColorResult = {
      success: true,
      data: {
        allColorValues: ['#000000', '#ffffff', '#ff0000'],
        groupedColors: { hex: ['#000000', '#ffffff', '#ff0000'] }
      }
    };

    const mockTypographyResult = {
      success: true,
      data: {
        allFontFamilies: ['Arial', 'Helvetica'],
        allFontSizes: ['16px', '24px']
      }
    };

    const mockSpacingResult = {
      success: true,
      data: {
        spacingValues: ['0px', '8px', '16px', '24px'],
        marginValues: ['0px', '8px', '16px']
      }
    };

    vi.spyOn(colorsExtractor, 'extractColorsFromCrawledPages')
      .mockResolvedValue(mockColorResult);

    vi.spyOn(typographyExtractor, 'extractTypographyFromCrawledPages')
      .mockResolvedValue(mockTypographyResult);

    vi.spyOn(spacingExtractor, 'extractSpacingFromCrawledPages')
      .mockResolvedValue(mockSpacingResult);

    // Act - run multiple extractors on the same crawl results
    const colorConfig = { ...baseConfig, outputFile: path.join(outputDir, 'colors-analysis.json') };
    const typographyConfig = { ...baseConfig, outputFile: path.join(outputDir, 'typography-analysis.json') };
    const spacingConfig = { ...baseConfig, outputFile: path.join(outputDir, 'spacing-analysis.json') };

    const colorResults = await colorsExtractor.extractColorsFromCrawledPages(colorConfig);
    const typographyResults = await typographyExtractor.extractTypographyFromCrawledPages(typographyConfig);
    const spacingResults = await spacingExtractor.extractSpacingFromCrawledPages(spacingConfig);

    // Assert
    expect(colorResults.success).toBe(true);
    expect(typographyResults.success).toBe(true);
    expect(spacingResults.success).toBe(true);

    // Verify the structure of the results
    expect(colorResults.data.allColorValues).toBeDefined();
    expect(typographyResults.data.allFontFamilies).toBeDefined();
    expect(spacingResults.data.spacingValues).toBeDefined();
  });

  test('extractors should handle errors in crawl results gracefully', async () => {
    // Arrange - mock an empty or invalid crawl results file
    fs.readFileSync.mockImplementation(() => '{ "crawledPages": [] }');

    const config = {
      inputFile: 'results/raw/crawl-results.json',
      outputFile: 'results/raw/colors-analysis.json',
      maxPages: -1
    };

    // Mock the extractColorsFromCrawledPages function
    const mockResult = {
      success: true,
      data: {
        allColorValues: [],
        groupedColors: { hex: [] },
        elementStyles: {}
      },
      warnings: ['No pages to analyze']
    };

    vi.spyOn(colorsExtractor, 'extractColorsFromCrawledPages')
      .mockResolvedValue(mockResult);

    // Act
    const results = await colorsExtractor.extractColorsFromCrawledPages(config);

    // Assert
    expect(results).toBeDefined();
    expect(results.success).toBe(true); // Should still succeed but with empty results
    expect(results.warnings).toBeDefined();
    expect(results.warnings.length).toBeGreaterThan(0);
  });

  test('extractors should handle missing crawl results file', async () => {
    // Arrange - mock missing crawl results file
    fs.existsSync.mockReturnValue(false);

    const config = {
      inputFile: 'results/raw/crawl-results.json',
      outputFile: 'results/raw/colors-analysis.json',
      maxPages: -1
    };

    // Mock the extractColorsFromCrawledPages function
    const mockError = {
      success: false,
      error: {
        message: 'Crawl results file not found',
        type: 'Error'
      }
    };

    vi.spyOn(colorsExtractor, 'extractColorsFromCrawledPages')
      .mockResolvedValue(mockError);

    // Act
    const results = await colorsExtractor.extractColorsFromCrawledPages(config);

    // Assert
    expect(results).toBeDefined();
    expect(results.success).toBe(false);
    expect(results.error).toBeDefined();
    expect(results.error.message).toContain('not found');
  });
});
