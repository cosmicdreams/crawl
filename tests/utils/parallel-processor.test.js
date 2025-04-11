/**
 * Tests for the parallel-processor.js module
 *
 * These tests verify that the parallel processing functionality works correctly,
 * including processing tasks in parallel with controlled concurrency.
 */

// Mock Playwright before importing the module
jest.mock('@playwright/test');

// Import modules after mocking
const { chromium } = require('@playwright/test');
const parallelProcessor = require('../../src/utils/parallel-processor');

// Setup mock implementations for chromium
chromium.launch = jest.fn().mockResolvedValue({
  newContext: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      goto: jest.fn().mockResolvedValue({}),
      evaluate: jest.fn(),
      close: jest.fn()
    }),
    close: jest.fn()
  }),
  close: jest.fn()
});

// Mock console methods
console.log = jest.fn();
console.error = jest.fn();

describe('parallel-processor', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processInParallel', () => {
    test('processes tasks in parallel with controlled concurrency', async () => {
      // Setup
      const tasks = [
        { id: 1, data: 'task1' },
        { id: 2, data: 'task2' },
        { id: 3, data: 'task3' },
        { id: 4, data: 'task4' },
        { id: 5, data: 'task5' }
      ];
      
      const processTask = jest.fn().mockImplementation(async (task) => {
        return { processed: task.data };
      });
      
      // Execute
      const results = await parallelProcessor.processInParallel(tasks, processTask, {
        concurrency: 2,
        showProgress: false,
        batchDelay: 0
      });
      
      // Verify
      expect(processTask).toHaveBeenCalledTimes(5);
      expect(results).toHaveLength(5);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0]).toHaveProperty('result.processed', 'task1');
    });
    
    test('handles task errors when continueOnError is true', async () => {
      // Setup
      const tasks = [
        { id: 1, data: 'task1' },
        { id: 2, data: 'error' },
        { id: 3, data: 'task3' }
      ];
      
      const processTask = jest.fn().mockImplementation(async (task) => {
        if (task.data === 'error') {
          throw new Error('Task error');
        }
        return { processed: task.data };
      });
      
      // Execute
      const results = await parallelProcessor.processInParallel(tasks, processTask, {
        concurrency: 2,
        showProgress: false,
        batchDelay: 0,
        continueOnError: true,
        maxRetries: 0
      });
      
      // Verify
      expect(processTask).toHaveBeenCalledTimes(3);
      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[1]).toHaveProperty('success', false);
      expect(results[1]).toHaveProperty('error.message', 'Task error');
      expect(results[2]).toHaveProperty('success', true);
    });
    
    test('retries failed tasks up to maxRetries', async () => {
      // Setup
      const tasks = [
        { id: 1, data: 'task1' },
        { id: 2, data: 'retry' }
      ];
      
      let attempts = 0;
      const processTask = jest.fn().mockImplementation(async (task) => {
        if (task.data === 'retry') {
          attempts++;
          if (attempts <= 2) {
            throw new Error('Retry error');
          }
          return { processed: 'retry succeeded' };
        }
        return { processed: task.data };
      });
      
      // Execute
      const results = await parallelProcessor.processInParallel(tasks, processTask, {
        concurrency: 1,
        showProgress: false,
        batchDelay: 0,
        continueOnError: true,
        maxRetries: 2,
        retryDelay: 10
      });
      
      // Verify
      expect(processTask).toHaveBeenCalledTimes(4); // 1 for task1, 3 for retry (1 initial + 2 retries)
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[1]).toHaveProperty('success', true);
      expect(results[1]).toHaveProperty('result.processed', 'retry succeeded');
    });
  });

  describe('processPages', () => {
    test('processes pages with separate browser instances', async () => {
      // Setup
      const pages = [
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' }
      ];
      
      const processPage = jest.fn().mockImplementation(async (page, pageInfo) => {
        return { url: pageInfo.url, processed: true };
      });
      
      // Execute
      const results = await parallelProcessor.processPages(pages, processPage, {
        concurrency: 2,
        showProgress: false,
        batchDelay: 0
      });
      
      // Verify
      expect(chromium.launch).toHaveBeenCalledTimes(2);
      expect(processPage).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0]).toHaveProperty('result.url', 'https://example.com/page1');
    });
  });

  describe('processPagesWithSharedBrowser', () => {
    test('processes pages with a shared browser instance', async () => {
      // Setup
      const pages = [
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' }
      ];
      
      const processPage = jest.fn().mockImplementation(async (page, pageInfo) => {
        return { url: pageInfo.url, processed: true };
      });
      
      const browser = {
        newContext: jest.fn().mockResolvedValue({
          newPage: jest.fn().mockResolvedValue({
            goto: jest.fn().mockResolvedValue({}),
            evaluate: jest.fn(),
            close: jest.fn()
          }),
          close: jest.fn()
        })
      };
      
      // Execute
      const results = await parallelProcessor.processPagesWithSharedBrowser(pages, processPage, browser, {
        concurrency: 2,
        showProgress: false,
        batchDelay: 0
      });
      
      // Verify
      expect(browser.newContext).toHaveBeenCalledTimes(2);
      expect(processPage).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('success', true);
      expect(results[0]).toHaveProperty('result.url', 'https://example.com/page1');
    });
  });
});
