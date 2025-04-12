/**
 * Tests for the utils/cache-manager.js module
 *
 * These tests verify that the cache manager works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock dependencies
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  statSync: vi.fn(),
  mkdirSync: vi.fn(),
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn()
  }
}));

vi.mock('path', () => {
  const mockPath = {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    dirname: vi.fn().mockReturnValue('/mock/dir'),
    default: {
      join: vi.fn().mockImplementation((...args) => args.join('/')),
      dirname: vi.fn().mockReturnValue('/mock/dir')
    }
  };
  return {
    ...mockPath,
    default: mockPath
  };
});

vi.mock('url', () => ({
  fileURLToPath: vi.fn().mockReturnValue('/mock/file/path')
}));

// Mock crypto module
vi.mock('crypto', () => {
  const mockHashObject = {
    update: vi.fn(function() { return this; }),
    digest: vi.fn(() => 'mock-hash')
  };
  
  const mockCreateHash = vi.fn(() => mockHashObject);
  return {
    createHash: mockCreateHash,
    default: {
      createHash: mockCreateHash
    }
  };
});

// Mock console methods
console.warn = vi.fn();
console.log = vi.fn();

// Import the module under test
import cacheManager from '../../../src/utils/cache-manager.js';

describe('Cache Manager', () => {
  const mockConfig = {
    baseUrl: 'https://example.com',
    maxPages: 10,
    outputDir: './results'
  };

  const mockEmptyCache = {
    lastRun: null,
    targetUrl: null,
    maxPages: null,
    inputHashes: {},
    outputTimestamps: {},
    fileStats: {}
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Default mock implementation for fs.existsSync
    fs.existsSync.mockReturnValue(false);

    // Default mock implementation for fs.readFileSync
    fs.readFileSync.mockReturnValue(JSON.stringify(mockEmptyCache));

    // Default mock implementation for fs.statSync
    fs.statSync.mockReturnValue({
      size: 1000,
      mtime: new Date(),
      isDirectory: () => false
    });
  });

  test('cacheManager should export required functions', () => {
    expect(cacheManager).toBeDefined();
    expect(cacheManager).toHaveProperty('calculateFileHash');
    expect(cacheManager).toHaveProperty('getFileStats');
    expect(cacheManager).toHaveProperty('analyzeStepsToRun');
    expect(cacheManager).toHaveProperty('updateCacheForStep');
    expect(cacheManager).toHaveProperty('promptUser');
  });

  describe('calculateFileHash', () => {
    test('should return empty string for non-existent file', () => {
      fs.existsSync.mockReturnValue(false);
      const result = cacheManager.calculateFileHash('nonexistent.file');
      expect(result).toBe('');
    });

    test('should calculate hash for existing file', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('file content');
      const result = cacheManager.calculateFileHash('test.file');
      expect(result).toBe('mock-hash');
      expect(fs.readFileSync).toHaveBeenCalledWith('test.file', 'utf8');
      expect(crypto.createHash('md5').update).toHaveBeenCalledWith('file content');
    });
  });

  describe('getFileStats', () => {
    test('should return null for non-existent file', () => {
      fs.existsSync.mockReturnValue(false);
      const result = cacheManager.getFileStats('nonexistent.file');
      expect(result).toBeNull();
    });

    test('should return file stats for existing file', () => {
      const mockDate = new Date();
      fs.existsSync.mockReturnValue(true);
      fs.statSync.mockReturnValue({
        size: 1000,
        mtime: mockDate,
        isDirectory: () => false
      });

      const result = cacheManager.getFileStats('test.file');
      expect(result).toEqual({
        size: 1000,
        mtime: mockDate.toISOString(),
        isDirectory: false
      });
    });
  });

  describe('updateCacheForStep', () => {
    test('should update cache for crawl step', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        ...mockEmptyCache,
        outputTimestamps: {}
      }));

      cacheManager.updateCacheForStep('crawl', mockConfig);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);
      
      expect(writtenData).toHaveProperty('lastRun');
      expect(writtenData.targetUrl).toBe(mockConfig.baseUrl);
      expect(writtenData.maxPages).toBe(mockConfig.maxPages);
      expect(writtenData.outputTimestamps).toHaveProperty('crawl');
    });

    test('should update cache for analysis step', () => {
      const step = 'typography';
      fs.readFileSync.mockReturnValue(JSON.stringify({
        ...mockEmptyCache,
        outputTimestamps: {}
      }));

      cacheManager.updateCacheForStep(step, mockConfig);

      expect(fs.writeFileSync).toHaveBeenCalled();
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1]);

      expect(writtenData).toHaveProperty('lastRun');
      expect(writtenData.outputTimestamps).toHaveProperty(step);
    });
  });

  describe('analyzeStepsToRun', () => {
    test('should recommend all steps on first run', () => {
      fs.existsSync.mockReturnValue(false);
      
      const result = cacheManager.analyzeStepsToRun(mockConfig);
      
      expect(result.crawl.needsRun).toBe(true);
      expect(result.crawl.reason).toBe('First run - no cache file exists');
    });

    test('should recommend steps when target URL changes', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        lastRun: new Date().toISOString(),
        targetUrl: 'https://different.com',
        maxPages: 10
      }));

      const result = cacheManager.analyzeStepsToRun(mockConfig);
      
      expect(result.crawl.needsRun).toBe(true);
      expect(result.crawl.reason).toContain('Target URL changed');
    });
  });
});
