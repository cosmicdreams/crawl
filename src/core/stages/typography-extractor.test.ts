// src/core/stages/typography-extractor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TypographyExtractor } from './typography-extractor.js';
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

describe('TypographyExtractor', () => {
  let typographyExtractor: TypographyExtractor;
  let config: CrawlConfig;
  let crawlResults: any;

  beforeEach(() => {
    typographyExtractor = new TypographyExtractor();
    config = {
      baseUrl: 'https://example.com',
      maxPages: 2,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results',
      extractors: {
        typography: {
          includeHeadings: true,
          includeBodyText: true
        }
      }
    };

    crawlResults = {
      baseUrl: 'https://example.com',
      crawledPages: [
        {
          url: 'https://example.com',
          title: 'Home Page',
          typography: {
            headings: [
              {
                selector: 'h1',
                fontFamily: 'Inter',
                fontSize: '2.5rem',
                fontWeight: '700',
                lineHeight: '1.2',
                text: 'Welcome to Example'
              },
              {
                selector: 'h2',
                fontFamily: 'Inter',
                fontSize: '2rem',
                fontWeight: '700',
                lineHeight: '1.2',
                text: 'Features'
              }
            ],
            bodyText: [
              {
                selector: 'p',
                fontFamily: 'Inter',
                fontSize: '1rem',
                fontWeight: '400',
                lineHeight: '1.5',
                text: 'This is a paragraph'
              },
              {
                selector: '.small-text',
                fontFamily: 'Inter',
                fontSize: '0.875rem',
                fontWeight: '400',
                lineHeight: '1.5',
                text: 'This is small text'
              }
            ]
          }
        },
        {
          url: 'https://example.com/about',
          title: 'About Page',
          typography: {
            headings: [
              {
                selector: 'h1',
                fontFamily: 'Inter',
                fontSize: '2.5rem',
                fontWeight: '700',
                lineHeight: '1.2',
                text: 'About Us'
              },
              {
                selector: 'h3',
                fontFamily: 'Inter',
                fontSize: '1.75rem',
                fontWeight: '600',
                lineHeight: '1.3',
                text: 'Our Mission'
              }
            ],
            bodyText: [
              {
                selector: 'p',
                fontFamily: 'Inter',
                fontSize: '1rem',
                fontWeight: '400',
                lineHeight: '1.5',
                text: 'About page content'
              }
            ]
          }
        }
      ],
      timestamp: new Date().toISOString()
    };

    vi.clearAllMocks();
  });

  it('should create output directories if they don\'t exist', async () => {
    await typographyExtractor.process(crawlResults, config);

    expect(fs.existsSync).toHaveBeenCalledWith('./test-results/raw');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results/raw', { recursive: true });
  });

  it('should save typography analysis to a file', async () => {
    await typographyExtractor.process(crawlResults, config);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith('./test-results/raw', 'typography-analysis.json');
  });

  it('should extract and deduplicate typography styles', async () => {
    const result = await typographyExtractor.process(crawlResults, config);

    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBeGreaterThan(0);

    // Check for unique typography styles (no duplicates with same properties)
    const styleSignatures = result.map(token => `${token.value}`);
    const uniqueStyleSignatures = [...new Set(styleSignatures)];
    expect(styleSignatures.length).toBe(uniqueStyleSignatures.length);

    // Check that heading styles are included
    const headingStyle = result.find(token =>
      token.value.includes('font-size: 2.5rem') &&
      token.value.includes('font-weight: 700')
    );
    expect(headingStyle).toBeDefined();
    expect(headingStyle?.category).toBe('heading');

    // Check that body text styles are included
    const bodyStyle = result.find(token =>
      token.value.includes('font-size: 1rem') &&
      token.value.includes('font-weight: 400')
    );
    expect(bodyStyle).toBeDefined();
    expect(bodyStyle?.category).toBe('body');
  });

  it('should respect extractor configuration options', async () => {
    // Configure to only include headings
    if (!config.extractors) config.extractors = {};
    config.extractors.typography = {
      includeHeadings: true,
      includeBodyText: false
    };

    const result = await typographyExtractor.process(crawlResults, config);

    // Should only include heading styles
    const hasHeadingStyles = result.some(token => token.category === 'heading');
    const hasBodyStyles = result.some(token => token.category === 'body');

    expect(hasHeadingStyles).toBe(true);
    expect(hasBodyStyles).toBe(false);
  });

  it('should include usage count in the tokens', async () => {
    const result = await typographyExtractor.process(crawlResults, config);

    // Check that tokens have usage count
    result.forEach(token => {
      expect(token).toHaveProperty('usageCount');
      expect(typeof token.usageCount).toBe('number');
    });

    // Check that styles used on multiple pages have higher usage count
    const h1Style = result.find(token =>
      token.value.includes('font-size: 2.5rem') &&
      token.value.includes('font-weight: 700')
    );
    expect(h1Style?.usageCount).toBe(2); // Used on both pages

    // Find a style used on only one page
    const h3Style = result.find(token =>
      token.value.includes('font-size: 1.75rem') &&
      token.value.includes('font-weight: 600')
    );

    if (h3Style) {
      expect(h3Style.usageCount).toBe(1);
    }
  });
});
