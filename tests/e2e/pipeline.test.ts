import { test, expect } from 'vitest';
import { chromium, Browser, Page } from 'playwright';

// Mock API responses
const mockApiResponses = {
  '/api/profiles': {
    profiles: ['default', 'example']
  },
  '/api/config/default': {
    baseUrl: 'https://example.com',
    maxPages: 10,
    timeout: 30000,
    extractors: {
      colors: {
        includeTextColors: true,
        includeBackgroundColors: true,
        includeBorderColors: true
      },
      typography: {
        includeHeadings: true,
        includeBodyText: true
      }
    }
  },
  '/api/templates': {
    templates: [
      {
        id: 'basic',
        name: 'Basic Extraction',
        description: 'Crawl a website and extract all design tokens',
        config: {
          baseUrl: 'https://example.com',
          maxPages: 10,
          extractors: {
            colors: { includeTextColors: true },
            typography: { includeHeadings: true }
          }
        }
      }
    ]
  }
};

describe('Pipeline Editor E2E Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();

    // Mock API responses
    await page.route('**/api/**', (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname;
      
      if (mockApiResponses[path]) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockApiResponses[path])
        });
      }
      
      // Default mock for other API calls
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Navigate to the app
    await page.goto('http://localhost:6006');
  });

  test('should display pipeline editor with profiles', async () => {
    // Check if the header is visible
    const header = await page.locator('h1:has-text("Pipeline Editor")');
    expect(await header.isVisible()).toBe(true);

    // Check if profiles dropdown is populated
    const profilesDropdown = await page.locator('select');
    const options = await profilesDropdown.locator('option').all();
    expect(options.length).toBeGreaterThan(0);
  });

  test('should open template selector when clicking New Pipeline', async () => {
    // Click the New Pipeline button
    await page.locator('button:has-text("New Pipeline")').click();

    // Check if template selector is visible
    const templateSelector = await page.locator('h2:has-text("Create New Pipeline")');
    expect(await templateSelector.isVisible()).toBe(true);

    // Check if templates are loaded
    const templateDropdown = await page.locator('#template-select');
    expect(await templateDropdown.isVisible()).toBe(true);
  });

  test('should run a pipeline and show monitor', async () => {
    // Mock the pipeline status API
    await page.route('**/api/pipeline/*/status', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-pipeline',
          status: 'running',
          stages: {
            crawler: {
              stage: 'crawler',
              status: 'running',
              progress: 50
            }
          }
        })
      });
    });

    // Mock the run crawler API to return a pipeline ID
    await page.route('**/api/run/**', (route) => {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'started',
          profile: 'default',
          message: 'Pipeline started',
          pipelineId: 'test-pipeline'
        })
      });
    });

    // Click the Run Pipeline button
    await page.locator('button:has-text("Run Pipeline")').click();

    // Check if pipeline monitor is shown
    const monitor = await page.locator('h2:has-text("Pipeline Status")');
    expect(await monitor.isVisible()).toBe(true);

    // Check if progress bar is visible
    const progressBar = await page.locator('div[style*="backgroundColor"]').first();
    expect(await progressBar.isVisible()).toBe(true);
  });
});
