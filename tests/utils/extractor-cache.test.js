/**
 * Tests for the extractor-cache.js module
 *
 * These tests verify that the caching functionality works correctly,
 * including generating cache keys, saving to cache, and retrieving from cache.
 */

// Mock the fs module
jest.mock('fs');

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const extractorCache = require('../../src/utils/extractor-cache');

describe('extractor-cache', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file system functions
    fs.existsSync.mockImplementation((path) => {
      // Return true for cache directory
      if (path.includes('cache')) {
        return true;
      }
      // Return true for specific cache files
      if (path.includes('valid-cache-key.json')) {
        return true;
      }
      // Return false for other paths
      return false;
    });

    fs.readFileSync.mockImplementation((path) => {
      if (path.includes('valid-cache-key.json')) {
        return JSON.stringify({
          metadata: {
            timestamp: Date.now() - 1000, // 1 second ago
            type: 'test',
            url: 'https://example.com'
          },
          data: {
            testData: 'cached data'
          }
        });
      }
      if (path.includes('expired-cache-key.json')) {
        return JSON.stringify({
          metadata: {
            timestamp: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
            type: 'test',
            url: 'https://example.com'
          },
          data: {
            testData: 'expired data'
          }
        });
      }
      throw new Error(`File not found: ${path}`);
    });

    fs.writeFileSync.mockImplementation(() => {});
    fs.mkdirSync.mockImplementation(() => {});
    fs.statSync.mockImplementation(() => ({
      mtimeMs: Date.now() - 1000 // 1 second ago
    }));
    fs.readdirSync.mockImplementation(() => ['valid-cache-key.json', 'expired-cache-key.json']);
    fs.unlinkSync.mockImplementation(() => {});
  });

  describe('generateCacheKey', () => {
    test('generates a unique cache key based on inputs', () => {
      // Execute
      const key1 = extractorCache.generateCacheKey('test', 'https://example.com', { prop: 'value' });
      const key2 = extractorCache.generateCacheKey('test', 'https://example.com', { prop: 'value' });
      const key3 = extractorCache.generateCacheKey('test', 'https://example.com', { prop: 'different' });

      // Verify
      expect(key1).toBe(key2); // Same inputs should produce same key
      expect(key1).not.toBe(key3); // Different inputs should produce different keys
      expect(key1).toMatch(/^[a-f0-9]{32}$/); // MD5 hash format
    });
  });

  describe('hasValidCache', () => {
    test('returns true for valid cache entries', () => {
      // Setup
      fs.existsSync.mockReturnValueOnce(true);

      // Execute
      const result = extractorCache.hasValidCache('valid-cache-key');

      // Verify
      expect(result).toBe(true);
    });

    test('returns false when caching is disabled', () => {
      // Execute
      const result = extractorCache.hasValidCache('valid-cache-key', { enabled: false });

      // Verify
      expect(result).toBe(false);
    });

    test('returns false when cache file does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValueOnce(false);

      // Execute
      const result = extractorCache.hasValidCache('nonexistent-key');

      // Verify
      expect(result).toBe(false);
    });

    test('returns false when cache has expired', () => {
      // Setup
      fs.existsSync.mockReturnValueOnce(true);
      fs.readFileSync.mockReturnValueOnce(JSON.stringify({
        metadata: {
          timestamp: Date.now() - (2 * 60 * 60 * 1000) // 2 hours ago
        },
        data: {}
      }));

      // Execute
      const result = extractorCache.hasValidCache('expired-key', { enabled: true, ttl: 60 * 60 * 1000 });

      // Verify
      expect(result).toBe(false);
    });
  });

  describe('getFromCache', () => {
    test('returns cached data for valid cache entries', () => {
      // Execute
      const result = extractorCache.getFromCache('valid-cache-key');

      // Verify
      expect(result).toEqual({ testData: 'cached data' });
    });

    test('returns null for invalid cache entries', () => {
      // Execute
      const result = extractorCache.getFromCache('nonexistent-key');

      // Verify
      expect(result).toBeNull();
    });
  });

  describe('saveToCache', () => {
    test('saves data to cache', () => {
      // Setup
      const data = { testData: 'new data' };
      const metadata = { type: 'test', url: 'https://example.com' };

      // Execute
      const result = extractorCache.saveToCache('new-cache-key', data, metadata);

      // Verify
      expect(result).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();

      // Check that the written data contains both metadata and data
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      expect(writtenData).toHaveProperty('metadata');
      expect(writtenData).toHaveProperty('data');
      expect(writtenData.data).toEqual(data);
      expect(writtenData.metadata).toMatchObject(metadata);
    });

    test('does not save when caching is disabled', () => {
      // Execute
      const result = extractorCache.saveToCache('new-cache-key', {}, {}, { enabled: false });

      // Verify
      expect(result).toBe(false);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('clearCache', () => {
    test('clears all cache entries', () => {
      // Execute
      const result = extractorCache.clearCache();

      // Verify
      expect(result).toBe(true);
      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2); // Two cache files
    });
  });

  describe('invalidateCache', () => {
    test('invalidates a specific cache entry', () => {
      // Execute
      const result = extractorCache.invalidateCache('valid-cache-key');

      // Verify
      expect(result).toBe(true);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('withCache', () => {
    test('returns cached data when available', async () => {
      // Setup
      const fn = jest.fn().mockResolvedValue({ testData: 'fresh data' });

      // Generate the actual cache key that will be used
      const cacheKey = extractorCache.generateCacheKey('test', 'https://example.com', {});

      // Mock the file system to return data for this specific cache key
      fs.existsSync.mockImplementation(path => {
        return path.includes(`${cacheKey}.json`) || path.includes('cache');
      });

      fs.readFileSync.mockImplementation(path => {
        if (path.includes(`${cacheKey}.json`)) {
          return JSON.stringify({
            metadata: {
              timestamp: Date.now() - 1000, // 1 second ago
              type: 'test',
              url: 'https://example.com'
            },
            data: {
              testData: 'cached data'
            }
          });
        }
        throw new Error(`File not found: ${path}`);
      });

      // Execute
      const result = await extractorCache.withCache(fn, 'test', 'https://example.com');

      // Verify
      expect(result).toHaveProperty('fromCache', true);
      expect(result).toHaveProperty('testData', 'cached data');
      expect(fn).not.toHaveBeenCalled(); // Function should not be called when cache is available
    });

    test('executes function and caches result when no cache is available', async () => {
      // Setup
      const fn = jest.fn().mockResolvedValue({ testData: 'fresh data' });
      fs.existsSync.mockReturnValue(false); // No cache available

      // Execute
      const result = await extractorCache.withCache(fn, 'test', 'https://example.com');

      // Verify
      expect(result).toHaveProperty('fromCache', false);
      expect(result).toHaveProperty('testData', 'fresh data');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalled(); // Result should be cached
    });
  });
});
