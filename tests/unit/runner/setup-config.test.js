/**
 * Tests for the runner/setup-config.js module
 *
 * These tests verify that the configuration setup works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies
vi.mock('../../../src/utils/config-manager.js', () => ({
  initConfig: vi.fn().mockResolvedValue({
    baseUrl: 'https://example.com',
    maxPages: 10,
    outputDir: './results'
  }),
  mergeWithOptions: vi.fn().mockImplementation((fileConfig, options) => ({
    ...fileConfig,
    ...options
  }))
}));

vi.mock('../../../src/utils/telemetry-manager.js', () => ({
  initTelemetry: vi.fn().mockReturnValue({
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    recordMetric: vi.fn(),
    getMetrics: vi.fn(),
    generateReport: vi.fn()
  })
}));

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

// Mock console.log to avoid cluttering the test output
console.log = vi.fn();

// Import the module under test
import setupConfig from '../../../src/runner/setup-config.js';
import * as configManager from '../../../src/utils/config-manager.js';
import * as telemetryManager from '../../../src/utils/telemetry-manager.js';

describe('Setup Config', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  test('setupConfig should load config and merge with options', async () => {
    // Setup
    const options = {
      url: 'https://test.com',
      maxPages: 20,
      format: 'json',
      withComponents: true
    };

    // Execute
    const result = await setupConfig(options);

    // Verify
    expect(configManager.initConfig).toHaveBeenCalled();
    expect(configManager.mergeWithOptions).toHaveBeenCalled();
    expect(telemetryManager.initTelemetry).toHaveBeenCalled();

    expect(result).toBeDefined();
    expect(result.config).toBeDefined();
    expect(result.telemetry).toBeDefined();

    expect(result.config.baseUrl).toBe('https://test.com');
    expect(result.config.maxPages).toBe(20);
    expect(result.config.format).toBe('json');
    expect(result.config.withComponents).toBe(true);
  });

  test('setupConfig should map url option to baseUrl', async () => {
    // Setup
    const options = {
      url: 'https://test.com'
    };

    // Execute
    const result = await setupConfig(options);

    // Verify
    expect(options.baseUrl).toBe('https://test.com');
    expect(configManager.mergeWithOptions).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: 'https://example.com' }),
      expect.objectContaining({ url: 'https://test.com', baseUrl: 'https://test.com' })
    );
  });

  test('setupConfig should set default extractors when none specified', async () => {
    // Setup
    const options = {
      url: 'https://test.com'
    };

    // Execute
    const result = await setupConfig(options);

    // Verify
    expect(result.config.extractorsToRun).toEqual([
      'typography',
      'colors',
      'spacing',
      'borders',
      'animations'
    ]);
  });

  test('setupConfig should set specified extractors when provided', async () => {
    // Setup
    const options = {
      url: 'https://test.com',
      only: 'colors,typography'
    };

    // Execute
    const result = await setupConfig(options);

    // Verify
    expect(result.config.extractorsToRun).toEqual(['colors', 'typography']);
  });

  test('setupConfig should disable telemetry when specified', async () => {
    // Setup
    const options = {
      url: 'https://test.com',
      telemetry: false
    };

    // Mock the implementation for this specific test
    telemetryManager.initTelemetry.mockImplementationOnce(() => null);

    // Execute
    const result = await setupConfig(options);

    // Verify
    expect(telemetryManager.initTelemetry).toHaveBeenCalled();
    expect(result.telemetry).toBeNull();
  });
});
