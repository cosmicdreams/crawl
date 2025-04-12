/**
 * Tests for the runner/determine-steps.js module
 *
 * These tests verify that the step determination logic works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../../../src/utils/cache-manager.js', () => ({
  default: {
    analyzeStepsToRun: vi.fn().mockReturnValue({
      crawl: { needsRun: true, reason: 'Test reason' },
      typography: { needsRun: true, reason: 'Test reason' },
      colors: { needsRun: true, reason: 'Test reason' },
      spacing: { needsRun: true, reason: 'Test reason' },
      borders: { needsRun: true, reason: 'Test reason' },
      animations: { needsRun: true, reason: 'Test reason' },
      tokens: { needsRun: false, reason: 'Test reason' },
      reports: { needsRun: true, reason: 'Test reason' }
    }),
    promptUser: vi.fn().mockResolvedValue({
      runAll: false,
      steps: {
        crawl: true,
        typography: true,
        colors: true,
        spacing: true,
        borders: true,
        animations: true,
        tokens: false,
        reports: true
      }
    })
  }
}));

vi.mock('../../../src/utils/config-manager.js', () => ({
  pathsFileExists: vi.fn().mockReturnValue(true)
}));

vi.mock('../../../src/utils/ui-utils.js', () => ({
  ui: {
    info: vi.fn(),
    warning: vi.fn()
  }
}));

vi.mock('../../../src/runner/prompt-utils.js', () => ({
  promptToContinue: vi.fn().mockResolvedValue(true)
}));

// Mock console methods
console.log = vi.fn();

// Import the module under test
import determineStepsToRun from '../../../src/runner/determine-steps.js';
import cacheManager from '../../../src/utils/cache-manager.js';
import { pathsFileExists } from '../../../src/utils/config-manager.js';
import { ui } from '../../../src/utils/ui-utils.js';
import { promptToContinue } from '../../../src/runner/prompt-utils.js';

describe('Determine Steps', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  test('determineStepsToRun should return all steps if force is true', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const options = {
      force: true
    };

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result).toEqual({
      stepsToRun: {
        crawl: true,
        typography: true,
        colors: true,
        spacing: true,
        borders: true,
        animations: true,
        tokens: true,
        reports: true
      },
      runAll: true
    });
    expect(cacheManager.analyzeStepsToRun).not.toHaveBeenCalled();
  });

  test('determineStepsToRun should check cache if force is false', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const options = {
      force: false
    };

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result).toEqual({
      stepsToRun: {
        crawl: true,
        typography: true,
        colors: true,
        spacing: true,
        borders: true,
        animations: true,
        tokens: false,
        reports: true
      },
      runAll: false
    });
    expect(cacheManager.analyzeStepsToRun).toHaveBeenCalledWith(config);
    expect(cacheManager.promptUser).toHaveBeenCalled();
  });

  test('determineStepsToRun should handle only option', async () => {
    // Setup
    const config = {
      outputDir: './results',
      extractorsToRun: ['tokens']
    };
    const options = {
      force: false,
      only: 'tokens'
    };

    // Override the mock for this test
    cacheManager.promptUser.mockResolvedValueOnce({
      runAll: false,
      steps: {
        tokens: true
      }
    });

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result.stepsToRun.tokens).toBe(true);
    expect(result.runAll).toBe(false);
    expect(cacheManager.analyzeStepsToRun).toHaveBeenCalled();
  });

  test('determineStepsToRun should handle multiple only options', async () => {
    // Setup
    const config = {
      outputDir: './results',
      extractorsToRun: ['tokens', 'reports']
    };
    const options = {
      force: false,
      only: 'tokens,reports'
    };

    // Override the mock for this test
    cacheManager.promptUser.mockResolvedValueOnce({
      runAll: false,
      steps: {
        tokens: true,
        reports: true
      }
    });

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result.stepsToRun.tokens).toBe(true);
    expect(result.stepsToRun.reports).toBe(true);
    expect(result.runAll).toBe(false);
    expect(cacheManager.analyzeStepsToRun).toHaveBeenCalled();
  });

  test('determineStepsToRun should check if paths file exists', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const options = {
      force: false
    };

    // Mock pathsFileExists to return false
    pathsFileExists.mockReturnValueOnce(false);

    // Override the mock for this test
    cacheManager.promptUser.mockResolvedValueOnce({
      runAll: false,
      steps: {
        crawl: true
      }
    });

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result.stepsToRun.crawl).toBe(true);
  });

  test('determineStepsToRun should handle yes option', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const options = {
      force: false,
      yes: true
    };

    // Execute
    const result = await determineStepsToRun(config, options);

    // Verify
    expect(result.stepsToRun).toBeDefined();
    expect(cacheManager.analyzeStepsToRun).toHaveBeenCalledWith(config);
    expect(cacheManager.promptUser).not.toHaveBeenCalled();
  });
});
