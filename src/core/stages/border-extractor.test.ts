// src/core/stages/border-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BorderExtractor } from './border-extractor.js';
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

describe('BorderExtractor', () => {
  let borderExtractor: BorderExtractor;
  let config: CrawlConfig;
  let crawlResults: any;

  beforeEach(() => {
    borderExtractor = new BorderExtractor();
    config = {
      baseUrl: 'https://example.com',
      maxPages: 2,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results',
      extractors: {
        borders: {
          includeBorderWidth: true,
          includeBorderStyle: true,
          includeBorderRadius: true,
          includeShadows: true,
          minOccurrences: 1
        }
      }
    };

    crawlResults = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Home Page',
          borders: {
            width: [
              { value: '0', count: 20 },
              { value: '1px', count: 35 },
              { value: '2px', count: 8 }
            ],
            style: [
              { value: 'none', count: 20 },
              { value: 'solid', count: 40 },
              { value: 'dashed', count: 5 }
            ],
            radius: [
              { value: '0', count: 25 },
              { value: '0.25rem', count: 15 },
              { value: '0.5rem', count: 10 },
              { value: '50%', count: 5 }
            ],
            shadow: [
              { value: 'none', count: 30 },
              { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', count: 12 },
              { value: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', count: 8 }
            ]
          }
        },
        {
          url: 'https://example.com/about',
          title: 'About Page',
          borders: {
            width: [
              { value: '0', count: 15 },
              { value: '1px', count: 25 }
            ],
            style: [
              { value: 'none', count: 15 },
              { value: 'solid', count: 25 }
            ],
            radius: [
              { value: '0', count: 18 },
              { value: '0.25rem', count: 12 },
              { value: '0.5rem', count: 8 }
            ],
            shadow: [
              { value: 'none', count: 20 },
              { value: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', count: 10 }
            ]
          }
        }
      ],
      timestamp: new Date().toISOString()
    };

    vi.clearAllMocks();
  });

  it('should create output directories if they don\'t exist', async () => {
    await borderExtractor.process(crawlResults, config);

    expect(fs.existsSync).toHaveBeenCalledWith('./test-results/raw');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results/raw', { recursive: true });
  });

  it('should save border analysis to a file', async () => {
    await borderExtractor.process(crawlResults, config);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith('./test-results/raw', 'border-analysis.json');
  });

  it('should extract and deduplicate border values', async () => {
    const result = await borderExtractor.process(crawlResults, config);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);

    // Check for unique border values (no duplicates)
    const borderValues = result.map(token => `${token.category}-${token.value}`);
    const uniqueBorderValues = [...new Set(borderValues)];
    expect(borderValues.length).toBe(uniqueBorderValues.length);

    // Check that all border types are included
    const hasWidth = result.some(token => token.category === 'width');
    const hasStyle = result.some(token => token.category === 'style');
    const hasRadius = result.some(token => token.category === 'radius');
    const hasShadow = result.some(token => token.category === 'shadow');

    expect(hasWidth).toBe(true);
    expect(hasStyle).toBe(true);
    expect(hasRadius).toBe(true);
    expect(hasShadow).toBe(true);

    // Check that common border values are included
    const widthValues = result.filter(token => token.category === 'width').map(token => token.value);
    expect(widthValues).toContain('0');
    expect(widthValues).toContain('1px');

    const styleValues = result.filter(token => token.category === 'style').map(token => token.value);
    expect(styleValues).toContain('none');
    expect(styleValues).toContain('solid');

    const radiusValues = result.filter(token => token.category === 'radius').map(token => token.value);
    expect(radiusValues).toContain('0');
    expect(radiusValues).toContain('0.25rem');
  });

  it('should respect extractor configuration options', async () => {
    // Configure to only include width and radius
    if (!config.extractors) config.extractors = {};
    config.extractors.borders = {
      includeBorderWidth: true,
      includeBorderStyle: false,
      includeBorderRadius: true,
      includeShadows: false,
      minOccurrences: 1
    };

    const result = await borderExtractor.process(crawlResults, config);

    // Should include width and radius but not style and shadow
    const hasWidth = result.some(token => token.category === 'width');
    const hasStyle = result.some(token => token.category === 'style');
    const hasRadius = result.some(token => token.category === 'radius');
    const hasShadow = result.some(token => token.category === 'shadow');

    expect(hasWidth).toBe(true);
    expect(hasStyle).toBe(false);
    expect(hasRadius).toBe(true);
    expect(hasShadow).toBe(false);
  });

  it('should include usage count in the tokens', async () => {
    const result = await borderExtractor.process(crawlResults, config);

    // Check that tokens have usage count
    result.forEach(token => {
      expect(token).toHaveProperty('usageCount');
      expect(typeof token.usageCount).toBe('number');
    });

    // Check that border values used on multiple pages have higher usage count
    const onePxWidthToken = result.find(token =>
      token.value === '1px' &&
      token.category === 'width'
    );

    if (onePxWidthToken) {
      // 35 + 25 = 60 (from both pages)
      expect(onePxWidthToken.usageCount).toBe(60);
    }

    // Find a border value used on only one page
    const dashedStyleToken = result.find(token =>
      token.value === 'dashed' &&
      token.category === 'style'
    );

    if (dashedStyleToken) {
      expect(dashedStyleToken.usageCount).toBe(5);
    }
  });
});
