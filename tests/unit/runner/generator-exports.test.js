/**
 * Tests for the runner/generator-exports.js module
 *
 * These tests verify that the generator exports module correctly imports and exports
 * functions from the generator modules.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the generator modules
vi.mock('../../../src/generators/generate-tokens.js', () => ({
  default: {
    generateDesignTokens: vi.fn().mockResolvedValue({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } }
    })
  }
}));

vi.mock('../../../src/generators/generate-reports.js', () => ({
  default: {
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
  }
}));

// Import the module under test
import { generateDesignTokens, generateMarkdownReport, generateReports } from '../../../src/runner/generator-exports.js';
import generateTokensModule from '../../../src/generators/generate-tokens.js';
import generateReportsModule from '../../../src/generators/generate-reports.js';

describe('Generator Exports', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });
  
  test('generateDesignTokens should be exported correctly', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    
    // Execute
    const result = await generateDesignTokens(config);
    
    // Verify
    expect(result).toEqual({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } }
    });
    expect(generateTokensModule.generateDesignTokens).toHaveBeenCalledWith(config);
  });
  
  test('generateMarkdownReport should be exported correctly', async () => {
    // Setup
    const tokens = {
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } }
    };
    
    // Execute
    const result = await generateMarkdownReport(tokens);
    
    // Verify
    expect(result).toEqual({
      success: true,
      files: ['results/reports/design-system.md']
    });
    expect(generateReportsModule.generateMarkdownReport).toHaveBeenCalledWith(tokens);
  });
  
  test('generateReports should be exported correctly', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    
    // Execute
    const result = await generateReports(config);
    
    // Verify
    expect(result).toEqual({
      success: true,
      files: [
        'results/reports/design-system-report.html',
        'results/reports/crawl-report.html'
      ]
    });
    expect(generateReportsModule.generateReports).toHaveBeenCalledWith(config);
  });
});
