// src/core/stages/color-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ColorExtractor } from './color-extractor.js';
import { CrawlConfig } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs
vi.mock('node:fs', () => {
  return {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
  };
});

// Mock path
vi.mock('node:path', () => {
  return {
    join: vi.fn((...args) => args.join('/')),
    relative: vi.fn((from, to) => to)
  };
});

describe('ColorExtractor', () => {
  let colorExtractor: ColorExtractor;
  let config: CrawlConfig;
  let crawlResults: any;

  beforeEach(() => {
    colorExtractor = new ColorExtractor();
    config = {
      baseUrl: 'https://example.com',
      maxPages: 2,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results',
      extractors: {
        colors: {
          includeTextColors: true,
          includeBackgroundColors: true,
          includeBorderColors: true
        }
      }
    };

    crawlResults = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Home Page',
          colors: {
            text: ['#000000', '#333333', '#666666'],
            background: ['#ffffff', '#f8f9fa', '#e9ecef'],
            border: ['#dee2e6', '#ced4da']
          }
        },
        {
          url: 'https://example.com/about',
          title: 'About Page',
          colors: {
            text: ['#000000', '#333333'],
            background: ['#ffffff', '#f8f9fa'],
            border: ['#dee2e6']
          }
        }
      ],
      timestamp: new Date().toISOString()
    };

    vi.clearAllMocks();
  });

  it('should create output directories if they don\'t exist', async () => {
    await colorExtractor.process(crawlResults, config);

    expect(fs.existsSync).toHaveBeenCalledWith('./test-results/raw');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results/raw', { recursive: true });
  });

  it('should save color analysis to a file', async () => {
    await colorExtractor.process(crawlResults, config);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith('./test-results/raw', 'color-analysis.json');
  });

  it('should extract and deduplicate colors', async () => {
    const result = await colorExtractor.process(crawlResults, config);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);

    // Check for unique colors (no duplicates)
    const colorValues = result.map(token => token.value);
    const uniqueColorValues = [...new Set(colorValues)];
    expect(colorValues.length).toBe(uniqueColorValues.length);

    // Check that all extracted colors are included
    expect(colorValues).toContain('#000000');
    expect(colorValues).toContain('#333333');
    expect(colorValues).toContain('#ffffff');
    expect(colorValues).toContain('#dee2e6');
  });

  it('should respect extractor configuration options', async () => {
    // Configure to only include text colors
    if (!config.extractors) config.extractors = {};
    config.extractors.colors = {
      includeTextColors: true,
      includeBackgroundColors: false,
      includeBorderColors: false
    };

    const result = await colorExtractor.process(crawlResults, config);

    // Should only include text colors
    const colorValues = result.map(token => token.value);
    expect(colorValues).toContain('#000000');
    expect(colorValues).toContain('#333333');
    expect(colorValues).not.toContain('#f8f9fa'); // Background color
    expect(colorValues).not.toContain('#dee2e6'); // Border color
  });

  it('should include usage count in the tokens', async () => {
    const result = await colorExtractor.process(crawlResults, config);

    // Check that tokens have usage count
    result.forEach(token => {
      expect(token).toHaveProperty('usageCount');
      expect(typeof token.usageCount).toBe('number');
    });

    // Check that colors used on multiple pages have higher usage count
    const blackToken = result.find(token => token.value === '#000000');
    expect(blackToken?.usageCount).toBe(2); // Used on both pages

    // Find a color used on only one page
    const uniqueColorToken = result.find(token =>
      token.value !== '#000000' &&
      token.value !== '#333333' &&
      token.value !== '#ffffff' &&
      token.value !== '#f8f9fa' &&
      token.value !== '#dee2e6'
    );

    if (uniqueColorToken) {
      expect(uniqueColorToken.usageCount).toBe(1);
    }
  });
});
