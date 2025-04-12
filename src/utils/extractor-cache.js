/**
 * Extractor Cache Manager
 *
 * Provides caching functionality for extractors to improve performance
 * by avoiding redundant processing of the same data.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Default configuration
const defaultConfig = {
  // Whether caching is enabled
  enabled: true,

  // Directory to store cache files
  cacheDir: path.join(process.cwd(), 'results', 'cache'),

  // Time-to-live for cache entries in milliseconds (default: 1 hour)
  ttl: 60 * 60 * 1000,

  // Whether to validate cache entries against source files
  validateSource: true
};

/**
 * Generate a cache key from input parameters
 * @param {string} type - Type of data being cached (e.g., 'typography', 'colors')
 * @param {string} [url] - URL of the page being processed, defaults to 'default' if not provided
 * @param {object} config - Configuration used for extraction
 * @returns {string} - Cache key
 */
function generateCacheKey(type, url = 'default', config = {}) {
  if (!type) {
    throw new Error('Type is required for generating a cache key');
  }

  // Create a string representation of the inputs
  const input = JSON.stringify({
    type,
    url,
    // Include all config properties to ensure uniqueness
    config: config
  }, (key, value) => {
    // Handle circular references and functions
    if (typeof value === 'function') {
      return value.toString();
    }
    return value;
  });

  // Create a hash of the input
  return crypto.createHash('md5').update(input).digest('hex');
}

/**
 * Get the path to a cache file
 * @param {string} cacheKey - Cache key
 * @param {object} config - Cache configuration
 * @returns {string} - Path to cache file
 */
function getCacheFilePath(cacheKey, config = defaultConfig) {
  if (!cacheKey) {
    throw new Error('Cache key is required');
  }

  const cacheDir = config.cacheDir || path.join(process.cwd(), 'results', 'cache');

  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  return path.join(cacheDir, `${cacheKey}.json`);
}

/**
 * Check if a valid cache entry exists
 * @param {string} cacheKey - Cache key
 * @param {object} config - Cache configuration
 * @returns {boolean} - Whether a valid cache entry exists
 */
function hasValidCache(cacheKey, config = defaultConfig) {
  // If caching is disabled, always return false
  if (!config.enabled) {
    return false;
  }

  const cacheFilePath = getCacheFilePath(cacheKey, config);

  // Check if cache file exists
  if (!fs.existsSync(cacheFilePath)) {
    return false;
  }

  try {
    // Read cache metadata
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
    const metadata = cacheData.metadata || {};

    // Check if cache has expired
    if (config.ttl > 0) {
      const now = Date.now();
      const timestamp = metadata.timestamp || 0;

      if (now - timestamp > config.ttl) {
        return false;
      }
    }

    // Check if source file has changed
    if (config.validateSource && metadata.sourceFile) {
      const sourceFile = metadata.sourceFile;

      if (fs.existsSync(sourceFile)) {
        const sourceStats = fs.statSync(sourceFile);
        const sourceModified = sourceStats.mtimeMs;

        if (sourceModified > metadata.timestamp) {
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    // If there's an error reading the cache, consider it invalid
    return false;
  }
}

/**
 * Get data from cache
 * @param {string} cacheKey - Cache key
 * @param {object} config - Cache configuration
 * @returns {object | null} - Cached data or null if no valid cache exists
 */
function getFromCache(cacheKey, config = defaultConfig) {
  // Check if valid cache exists
  if (!hasValidCache(cacheKey, config)) {
    return null;
  }

  try {
    // Read cache file
    const cacheFilePath = getCacheFilePath(cacheKey, config);
    const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));

    // Return cached data
    return cacheData.data;
  } catch (error) {
    // If there's an error reading the cache, return null
    return null;
  }
}

/**
 * Save data to cache
 * @param {string} cacheKey - Cache key
 * @param {object} data - Data to cache
 * @param {object} metadata - Additional metadata
 * @param {object} config - Cache configuration
 * @returns {boolean} - Whether the data was successfully cached
 */
function saveToCache(cacheKey, data, metadata = {}, config = defaultConfig) {
  // If caching is disabled, don't save
  if (!config.enabled) {
    return false;
  }

  try {
    // Create cache object
    const cacheData = {
      metadata: {
        timestamp: Date.now(),
        ...metadata
      },
      data
    };

    // Write cache file
    const cacheFilePath = getCacheFilePath(cacheKey, config);
    fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData, null, 2));

    return true;
  } catch (error) {
    // If there's an error saving the cache, return false
    return false;
  }
}

/**
 * Clear all cache entries
 * @param {object} config - Cache configuration
 * @returns {boolean} - Whether the cache was successfully cleared
 */
function clearCache(config = defaultConfig) {
  try {
    const cacheDir = config.cacheDir;

    // Check if cache directory exists
    if (!fs.existsSync(cacheDir)) {
      return true;
    }

    // Get all files in cache directory
    const files = fs.readdirSync(cacheDir);

    // Delete each file
    for (const file of files) {
      if (file.endsWith('.json')) {
        fs.unlinkSync(path.join(cacheDir, file));
      }
    }

    return true;
  } catch (error) {
    // If there's an error clearing the cache, return false
    return false;
  }
}

/**
 * Invalidate a specific cache entry
 * @param {string} cacheKey - Cache key
 * @param {object} config - Cache configuration
 * @returns {boolean} - Whether the cache entry was successfully invalidated
 */
function invalidateCache(cacheKey, config = defaultConfig) {
  try {
    const cacheFilePath = getCacheFilePath(cacheKey, config);

    // Check if cache file exists
    if (fs.existsSync(cacheFilePath)) {
      // Delete cache file
      fs.unlinkSync(cacheFilePath);
    }

    return true;
  } catch (error) {
    // If there's an error invalidating the cache, return false
    return false;
  }
}

/**
 * Get cache statistics
 * @param {object} config - Cache configuration
 * @returns {object} - Cache statistics
 */
function getCacheStats(config = defaultConfig) {
  try {
    const cacheDir = config.cacheDir;

    // Check if cache directory exists
    if (!fs.existsSync(cacheDir)) {
      return {
        entries: 0,
        size: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    // Get all files in cache directory
    const files = fs.readdirSync(cacheDir);
    let totalSize = 0;
    let oldestTimestamp = Date.now();
    let newestTimestamp = 0;

    // Calculate statistics
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);

        totalSize += stats.size;

        try {
          const cacheData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          const timestamp = cacheData.metadata?.timestamp || 0;

          if (timestamp < oldestTimestamp) {
            oldestTimestamp = timestamp;
          }

          if (timestamp > newestTimestamp) {
            newestTimestamp = timestamp;
          }
        } catch (error) {
          // Ignore errors reading individual cache files
        }
      }
    }

    return {
      entries: files.length,
      size: totalSize,
      oldestEntry: oldestTimestamp !== Date.now() ? new Date(oldestTimestamp) : null,
      newestEntry: newestTimestamp !== 0 ? new Date(newestTimestamp) : null
    };
  } catch (error) {
    // If there's an error getting cache statistics, return empty stats
    return {
      entries: 0,
      size: 0,
      oldestEntry: null,
      newestEntry: null,
      error: error.message
    };
  }
}

/**
 * Wrap an async function with caching
 * @param {Function} fn - Function to wrap
 * @param {string} type - Type of data being cached
 * @param {string} [url] - URL of the page being processed, defaults to 'default' if not provided
 * @param {object} config - Extraction configuration
 * @param {object} cacheConfig - Cache configuration
 * @returns {Promise<object>} - Function result (from cache or fresh)
 */
async function withCache(fn, type, url = 'default', config = {}, cacheConfig = defaultConfig) {
  if (!fn || typeof fn !== 'function') {
    throw new Error('Function is required for withCache');
  }

  if (!type) {
    throw new Error('Type is required for withCache');
  }

  // Generate cache key
  const cacheKey = generateCacheKey(type, url, config);

  // Check if valid cache exists
  const cachedData = getFromCache(cacheKey, cacheConfig);
  if (cachedData) {
    // Return the cached data with the fromCache flag
    if (typeof cachedData === 'object') {
      return {
        ...cachedData,
        fromCache: true
      };
    } else {
      // Handle non-object cached data
      return {
        data: cachedData,
        fromCache: true
      };
    }
  }

  // Execute function
  const result = await fn();

  // Save result to cache
  saveToCache(cacheKey, result, {
    type,
    url,
    sourceFile: config.inputFile,
    timestamp: Date.now()
  }, cacheConfig);

  return {
    ...result,
    fromCache: false
  };
}

export {
  defaultConfig,
  generateCacheKey,
  getCacheFilePath,
  hasValidCache,
  getFromCache,
  saveToCache,
  clearCache,
  invalidateCache,
  getCacheStats,
  withCache
};
