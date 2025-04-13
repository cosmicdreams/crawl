/**
 * Tests for the utils/console-manager.js module
 *
 * These tests verify that the console manager works correctly.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock ora package
vi.mock('ora', () => ({
  default: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    stopAndPersist: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    render: vi.fn().mockReturnThis(),
    text: ''
  }))
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleInfo = console.info;

console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();
console.info = vi.fn();

// Import the module under test
import consoleManager, { ConsoleManager, LOG_LEVELS } from '../../../src/utils/console-manager.js';

describe('Console Manager', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();
  });

  afterAll(() => {
    // Restore original console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
  });

  test('consoleManager should export functions', () => {
    // Verify
    expect(consoleManager).toBeDefined();
    expect(consoleManager.log).toBeInstanceOf(Function);
    expect(consoleManager.error).toBeInstanceOf(Function);
    expect(consoleManager.warn).toBeInstanceOf(Function);
    expect(consoleManager.info).toBeInstanceOf(Function);
    expect(consoleManager.debug).toBeInstanceOf(Function);
    expect(consoleManager.setLogLevel).toBeInstanceOf(Function);
    expect(consoleManager.configure).toBeInstanceOf(Function);
  });

  test('ConsoleManager class should be exported', () => {
    // Verify
    expect(ConsoleManager).toBeDefined();
    expect(LOG_LEVELS).toBeDefined();

    // Create a new instance
    const logger = new ConsoleManager();
    expect(logger).toBeInstanceOf(ConsoleManager);
    expect(logger.log).toBeInstanceOf(Function);
  });

  test('ConsoleManager should create a spinner', () => {
    // Create a new instance
    const logger = new ConsoleManager();

    // Execute
    const spinner = logger.spinner('Test spinner');

    // Verify
    expect(spinner).toBeDefined();
    expect(spinner.succeed).toBeInstanceOf(Function);
    expect(spinner.fail).toBeInstanceOf(Function);
  });

  test('ConsoleManager should create a task', () => {
    // Create a new instance
    const logger = new ConsoleManager();

    // Execute
    const task = logger.task('Test task');

    // Verify
    expect(task).toBeDefined();
    expect(task.update).toBeInstanceOf(Function);
    expect(task.complete).toBeInstanceOf(Function);
    expect(task.fail).toBeInstanceOf(Function);
  });
});
