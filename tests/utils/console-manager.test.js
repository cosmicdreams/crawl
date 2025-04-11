/**
 * Tests for console-manager.js
 */

import { ConsoleManager, LOG_LEVELS, getLogger } from '../../src/utils/console-manager.js';

// Create a mock console to test with
const createMockConsole = () => {
  const calls = [];
  
  return {
    log: (...args) => calls.push({ method: 'log', args }),
    info: (...args) => calls.push({ method: 'info', args }),
    warn: (...args) => calls.push({ method: 'warn', args }),
    error: (...args) => calls.push({ method: 'error', args }),
    debug: (...args) => calls.push({ method: 'debug', args }),
    trace: (...args) => calls.push({ method: 'trace', args }),
    dir: (...args) => calls.push({ method: 'dir', args }),
    assert: (...args) => calls.push({ method: 'assert', args }),
    time: (...args) => calls.push({ method: 'time', args }),
    timeEnd: (...args) => calls.push({ method: 'timeEnd', args }),
    table: (...args) => calls.push({ method: 'table', args }),
    calls
  };
};

describe('ConsoleManager', () => {
  let originalConsole;
  let mockConsole;
  let consoleManager;
  
  beforeEach(() => {
    originalConsole = global.console;
    mockConsole = createMockConsole();
    global.console = mockConsole;
    
    consoleManager = new ConsoleManager({
      colors: false, // Disable colors for easier testing
      forwardToConsole: false
    });
    
    // Clear the call log
    mockConsole.calls.length = 0;
  });
  
  afterEach(() => {
    global.console = originalConsole;
  });
  
  test('should log messages with default settings', () => {
    consoleManager.log('Test message');
    consoleManager.info('Info message');
    consoleManager.warn('Warning message');
    consoleManager.error('Error message');
    
    expect(mockConsole.calls.length).toBe(4);
    expect(mockConsole.calls[0].args[0]).toBe('Test message');
    expect(mockConsole.calls[1].args[0]).toBe('Info message');
    expect(mockConsole.calls[2].args[0]).toBe('Warning message');
    expect(mockConsole.calls[3].args[0]).toBe('Error message');
  });
  
  test('should not log debug messages when debug mode is off', () => {
    consoleManager.configure({ debug: false });
    
    consoleManager.log('Regular message');
    consoleManager.debug('Debug message');
    consoleManager.error('Error message');
    
    expect(mockConsole.calls.length).toBe(2);
    expect(mockConsole.calls[0].args[0]).toBe('Regular message');
    expect(mockConsole.calls[1].args[0]).toBe('Error message');
  });
  
  test('should respect log level settings', () => {
    consoleManager.configure({ logLevel: LOG_LEVELS.WARN });
    
    consoleManager.log('Regular message');
    consoleManager.info('Info message');
    consoleManager.warn('Warning message');
    consoleManager.error('Error message');
    
    expect(mockConsole.calls.length).toBe(2);
    expect(mockConsole.calls[0].args[0]).toBe('Warning message');
    expect(mockConsole.calls[1].args[0]).toBe('Error message');
  });
  
  test('should add prefix to messages', () => {
    consoleManager.configure({ prefix: 'test' });
    
    consoleManager.log('Test message');
    
    expect(mockConsole.calls.length).toBe(1);
    expect(mockConsole.calls[0].args[0]).toBe('[test] Test message');
  });
  
  test('should create prefixed loggers', () => {
    const prefixedLogger = consoleManager.createPrefixedLogger('module');
    
    prefixedLogger.log('Test message');
    
    expect(mockConsole.calls.length).toBe(1);
    expect(mockConsole.calls[0].args[0]).toBe('[module] Test message');
  });
  
  test('should chain prefixes correctly', () => {
    consoleManager.configure({ prefix: 'app' });
    const moduleLogger = consoleManager.createPrefixedLogger('module');
    const subModuleLogger = moduleLogger.createPrefixedLogger('submodule');
    
    subModuleLogger.log('Test message');
    
    expect(mockConsole.calls.length).toBe(1);
    expect(mockConsole.calls[0].args[0]).toBe('[app:module:submodule] Test message');
  });
});

describe('getLogger', () => {
  test('should return default logger when no config is provided', () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(logger.options.prefix).toBe('');
  });
  
  test('should configure logger from config', () => {
    const config = {
      logging: {
        debug: true,
        logLevel: 'WARN',
        colors: false,
        timestamps: true,
        prefix: 'app'
      }
    };
    
    const logger = getLogger(config);
    
    expect(logger.options.debug).toBe(true);
    expect(logger.options.logLevel).toBe(LOG_LEVELS.WARN);
    expect(logger.options.colors).toBe(false);
    expect(logger.options.timestamps).toBe(true);
    expect(logger.options.prefix).toBe('app');
  });
  
  test('should add section to prefix', () => {
    const config = {
      logging: {
        prefix: 'app'
      }
    };
    
    const logger = getLogger(config, 'module');
    
    expect(logger.options.prefix).toBe('app:module');
  });
});