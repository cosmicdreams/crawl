/**
 * Tests for the telemetry-manager.js module
 *
 * These tests verify that the telemetry functionality works correctly,
 * including collecting metrics, timing operations, and generating reports.
 */

// Mock the fs module
jest.mock('fs');

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const telemetryManager = require('../../src/utils/telemetry-manager');

describe('telemetry-manager', () => {
  // Store original performance.now
  const originalNow = performance.now;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock file system functions
    fs.existsSync.mockImplementation(() => true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});

    // Mock performance.now
    let time = 1000;
    performance.now = jest.fn().mockImplementation(() => {
      time += 100;
      return time;
    });
  });

  // Restore original after all tests
  afterAll(() => {
    performance.now = originalNow;
  });

  describe('initTelemetry', () => {
    test('initializes telemetry with default config', () => {
      // Execute
      const telemetry = telemetryManager.initTelemetry();

      // Verify
      expect(telemetry).toBeDefined();
      expect(telemetry.config).toBeDefined();
      expect(telemetry.startTimer).toBeDefined();
      expect(telemetry.stopTimer).toBeDefined();
      expect(telemetry.recordMetric).toBeDefined();
      expect(telemetry.getMetrics).toBeDefined();
      expect(telemetry.generateReport).toBeDefined();
    });

    test('initializes telemetry with custom config', () => {
      // Setup
      const customConfig = {
        enabled: true,
        outputDir: '/custom/path',
        logToConsole: false
      };

      // Execute
      const telemetry = telemetryManager.initTelemetry(customConfig);

      // Verify
      expect(telemetry.config).toMatchObject(customConfig);
    });

    test('creates output directory if it does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValueOnce(false);

      // Execute
      telemetryManager.initTelemetry();

      // Verify
      expect(fs.mkdirSync).toHaveBeenCalled();
    });
  });

  describe('startTimer and stopTimer', () => {
    test('starts and stops a timer', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();

      // Execute
      const timerId = telemetry.startTimer('test-operation', { test: 'metadata' });
      const metric = telemetry.stopTimer(timerId);

      // Verify
      expect(timerId).toBeDefined();
      expect(metric).toBeDefined();
      expect(metric.operationName).toBe('test-operation');
      expect(metric.duration).toBeGreaterThan(0);
      expect(metric.metadata).toMatchObject({ test: 'metadata' });
    });

    test('returns null when stopping a non-existent timer', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();

      // Execute
      const result = telemetry.stopTimer('non-existent-timer');

      // Verify
      expect(result).toBeNull();
    });

    test('adds additional metadata when stopping a timer', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();

      // Execute
      const timerId = telemetry.startTimer('test-operation', { initial: 'metadata' });
      const metric = telemetry.stopTimer(timerId, { additional: 'metadata' });

      // Verify
      expect(metric.metadata).toMatchObject({
        initial: 'metadata',
        additional: 'metadata'
      });
    });
  });

  describe('recordMetric', () => {
    test('records a metric directly', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();

      // Execute
      const metric = telemetry.recordMetric('test-operation', 150, { test: 'metadata' });

      // Verify
      expect(metric).toBeDefined();
      expect(metric.operationName).toBe('test-operation');
      expect(metric.duration).toBe(150);
      expect(metric.metadata).toMatchObject({ test: 'metadata' });
    });

    test('updates summary statistics when recording a metric', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();

      // Execute
      telemetry.recordMetric('fast-operation', 50);
      telemetry.recordMetric('slow-operation', 200);
      const metrics = telemetry.getMetrics();

      // Verify
      expect(metrics.summary.operationCount).toBe(2);
      expect(metrics.summary.totalDuration).toBe(250);
      expect(metrics.summary.averageDuration).toBe(125);
      expect(metrics.summary.slowestOperation.operationName).toBe('slow-operation');
      expect(metrics.summary.fastestOperation.operationName).toBe('fast-operation');
    });
  });

  describe('getMetrics', () => {
    test('returns collected metrics', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();
      telemetry.recordMetric('operation-1', 100);
      telemetry.recordMetric('operation-2', 200);

      // Execute
      const metrics = telemetry.getMetrics();

      // Verify
      expect(metrics).toBeDefined();
      expect(metrics.operations).toHaveLength(2);
      expect(metrics.summary).toBeDefined();
      expect(metrics.memory).toBeDefined();
    });
  });

  describe('generateReport', () => {
    test('generates a report from collected metrics', () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();
      telemetry.recordMetric('operation-1', 100);
      telemetry.recordMetric('operation-2', 200);
      telemetry.recordMetric('operation-1', 150);

      // Execute
      const report = telemetry.generateReport('test-report');

      // Verify
      expect(report).toBeDefined();
      expect(report.reportName).toBe('test-report');
      expect(report.operationStats).toBeDefined();
      expect(report.operationStats['operation-1']).toBeDefined();
      expect(report.operationStats['operation-1'].count).toBe(2);
      expect(report.operationStats['operation-2']).toBeDefined();
      expect(report.operationStats['operation-2'].count).toBe(1);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2); // JSON and HTML reports
    });

    test('does not write to file when writeToFile is false', () => {
      // Clear previous mock calls
      fs.writeFileSync.mockClear();

      // Setup - create a new telemetry instance with writeToFile: false
      const telemetry = telemetryManager.initTelemetry({
        writeToFile: false,
        // Ensure we're using a fresh config object
        outputDir: '/custom/path',
        logToConsole: false
      });

      telemetry.recordMetric('operation-1', 100);

      // Execute
      telemetry.generateReport('test-report');

      // Verify
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('withTelemetry', () => {
    test('wraps a function with telemetry', async () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();
      const fn = jest.fn().mockResolvedValue('result');

      // Execute
      const result = await telemetryManager.withTelemetry(fn, 'wrapped-operation', { test: 'metadata' }, telemetry);

      // Verify
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');

      const metrics = telemetry.getMetrics();
      expect(metrics.operations).toHaveLength(1);
      expect(metrics.operations[0].operationName).toBe('wrapped-operation');
      expect(metrics.operations[0].metadata).toMatchObject({ test: 'metadata', success: true });
    });

    test('handles errors in wrapped functions', async () => {
      // Setup
      const telemetry = telemetryManager.initTelemetry();
      const error = new Error('Test error');
      const fn = jest.fn().mockRejectedValue(error);

      // Execute and verify
      await expect(telemetryManager.withTelemetry(fn, 'error-operation', {}, telemetry))
        .rejects.toThrow('Test error');

      const metrics = telemetry.getMetrics();
      expect(metrics.operations).toHaveLength(1);
      expect(metrics.operations[0].operationName).toBe('error-operation');
      expect(metrics.operations[0].metadata).toMatchObject({ success: false, error: 'Test error' });
    });

    test('returns function result directly when telemetry is disabled', async () => {
      // Setup
      const fn = jest.fn().mockResolvedValue('result');

      // Execute
      const result = await telemetryManager.withTelemetry(fn, 'operation', {}, null);

      // Verify
      expect(fn).toHaveBeenCalled();
      expect(result).toBe('result');
    });
  });
});
