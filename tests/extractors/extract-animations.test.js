const { extractAnimationsFromCrawledPages, extractAnimationsFromPage, extractAnimations, defaultConfig } = require('../../backup/extract-animations');
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

describe('extract-animations.js', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch();
    const context = await browser.newContext();
    page = await context.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('extractAnimationsFromPage should extract animation styles from a page', async () => {
    await page.setContent('<div style="animation: fadeIn 2s ease-in-out;"></div>');
    const result = await extractAnimationsFromPage(page);

    expect(result.success).toBe(true);
    expect(result.data.elementStyles).toHaveProperty('div');
    expect(result.data.durations).toContain('2s');
    expect(result.data.timingFunctions).toContain('ease-in-out');
  });

  test('extractAnimations should handle invalid selectors gracefully', async () => {
    const config = { ...defaultConfig, elements: ['invalid-selector'] };
    const result = await extractAnimations(page, config);

    expect(result.elementStyles).toEqual({});
    expect(result.durations).toEqual([]);
    expect(result.timingFunctions).toEqual([]);
  });

  test('extractAnimationsFromCrawledPages should return error for missing input file', async () => {
    const config = { ...defaultConfig, inputFile: 'non-existent-file.json' };
    const result = await extractAnimationsFromCrawledPages(config);

    expect(result.success).toBe(false);
    expect(result.error.type).toBe('FileNotFoundError');
  });

  test('extractAnimationsFromCrawledPages should analyze multiple pages', async () => {
    const mockCrawlResults = {
      crawledPages: [
        { url: 'https://example.com', status: 200 },
        { url: 'https://example.org', status: 200 }
      ]
    };

    const config = { ...defaultConfig, maxPages: 2 };
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockCrawlResults));
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    const result = await extractAnimationsFromCrawledPages(config);

    expect(result.success).toBe(true);
    expect(result.data.pagesAnalyzed.length).toBe(2);

    fs.readFileSync.mockRestore();
    fs.writeFileSync.mockRestore();
  });
});