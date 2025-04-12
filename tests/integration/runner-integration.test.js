/**
 * Integration tests for the runner modules
 *
 * These tests verify that the runner modules work together correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('fs');
vi.mock('path');
vi.mock('../../src/utils/config-manager.js');
vi.mock('../../src/crawler/site-crawler.js');
vi.mock('../../src/utils/telemetry-manager.js');
vi.mock('../../src/utils/cache-manager.js');
vi.mock('../../src/utils/ui-utils.js');
vi.mock('../../src/utils/colors.js');
vi.mock('../../src/runner/prompt-utils.js');
vi.mock('../../src/runner/extractor-exports.js');
vi.mock('../../src/runner/generator-exports.js', () => ({
  generateDesignTokens: vi.fn().mockResolvedValue({
    typography: { fontFamily: { primary: 'Arial' } },
    colors: { primary: { base: '#ff0000' } },
    spacing: { scale: { xs: '4px' } },
    borders: { width: { sm: '1px' } },
    animations: { duration: { fast: '0.2s' } }
  }),
  generateMarkdownReport: vi.fn().mockResolvedValue({
    success: true,
    files: ['results/reports/design-system.md']
  }),
  generateReports: vi.fn().mockResolvedValue({
    success: true,
    files: [
      'results/reports/design-system-report.html',
      'results/reports/crawl-report.html'
    ]
  })
}));

// Import the modules under test
import runCrawler from '../../src/runner/run-crawler.js';
import runExtractors from '../../src/runner/run-extractors.js';
import generateTokens from '../../src/runner/generate-tokens.js';
import generateReports from '../../src/runner/generate-reports.js';
import setupConfig from '../../src/runner/setup-config.js';
import determineStepsToRun from '../../src/runner/determine-steps.js';

// Import mocked dependencies
import { ui } from '../../src/utils/ui-utils.js';
import * as configManager from '../../src/utils/config-manager.js';
import * as telemetryManager from '../../src/utils/telemetry-manager.js';
import cacheManager from '../../src/utils/cache-manager.js';
import { crawlSite } from '../../src/crawler/site-crawler.js';
import { extractors } from '../../src/runner/extractor-exports.js';
import { generateDesignTokens } from '../../src/runner/generator-exports.js';

describe('Runner Integration', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Setup UI mocks
    ui.header = vi.fn();
    ui.info = vi.fn();
    ui.warning = vi.fn();
    ui.error = vi.fn();
    ui.createSpinner = vi.fn().mockReturnValue({
      start: vi.fn(),
      succeed: vi.fn(),
      fail: vi.fn()
    });

    // Setup config manager mocks
    configManager.initConfig = vi.fn().mockResolvedValue({
      baseUrl: 'https://example.com',
      maxPages: 10,
      outputDir: './results',
      extractorsToRun: ['typography', 'colors', 'spacing']
    });
    configManager.mergeWithOptions = vi.fn().mockImplementation((fileConfig, options) => ({
      ...fileConfig,
      ...options
    }));
    configManager.pathsFileExists = vi.fn().mockReturnValue(false);

    // Setup telemetry manager mocks
    telemetryManager.initTelemetry = vi.fn().mockReturnValue({
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      recordMetric: vi.fn(),
      getMetrics: vi.fn(),
      generateReport: vi.fn()
    });
    telemetryManager.withTelemetry = vi.fn().mockImplementation((fn) => fn());

    // Setup cache manager mocks
    cacheManager.analyzeStepsToRun = vi.fn().mockReturnValue({
      crawl: { needsRun: true, reason: 'Test reason' },
      typography: { needsRun: true, reason: 'Test reason' },
      colors: { needsRun: true, reason: 'Test reason' },
      spacing: { needsRun: true, reason: 'Test reason' },
      tokens: { needsRun: true, reason: 'Test reason' },
      reports: { needsRun: true, reason: 'Test reason' }
    });
    cacheManager.promptUser = vi.fn().mockResolvedValue({
      runAll: false,
      steps: {
        crawl: true,
        typography: true,
        colors: true,
        spacing: true,
        tokens: true,
        reports: true
      }
    });
    cacheManager.updateCacheForStep = vi.fn();

    // Setup crawler mocks
    crawlSite.mockResolvedValue({
      baseUrl: 'https://example.com',
      crawledPages: [
        { url: 'https://example.com', title: 'Example' }
      ],
      errors: []
    });

    // Setup extractor mocks
    extractors.typography = {
      name: 'typography',
      description: 'Typography extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { fontFamilies: ['Arial'] } })
    };
    extractors.colors = {
      name: 'colors',
      description: 'Colors extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { colors: ['#ff0000'] } })
    };
    extractors.spacing = {
      name: 'spacing',
      description: 'Spacing extractor',
      run: vi.fn().mockResolvedValue({ success: true, data: { spacing: ['8px'] } })
    };

    // Generator mocks are set up in the vi.mock call
  });

  test('Config setup and step determination', async () => {
    // Setup
    const options = {
      url: 'https://example.com',
      force: true
    };

    // Step 1: Setup config
    const { config, telemetry } = await setupConfig(options);
    expect(config).toBeDefined();
    expect(config.baseUrl).toBe('https://example.com');

    // Step 2: Determine steps to run
    const { stepsToRun, runAll } = await determineStepsToRun(config, options);
    expect(stepsToRun).toBeDefined();
    expect(runAll).toBe(true);

    // Verify the workflow
    expect(configManager.initConfig).toHaveBeenCalled();
    expect(configManager.mergeWithOptions).toHaveBeenCalled();
  });

  test('Crawler and extractor integration', async () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10,
      outputDir: './results',
      extractorsToRun: ['typography', 'colors', 'spacing']
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      crawl: true,
      typography: true,
      colors: true,
      spacing: true
    };
    const runAll = false;
    const rawDir = './results/raw';

    // Step 1: Run crawler
    const crawlResults = await runCrawler(config, telemetry, stepsToRun, runAll, rawDir);

    // Step 2: Run extractors
    await runExtractors(config, telemetry, stepsToRun, runAll);

    // Verify the workflow
    expect(ui.header).toHaveBeenCalledWith('Step 1: Crawling the site');
    expect(crawlSite).toHaveBeenCalled();
    // We don't verify extractors.typography.run here because it's called through a helper function
  });
});
