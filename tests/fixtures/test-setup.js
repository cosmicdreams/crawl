/**
 * Test Setup
 *
 * This file contains setup code that can be used across multiple test files.
 * It provides functions for setting up test environments and mocks.
 */

import fs from 'fs';
import path from 'path';

import { vi } from 'vitest';

import {
  mockFs,
  mockPath,
  mockConsole,
  mockPlaywright
} from './test-mocks.js';

// Make vi available globally for the mock functions
global.vi = vi;

/**
 * Setup common mocks for tests
 * @returns {object} Mocked objects
 */
export function setupCommonMocks() {
  // Mock console methods
  mockConsole();

  // Mock fs module
  const mockedFs = mockFs(vi);
  Object.keys(mockedFs).forEach(key => {
    fs[key] = mockedFs[key];
  });

  // Mock path module
  const mockedPath = mockPath(vi);
  Object.keys(mockedPath).forEach(key => {
    path[key] = mockedPath[key];
  });

  return {
    fs,
    path
  };
}

/**
 * Setup Playwright mocks for tests
 * @returns {object} Mocked Playwright objects
 */
export function setupPlaywrightMocks() {
  return mockPlaywright(vi);
}

/**
 * Setup mocks for a specific test file
 * @param {object} options - Options for setting up mocks
 * @param {boolean} options.mockFs - Whether to mock fs
 * @param {boolean} options.mockPath - Whether to mock path
 * @param {boolean} options.mockConsole - Whether to mock console
 * @param {boolean} options.mockPlaywright - Whether to mock Playwright
 * @returns {object} Mocked objects
 */
export function setupTestMocks(options = {}) {
  const mocks = {};

  // Default options
  const opts = {
    mockFs: true,
    mockPath: true,
    mockConsole: true,
    mockPlaywright: false,
    ...options
  };

  // Mock console methods
  if (opts.mockConsole) {
    mockConsole();
  }

  // Mock fs module
  if (opts.mockFs) {
    mocks.fs = mockFs(vi);
  }

  // Mock path module
  if (opts.mockPath) {
    mocks.path = mockPath(vi);
  }

  // Mock Playwright
  if (opts.mockPlaywright) {
    mocks.playwright = mockPlaywright(vi);
  }

  return mocks;
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.resetAllMocks();
}

/**
 * Clear all mocks
 */
export function clearAllMocks() {
  vi.clearAllMocks();
}

/**
 * Restore all mocks
 */
export function restoreAllMocks() {
  vi.restoreAllMocks();
}
