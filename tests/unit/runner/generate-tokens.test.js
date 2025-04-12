/**
 * Tests for the runner/generate-tokens.js module
 *
 * These tests verify that the token generation runner works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

// Mock the dependencies
vi.mock('fs', () => {
  const mockFs = {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn()
  };
  return {
    ...mockFs,
    default: mockFs
  };
});

vi.mock('path', () => {
  const mockPath = {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    resolve: vi.fn().mockImplementation((...args) => args.join('/'))
  };
  return {
    ...mockPath,
    default: mockPath
  };
});

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
  generateDesignTokens: vi.fn().mockResolvedValue({
    typography: { fontFamily: { primary: 'Arial' } },
    colors: { primary: { base: '#ff0000' } },
    spacing: { scale: { xs: '4px' } },
    borders: { width: { sm: '1px' } },
    animations: { duration: { fast: '0.2s' } }
  })
}));

// Mock console methods
console.log = vi.fn();
console.error = vi.fn();

// Import the module under test
import generateTokens from '../../../src/runner/generate-tokens.js';
import { generateDesignTokens } from '../../../src/runner/generator-exports.js';
import * as telemetryManager from '../../../src/utils/telemetry-manager.js';
import cacheManager from '../../../src/utils/cache-manager.js';

describe('Generate Tokens Runner', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  test('generateTokens should skip if not in stepsToRun', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      tokens: false
    };
    const runAll = false;

    // Mock fs.existsSync to return false
    fs.existsSync.mockReturnValue(false);

    // Execute
    const result = await generateTokens(config, telemetry, stepsToRun, runAll);

    // Verify
    expect(result).toBeDefined();
    expect(result).toEqual({
      typography: {},
      colors: {},
      spacing: {},
      borders: {},
      animations: {}
    });
    expect(console.log).toHaveBeenCalledWith('\n=== Step 3: Generating design tokens [SKIPPED] ===');
    expect(generateDesignTokens).not.toHaveBeenCalled();
    expect(cacheManager.updateCacheForStep).not.toHaveBeenCalled();
  });

  test('generateTokens should run if in stepsToRun', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      tokens: true
    };
    const runAll = false;

    // Execute
    const result = await generateTokens(config, telemetry, stepsToRun, runAll);

    // Verify
    expect(result).toBeDefined();
    expect(result).toEqual({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: { scale: { xs: '4px' } },
      borders: { width: { sm: '1px' } },
      animations: { duration: { fast: '0.2s' } }
    });
    expect(console.log).toHaveBeenCalledWith('\n=== Step 3: Generating design tokens ===');
    expect(generateDesignTokens).toHaveBeenCalledWith(config);
    expect(cacheManager.updateCacheForStep).toHaveBeenCalledWith('tokens', config);
  });

  test('generateTokens should run if runAll is true', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      tokens: false
    };
    const runAll = true;

    // Execute
    const result = await generateTokens(config, telemetry, stepsToRun, runAll);

    // Verify
    expect(result).toBeDefined();
    expect(generateDesignTokens).toHaveBeenCalledWith(config);
    expect(cacheManager.updateCacheForStep).toHaveBeenCalledWith('tokens', config);
  });

  test('generateTokens should use telemetry if provided', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      tokens: true
    };
    const runAll = false;

    // Execute
    await generateTokens(config, telemetry, stepsToRun, runAll);

    // Verify
    expect(telemetryManager.withTelemetry).toHaveBeenCalled();
    expect(telemetryManager.withTelemetry.mock.calls[0][0]).toBeInstanceOf(Function);
    expect(telemetryManager.withTelemetry.mock.calls[0][1]).toBe('generate-tokens');
    expect(telemetryManager.withTelemetry.mock.calls[0][3]).toBe(telemetry);
  });

  test('generateTokens should handle errors', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const telemetry = {
      recordMetric: vi.fn()
    };
    const stepsToRun = {
      tokens: true
    };
    const runAll = false;

    // Mock generateDesignTokens to throw an error
    generateDesignTokens.mockRejectedValueOnce(new Error('Test error'));

    // Execute
    const result = await generateTokens(config, telemetry, stepsToRun, runAll);

    // Verify
    expect(result).toEqual({
      typography: {},
      colors: {},
      spacing: {},
      borders: {},
      animations: {}
    });
    expect(console.error).toHaveBeenCalledWith('Error generating design tokens:', 'Test error');
    expect(telemetry.recordMetric).toHaveBeenCalledWith('tokens-generation-error', 0, {
      error: 'Test error',
      stack: expect.any(String)
    });
  });

  test('loadExistingTokens should load tokens from file if it exists', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const stepsToRun = {
      tokens: false
    };
    const runAll = false;

    // Mock fs.existsSync to return true
    fs.existsSync.mockReturnValue(true);

    // Mock fs.readFileSync to return a JSON string
    fs.readFileSync.mockReturnValue(JSON.stringify({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: {},
      borders: {},
      animations: {}
    }));

    // Execute
    const result = await generateTokens(config, null, stepsToRun, runAll);

    // Verify
    expect(result).toEqual({
      typography: { fontFamily: { primary: 'Arial' } },
      colors: { primary: { base: '#ff0000' } },
      spacing: {},
      borders: {},
      animations: {}
    });
    expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining('tokens/tokens.json'));
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.stringContaining('tokens/tokens.json'), 'utf8');
  });

  test('loadExistingTokens should handle file read errors', async () => {
    // Setup
    const config = {
      outputDir: './results'
    };
    const stepsToRun = {
      tokens: false
    };
    const runAll = false;

    // Mock fs.existsSync to return true
    fs.existsSync.mockReturnValue(true);

    // Mock fs.readFileSync to throw an error
    const testError = new Error('File read error');
    fs.readFileSync.mockImplementation(() => {
      throw testError;
    });

    // Execute
    const result = await generateTokens(config, null, stepsToRun, runAll);

    // Verify
    expect(result).toEqual({
      typography: {},
      colors: {},
      spacing: {},
      borders: {},
      animations: {}
    });
    // Check that console.error was called with any error message
    expect(console.error).toHaveBeenCalledWith('Error loading existing tokens:', expect.any(String));
  });
});
