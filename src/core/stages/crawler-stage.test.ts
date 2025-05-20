// src/core/stages/crawler-stage.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CrawlerStage } from './crawler-stage.js';
import { CrawlConfig } from '../types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock Playwright
vi.mock('playwright', () => {
  const mockPage = {
    setDefaultTimeout: vi.fn(),
    goto: vi.fn().mockResolvedValue(undefined),
    title: vi.fn().mockResolvedValue('Test Page'),
    screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
    evaluate: vi.fn().mockResolvedValue(['https://example.com/page1', 'https://example.com/page2'])
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage)
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined)
  };

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser)
    }
  };
});

// Mock fs and path
vi.mock('node:fs', () => {
  const mockFs = {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined)
    }
  };
  return {
    ...mockFs,
    default: mockFs
  };
});

vi.mock('node:path', () => {
  const mockPath = {
    join: vi.fn((...args) => args.join('/')),
    relative: vi.fn((from, to) => to)
  };
  return {
    ...mockPath,
    default: mockPath
  };
});

describe('CrawlerStage', () => {
  let crawlerStage: CrawlerStage;
  let config: CrawlConfig;

  beforeEach(() => {
    crawlerStage = new CrawlerStage();
    config = {
      baseUrl: 'https://example.com',
      maxPages: 2,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results'
    };

    vi.clearAllMocks();
  });

  it('should create output directories if they don\'t exist', async () => {
    await crawlerStage.process(config);

    expect(fs.existsSync).toHaveBeenCalledWith('./test-results');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results', { recursive: true });
    expect(fs.existsSync).toHaveBeenCalledWith('./test-results/screenshots');
    expect(fs.mkdirSync).toHaveBeenCalledWith('./test-results/screenshots', { recursive: true });
  });

  it('should save crawl results to a file', async () => {
    await crawlerStage.process(config);

    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(path.join).toHaveBeenCalledWith('./test-results/raw', 'crawl-results.json');
  });

  it('should return crawl results with the correct structure', async () => {
    const result = await crawlerStage.process(config);

    expect(result).toHaveProperty('baseUrl', 'https://example.com');
    expect(result).toHaveProperty('crawledPages');
    expect(result.crawledPages).toBeInstanceOf(Array);
    expect(result).toHaveProperty('timestamp');
  });
});
