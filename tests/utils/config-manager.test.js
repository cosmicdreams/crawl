/**
 * Tests for the config-manager.js module
 *
 * These tests verify that the configuration management functionality works correctly,
 * including reading, writing, and validating configuration settings.
 */

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn()
}));

// Mock the getDefaultConfig function in the module
jest.mock('../../src/utils/config-manager', () => {
  const originalModule = jest.requireActual('../../src/utils/config-manager');
  return {
    ...originalModule,
    getDefaultConfig: jest.fn().mockReturnValue({
      baseUrl: 'http://localhost:8080',
      maxPages: 100,
      timeout: 30000,
      ignorePatterns: ['\\?', '/admin/'],
      ignoreExtensions: ['.pdf', '.jpg'],
      outputDir: './results',
      screenshotsEnabled: false,
      respectRobotsTxt: true
    })
  };
});

// Import modules after mocking
const fs = require('fs');
const path = require('path');
const configManager = require('../../src/utils/config-manager');

describe('Config Manager', () => {
  // Setup before each test
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs.existsSync to control file existence
    fs.existsSync = jest.fn();

    // Mock fs.readFileSync to return controlled content
    fs.readFileSync = jest.fn();

    // Mock fs.writeFileSync to capture writes
    fs.writeFileSync = jest.fn();

    // Mock fs.mkdirSync
    fs.mkdirSync = jest.fn();
  });

  describe('configExists', () => {
    test('returns true when config file exists', () => {
      // Setup
      fs.existsSync.mockReturnValue(true);

      // Execute
      const result = configManager.configExists();

      // Verify
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
    });

    test('returns false when config file does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValue(false);

      // Execute
      const result = configManager.configExists();

      // Verify
      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('readConfig', () => {
    test('returns default config when config file does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValue(false);

      // Execute
      const config = configManager.readConfig();

      // Verify
      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(config.maxPages).toBeDefined();
      // fs.existsSync is called multiple times, so we just check it was called
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    test('returns parsed config when config file exists', () => {
      // Setup
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        baseUrl: 'https://test.com',
        maxPages: 10,
        timeout: 5000
      }));

      // Execute
      const config = configManager.readConfig();

      // Verify
      expect(config.baseUrl).toBe('https://test.com');
      expect(config.maxPages).toBe(10);
      expect(config.timeout).toBe(5000);
      // fs.existsSync is called multiple times, so we just check it was called
      expect(fs.existsSync).toHaveBeenCalled();
      // fs.readFileSync might be called multiple times, so we just check it was called
      expect(fs.readFileSync).toHaveBeenCalled();
    });

    test('handles JSON parse error gracefully', () => {
      // Setup
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue('invalid json');
      console.warn = jest.fn(); // Mock console.warn

      // Execute
      const config = configManager.readConfig();

      // Verify
      expect(config).toBeDefined();
      expect(config.baseUrl).toBeDefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('saveConfig', () => {
    test('creates directory if it does not exist', () => {
      // Setup
      fs.existsSync.mockReturnValue(false);

      // Execute
      configManager.saveConfig({ baseUrl: 'https://test.com' });

      // Verify
      expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    test('writes config to file with warning comment', () => {
      // Setup
      fs.existsSync.mockReturnValue(true);
      const testConfig = { baseUrl: 'https://test.com' };

      // Execute
      configManager.saveConfig(testConfig);

      // Verify
      expect(fs.writeFileSync).toHaveBeenCalledTimes(1);

      // Check that the written content includes the warning
      const writeCall = fs.writeFileSync.mock.calls[0];
      const writtenContent = writeCall[1];
      const parsedContent = JSON.parse(writtenContent);

      expect(parsedContent._warning).toBeDefined();
      expect(parsedContent.baseUrl).toBe('https://test.com');
    });
  });

  // Additional tests can be added for other functions like promptForConfig, etc.
});
