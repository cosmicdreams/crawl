/**
 * Tests for the cache-manager.js module
 *
 * These tests verify that the cache management functionality works correctly,
 * including reading, writing, and validating cache data.
 */

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn().mockReturnValue({
    mtime: new Date(),
    size: 1000
  }),
  createReadStream: jest.fn()
}));

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const cacheManager = require('../../src/utils/cache-manager');

describe('Cache Manager', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn().mockReturnValue(true);

    // Mock fs.readFileSync to return controlled content
    fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify({
      lastRun: '2023-01-01T00:00:00.000Z',
      targetUrl: 'https://example.com',
      outputTimestamps: {},
      fileStats: {},
      inputHashes: {}
    }));

    // Mock fs.writeFileSync to capture writes
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();
  });

  describe('getCacheData', () => {
    test('returns default cache when file does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValue(false);

      // Execute
      const cache = cacheManager.getCacheData();

      // Verify
      // Include maxPages in the expected output since it's in the actual implementation
      expect(cache).toEqual({
        lastRun: null,
        targetUrl: null,
        maxPages: null,
        inputHashes: {},
        outputTimestamps: {},
        fileStats: {}
      });
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('returns parsed cache when file exists', () => {
      // Execute
      const cache = cacheManager.getCacheData();

      // Verify
      expect(cache.lastRun).toBe('2023-01-01T00:00:00.000Z');
      expect(cache.targetUrl).toBe('https://example.com');
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    test('handles JSON parse error gracefully', () => {
      // Setup
      fs.readFileSync.mockReturnValue('invalid json');
      console.warn = jest.fn(); // Mock console.warn

      // Execute
      const cache = cacheManager.getCacheData();

      // Verify
      // Include maxPages in the expected output since it's in the actual implementation
      expect(cache).toEqual({
        lastRun: null,
        targetUrl: null,
        maxPages: null,
        inputHashes: {},
        outputTimestamps: {},
        fileStats: {}
      });
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('saveCacheData', () => {
    test('writes cache data to file', () => {
      // Setup
      const cacheData = {
        lastRun: '2023-01-01T00:00:00.000Z',
        targetUrl: 'https://example.com'
      };

      // Execute
      cacheManager.saveCacheData(cacheData);

      // Verify
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

      // Check that the written content matches the input
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.lastRun).toBe('2023-01-01T00:00:00.000Z');
      expect(parsedContent.targetUrl).toBe('https://example.com');
    });
  });

  describe('updateCacheForStep', () => {
    test('updates cache with step information', () => {
      // Setup
      const step = 'crawl';
      const config = { baseUrl: 'https://example.com' };
      fs.existsSync.mockReturnValue(false); // Paths file doesn't exist

      // Execute
      cacheManager.updateCacheForStep(step, config);

      // Verify
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

      // Check that the written content has updated timestamps
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent.targetUrl).toBe('https://example.com');
      expect(parsedContent.outputTimestamps[step]).toBeDefined();
    });
  });

  // Additional tests can be added for other functions
});
