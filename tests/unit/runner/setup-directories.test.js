/**
 * Tests for the runner/setup-directories.js module
 *
 * These tests verify that the directory setup works correctly.
 */

import { describe, test, expect, vi } from 'vitest';

// Mock the fs module
vi.mock('fs', () => {
  const fs = {
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([])
  };
  return { ...fs, default: fs };
});

// Mock the path module
vi.mock('path', () => {
  const path = {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    dirname: vi.fn().mockReturnValue('/mock/dir'),
    basename: vi.fn().mockImplementation((p) => p.split('/').pop())
  };
  return { ...path, default: path };
});

// Mock the ui-utils module
vi.mock('../../../src/utils/ui-utils.js', () => ({
  ui: {
    createSpinner: vi.fn().mockReturnValue({
      start: vi.fn(),
      succeed: vi.fn()
    }),
    header: vi.fn(),
    box: vi.fn(),
    warning: vi.fn()
  }
}));

// Mock the colors module
vi.mock('../../../src/utils/colors.js', () => ({
  default: {
    cyan: vi.fn().mockImplementation((text) => text)
  }
}));

// Import the module under test
import setupDirectories from '../../../src/runner/setup-directories.js';

describe('Setup Directories', () => {
  test('setupDirectories should return directory paths', async () => {
    // Setup
    const config = {
      outputDir: './results',
      baseUrl: 'https://example.com',
      maxPages: 10,
      extractorsToRun: ['typography', 'colors']
    };

    // Execute
    const result = await setupDirectories(config);

    // Verify
    expect(result).toBeDefined();
    expect(result).toHaveProperty('rawDir');
    expect(result).toHaveProperty('cssDir');
    expect(result).toHaveProperty('tokensDir');
    expect(result).toHaveProperty('reportsDir');
    expect(result).toHaveProperty('screenshotsDir');
  });
});
