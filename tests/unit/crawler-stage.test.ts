// tests/unit/crawler-stage.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrawlConfig } from '../../src/core/types.js';
import * as fs from 'node:fs';
import { chromium } from 'playwright';

// Mock modules first
vi.mock('playwright');
vi.mock('node:fs');
vi.mock('node:path');

// Import after mocking
const { CrawlerStage } = await import('../../src/core/stages/crawler-stage.js');

describe('CrawlerStage', () => {
  let crawlerStage: any;
  let mockConfig: CrawlConfig;

  beforeEach(() => {
    crawlerStage = new CrawlerStage();
    mockConfig = {
      baseUrl: 'https://example.com',
      maxPages: 3,
      timeout: 30000,
      ignorePatterns: [],
      ignoreExtensions: [],
      screenshots: true,
      outputDir: './test-results'
    };
    vi.clearAllMocks();
  });

  it('should have correct stage name', () => {
    expect(crawlerStage.name).toBe('crawler');
  });

  it('should create output directories when they do not exist', async () => {
    const mockExistsSync = vi.mocked(fs.existsSync);
    const mockMkdirSync = vi.mocked(fs.mkdirSync);
    
    // Setup mocks
    mockExistsSync.mockReturnValue(false);
    
    const mockPage = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({}),
      title: vi.fn().mockResolvedValue('Test Page'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
      evaluate: vi.fn().mockResolvedValue([])
    };
    
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage)
      }),
      close: vi.fn()
    };
    
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    const result = await crawlerStage.process(mockConfig);
    
    expect(mockMkdirSync).toHaveBeenCalledWith('./test-results', { recursive: true });
    expect(result).toBeDefined();
  });

  it('should return CrawlResult with correct structure', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockPage = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({}),
      title: vi.fn().mockResolvedValue('Test Page'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
      evaluate: vi.fn().mockResolvedValue([])
    };
    
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage)
      }),
      close: vi.fn()
    };
    
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    const result = await crawlerStage.process(mockConfig);
    
    expect(result).toHaveProperty('baseUrl', 'https://example.com');
    expect(result).toHaveProperty('crawledPages');
    expect(result).toHaveProperty('timestamp');
    expect(Array.isArray(result.crawledPages)).toBe(true);
  });

  it('should handle browser launch failure', async () => {
    vi.mocked(chromium.launch).mockRejectedValue(new Error('Browser launch failed'));
    
    await expect(crawlerStage.process(mockConfig)).rejects.toThrow('Browser launch failed');
  });

  it('should respect maxPages limit', async () => {
    const configWithLimit = { ...mockConfig, maxPages: 1 };
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockPage = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({}),
      title: vi.fn().mockResolvedValue('Test Page'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
      evaluate: vi.fn().mockResolvedValue([
        'https://example.com/page1',
        'https://example.com/page2'
      ])
    };
    
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage)
      }),
      close: vi.fn()
    };
    
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    const result = await crawlerStage.process(configWithLimit);
    
    expect(result.crawledPages.length).toBe(1);
  });

  it('should close browser after processing', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockPage = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockResolvedValue({}),
      title: vi.fn().mockResolvedValue('Test Page'),
      screenshot: vi.fn().mockResolvedValue(Buffer.from('test')),
      evaluate: vi.fn().mockResolvedValue([])
    };
    
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage)
      }),
      close: vi.fn()
    };
    
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    await crawlerStage.process(mockConfig);
    
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it('should handle navigation failures gracefully', async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    
    const mockPage = {
      setDefaultTimeout: vi.fn(),
      goto: vi.fn().mockRejectedValue(new Error('Navigation failed')),
      title: vi.fn(),
      screenshot: vi.fn(),
      evaluate: vi.fn()
    };
    
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue({
        newPage: vi.fn().mockResolvedValue(mockPage)
      }),
      close: vi.fn()
    };
    
    vi.mocked(chromium.launch).mockResolvedValue(mockBrowser as any);
    
    const result = await crawlerStage.process(mockConfig);
    
    expect(result).toBeDefined();
    expect(result.crawledPages.length).toBe(0);
  });
});