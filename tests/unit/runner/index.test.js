/**
 * Tests for the runner/index.js module
 *
 * These tests verify that the main runner orchestrates the process correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock all the dependencies
vi.mock('../../../src/utils/ui-utils.js', () => ({
  ui: {
    logo: vi.fn(),
    header: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../../../src/runner/setup-config.js', () => ({
  default: vi.fn().mockResolvedValue({
    config: {
      baseUrl: 'https://example.com',
      maxPages: 10,
      outputDir: './results',
      withComponents: false
    },
    telemetry: {
      startTimer: vi.fn(),
      stopTimer: vi.fn(),
      recordMetric: vi.fn(),
      getMetrics: vi.fn(),
      generateReport: vi.fn()
    }
  })
}));

vi.mock('../../../src/runner/setup-directories.js', () => ({
  default: vi.fn().mockResolvedValue({
    rawDir: './results/raw',
    cssDir: './results/css',
    tokensDir: './results/tokens',
    reportsDir: './results/reports',
    screenshotsDir: './results/screenshots'
  })
}));

vi.mock('../../../src/runner/determine-steps.js', () => ({
  default: vi.fn().mockResolvedValue({
    stepsToRun: {
      crawl: true,
      extract: true,
      tokens: true,
      reports: true
    },
    runAll: false
  })
}));

vi.mock('../../../src/runner/run-crawler.js', () => ({
  default: vi.fn().mockResolvedValue({
    baseUrl: 'https://example.com',
    crawledPages: [
      { url: 'https://example.com', title: 'Example' }
    ],
    errors: []
  })
}));

vi.mock('../../../src/runner/run-extractors.js', () => ({
  default: vi.fn().mockResolvedValue({
    colors: { success: true },
    typography: { success: true },
    spacing: { success: true },
    borders: { success: true },
    animations: { success: true }
  })
}));

vi.mock('../../../src/runner/generate-tokens.js', () => ({
  default: vi.fn().mockResolvedValue({
    colors: { primary: '#ff0000' },
    typography: { fontFamilies: { primary: 'Arial' } },
    spacing: { xs: '4px' },
    borders: { width: { sm: '1px' } },
    animations: { duration: { fast: '0.2s' } }
  })
}));

vi.mock('../../../src/runner/generate-reports.js', () => ({
  default: vi.fn().mockResolvedValue({
    success: true,
    files: [
      './results/reports/design-system-report.html',
      './results/reports/crawl-report.html'
    ]
  })
}));

vi.mock('../../../src/runner/process-telemetry.js', () => ({
  default: vi.fn().mockResolvedValue({
    success: true,
    report: 'Telemetry report content'
  })
}));

// Mock console.log to avoid cluttering the test output
console.log = vi.fn();

// Import the module under test
import { run } from '../../../src/runner/index.js';
import setupConfig from '../../../src/runner/setup-config.js';
import setupDirectories from '../../../src/runner/setup-directories.js';
import determineStepsToRun from '../../../src/runner/determine-steps.js';
import runCrawler from '../../../src/runner/run-crawler.js';
import runExtractors from '../../../src/runner/run-extractors.js';
import generateTokens from '../../../src/runner/generate-tokens.js';
import generateReports from '../../../src/runner/generate-reports.js';
import processTelemetry from '../../../src/runner/process-telemetry.js';
import { ui } from '../../../src/utils/ui-utils.js';

describe('Runner', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  test('run should execute all steps in the correct order', async () => {
    // Setup
    const options = {
      url: 'https://example.com',
      maxPages: 10,
      force: false
    };
    
    // Execute
    await run(options);
    
    // Verify that each step was called in the correct order
    expect(ui.logo).toHaveBeenCalled();
    expect(ui.header).toHaveBeenCalledWith('Design Token Extraction Process');
    
    expect(setupConfig).toHaveBeenCalledWith(options);
    expect(setupDirectories).toHaveBeenCalled();
    expect(determineStepsToRun).toHaveBeenCalled();
    expect(runCrawler).toHaveBeenCalled();
    expect(runExtractors).toHaveBeenCalled();
    expect(generateTokens).toHaveBeenCalled();
    expect(generateReports).toHaveBeenCalled();
    expect(processTelemetry).toHaveBeenCalled();
    
    // Verify the order of execution
    const setupConfigCall = vi.mocked(setupConfig).mock.invocationCallOrder[0];
    const setupDirectoriesCall = vi.mocked(setupDirectories).mock.invocationCallOrder[0];
    const determineStepsToRunCall = vi.mocked(determineStepsToRun).mock.invocationCallOrder[0];
    const runCrawlerCall = vi.mocked(runCrawler).mock.invocationCallOrder[0];
    const runExtractorsCall = vi.mocked(runExtractors).mock.invocationCallOrder[0];
    const generateTokensCall = vi.mocked(generateTokens).mock.invocationCallOrder[0];
    const generateReportsCall = vi.mocked(generateReports).mock.invocationCallOrder[0];
    
    expect(setupConfigCall).toBeLessThan(setupDirectoriesCall);
    expect(setupDirectoriesCall).toBeLessThan(determineStepsToRunCall);
    expect(determineStepsToRunCall).toBeLessThan(runCrawlerCall);
    expect(runCrawlerCall).toBeLessThan(runExtractorsCall);
    expect(runExtractorsCall).toBeLessThan(generateTokensCall);
    expect(generateTokensCall).toBeLessThan(generateReportsCall);
  });
  
  test('run should handle component identification when enabled', async () => {
    // Setup
    const options = {
      url: 'https://example.com',
      maxPages: 10,
      force: false,
      withComponents: true
    };
    
    // Mock setupConfig to return config with withComponents: true
    setupConfig.mockResolvedValueOnce({
      config: {
        baseUrl: 'https://example.com',
        maxPages: 10,
        outputDir: './results',
        withComponents: true
      },
      telemetry: {
        startTimer: vi.fn(),
        stopTimer: vi.fn(),
        recordMetric: vi.fn(),
        getMetrics: vi.fn(),
        generateReport: vi.fn()
      }
    });
    
    // Execute
    await run(options);
    
    // Verify that the component identification message was logged
    expect(console.log).toHaveBeenCalledWith('\n=== Step 6: Component identification ===');
    expect(console.log).toHaveBeenCalledWith('Component identification is not yet implemented.');
    expect(console.log).toHaveBeenCalledWith('This feature will be available in a future version.');
  });
  
  test('run should skip telemetry processing when telemetry is disabled', async () => {
    // Setup
    const options = {
      url: 'https://example.com',
      maxPages: 10,
      force: false,
      telemetry: false
    };
    
    // Mock setupConfig to return null telemetry
    setupConfig.mockResolvedValueOnce({
      config: {
        baseUrl: 'https://example.com',
        maxPages: 10,
        outputDir: './results',
        withComponents: false
      },
      telemetry: null
    });
    
    // Execute
    await run(options);
    
    // Verify that telemetry processing was not called
    expect(processTelemetry).not.toHaveBeenCalled();
  });
});
