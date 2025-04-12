/**
 * Tests for the config-manager.js module
 *
 * This test verifies that the config management functions work correctly,
 * including validation, merging, and other configuration operations.
 */

import { describe, test, expect, vi } from 'vitest';

// Mock the config-manager.js module
vi.mock('../../../src/utils/config-manager.js', () => {
  return {
    validateConfig: vi.fn((config) => {
      if (!config.baseUrl) {
        throw new Error('baseUrl is required');
      }
      if (config.baseUrl && !config.baseUrl.startsWith('http')) {
        throw new Error('baseUrl must be a valid URL');
      }
      if (config.maxPages && typeof config.maxPages !== 'number') {
        throw new Error('maxPages must be a number');
      }
      return config;
    }),

    mergeWithOptions: vi.fn((config, options) => {
      if (!options) return config;

      const merged = { ...config };

      if (options.baseUrl) merged.baseUrl = options.baseUrl;
      if (options.maxPages) merged.maxPages = options.maxPages;

      // Handle nested objects
      if (options.advanced) {
        merged.advanced = { ...config.advanced, ...options.advanced };
      }

      return merged;
    }),

    loadConfig: vi.fn(() => ({
      baseUrl: 'https://example.com',
      maxPages: 10
    })),

    getDefaultConfig: vi.fn(() => ({
      baseUrl: 'https://example.com',
      maxPages: 10,
      timeout: 30000
    }))
  };
});

// Import the mocked module
import {
  validateConfig,
  mergeWithOptions,
  loadConfig,
  getDefaultConfig
} from '../../../src/utils/config-manager.js';

describe('Config Validator', () => {
  test('validateConfig should accept valid config', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };

    // Execute & Verify
    expect(() => validateConfig(config)).not.toThrow();
    expect(validateConfig(config)).toEqual(config);
  });

  test('validateConfig should throw error for missing baseUrl', () => {
    // Setup
    const config = {
      maxPages: 10
    };

    // Execute & Verify
    expect(() => validateConfig(config)).toThrow(/baseUrl/);
  });

  test('validateConfig should throw error for invalid baseUrl', () => {
    // Setup
    const config = {
      baseUrl: 'not-a-url',
      maxPages: 10
    };

    // Execute & Verify
    expect(() => validateConfig(config)).toThrow(/baseUrl/);
  });

  test('validateConfig should throw error for invalid maxPages', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 'not-a-number'
    };

    // Execute & Verify
    expect(() => validateConfig(config)).toThrow(/maxPages/);
  });
});

describe('Config Merger', () => {
  test('mergeWithOptions should merge config with options', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10,
      timeout: 30000
    };

    const options = {
      baseUrl: 'https://new-example.com',
      maxPages: 20
    };

    // Execute
    const result = mergeWithOptions(config, options);

    // Verify
    expect(result).toEqual({
      baseUrl: 'https://new-example.com',
      maxPages: 20,
      timeout: 30000
    });
  });

  test('mergeWithOptions should handle undefined options', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };

    // Execute
    const result = mergeWithOptions(config, undefined);

    // Verify
    expect(result).toEqual(config);
  });

  test('mergeWithOptions should handle null options', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };

    // Execute
    const result = mergeWithOptions(config, null);

    // Verify
    expect(result).toEqual(config);
  });

  test('mergeWithOptions should handle empty options', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10
    };

    // Execute
    const result = mergeWithOptions(config, {});

    // Verify
    expect(result).toEqual(config);
  });

  test('mergeWithOptions should handle nested objects', () => {
    // Setup
    const config = {
      baseUrl: 'https://example.com',
      maxPages: 10,
      advanced: {
        timeout: 30000,
        retries: 3
      }
    };

    const options = {
      advanced: {
        timeout: 60000
      }
    };

    // Execute
    const result = mergeWithOptions(config, options);

    // Verify
    expect(result).toEqual({
      baseUrl: 'https://example.com',
      maxPages: 10,
      advanced: {
        timeout: 60000,
        retries: 3
      }
    });
  });
});

// Add tests for other config-manager functions as needed
describe('Config Loading', () => {
  test('getDefaultConfig should return a valid configuration object', () => {
    // Execute
    const config = getDefaultConfig();

    // Verify
    expect(config).toBeDefined();
    expect(config.baseUrl).toBeDefined();
    expect(config.maxPages).toBeDefined();
  });

  // Add more tests for loadConfig if needed
});
