/**
 * Tests for the runner/generate-reports.js module
 *
 * These tests verify that the report generation runner works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../../../src/utils/telemetry-manager.js', () => ({
  withTelemetry: vi.fn().mockImplementation((fn, name, options, telemetry) => fn())
}));

vi.mock('../../../src/utils/cache-manager.js', () => ({
  default: {
    updateCacheForStep: vi.fn(),
    shouldRun: vi.fn().mockReturnValue(true)
  }
}));

vi.mock('../../../src/runner/generator-exports.js', () => ({
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

// Mock console methods
console.log = vi.fn();
console.error = vi.fn();

// Import the module under test
import generateReports from '../../../src/runner/generate-reports.js';
import { generateMarkdownReport, generateReports as generateHTMLReports } from '../../../src/runner/generator-exports.js';
import * as telemetryManager from '../../../src/utils/telemetry-manager.js';
import cacheManager from '../../../src/utils/cache-manager.js';

describe('Generate Reports Runner', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  test('generateReports should skip if not in stepsToRun', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    };
    const stepsToRun = {
      reports: false
    };
    const runAll = false;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(console.log).toHaveBeenCalledWith('\n=== Step 4: Generating reports [SKIPPED] ===');
    expect(generateMarkdownReport).not.toHaveBeenCalled();
    expect(generateHTMLReports).not.toHaveBeenCalled();
    expect(cacheManager.updateCacheForStep).not.toHaveBeenCalled();
  });
  
  test('generateReports should run if in stepsToRun', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    };
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(generateMarkdownReport).toHaveBeenCalledWith({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    });
    expect(generateHTMLReports).toHaveBeenCalledWith(config);
    expect(cacheManager.updateCacheForStep).toHaveBeenCalledWith('reports', config);
  });
  
  test('generateReports should run if runAll is true', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    };
    const stepsToRun = {
      reports: false
    };
    const runAll = true;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(generateMarkdownReport).toHaveBeenCalled();
    expect(generateHTMLReports).toHaveBeenCalled();
    expect(cacheManager.updateCacheForStep).toHaveBeenCalled();
  });
  
  test('generateReports should use telemetry if provided', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    };
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(telemetryManager.withTelemetry).toHaveBeenCalledTimes(2);
    expect(telemetryManager.withTelemetry.mock.calls[0][1]).toBe('generate-markdown-report');
    expect(telemetryManager.withTelemetry.mock.calls[1][1]).toBe('generate-html-reports');
  });
  
  test('generateReports should skip markdown report if tokens are empty', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {};
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(console.log).toHaveBeenCalledWith('Skipping markdown report generation because no tokens were generated.');
    expect(generateMarkdownReport).not.toHaveBeenCalled();
    expect(generateHTMLReports).toHaveBeenCalled();
  });
  
  test('generateReports should handle markdown report errors', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } }
    };
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Mock generateMarkdownReport to throw an error
    generateMarkdownReport.mockRejectedValueOnce(new Error('Markdown error'));
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(console.error).toHaveBeenCalledWith('Error generating markdown-report:', 'Markdown error');
    expect(telemetry.recordMetric).toHaveBeenCalledWith('markdown-report-error', 0, {
      error: 'Markdown error',
      stack: expect.any(String)
    });
    expect(generateHTMLReports).toHaveBeenCalled();
  });
  
  test('generateReports should handle HTML report errors', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } }
    };
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Mock generateHTMLReports to throw an error
    generateHTMLReports.mockRejectedValueOnce(new Error('HTML error'));
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(console.error).toHaveBeenCalledWith('Error generating html-reports:', 'HTML error');
    expect(telemetry.recordMetric).toHaveBeenCalledWith('html-reports-error', 0, {
      error: 'HTML error',
      stack: expect.any(String)
    });
    expect(cacheManager.updateCacheForStep).not.toHaveBeenCalled();
  });
  
  test('generateReports should normalize token structure', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = null;
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      // Missing some token categories
    };
    const stepsToRun = {
      reports: true
    };
    const runAll = false;
    
    // Execute
    await generateReports(config, telemetry, tokens, stepsToRun, runAll);
    
    // Verify
    expect(generateMarkdownReport).toHaveBeenCalledWith({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: {},
      spacing: {},
      borders: {},
      animations: {}
    });
  });
});
