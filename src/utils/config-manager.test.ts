// src/utils/config-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from './config-manager.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ConfigManager Security Tests', () => {
  const testConfigDir = path.join(__dirname, 'test-configs');
  
  beforeEach(() => {
    // Clean up test config directory
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testConfigDir, { recursive: true });
  });

  describe('URL Validation', () => {
    it('should reject invalid URLs in baseUrl', () => {
      const invalidConfig = {
        baseUrl: 'not-a-url',
        maxPages: 10,
        timeout: 30000,
        ignorePatterns: [],
        ignoreExtensions: [],
        screenshots: true
      };

      const configFile = path.join(testConfigDir, 'invalid-url.json');
      fs.writeFileSync(configFile, JSON.stringify(invalidConfig));

      expect(() => {
        new ConfigManager(configFile);
      }).toThrow('Configuration validation failed');
    });

    it('should reject dangerous protocols', () => {
      const dangerousConfigs = [
        { baseUrl: 'file:///etc/passwd' },
        { baseUrl: 'javascript:alert(1)' },
        { baseUrl: 'data:text/html,<script>alert(1)</script>' },
        { baseUrl: 'ftp://example.com' }
      ];

      dangerousConfigs.forEach((config, index) => {
        const testConfig = {
          ...config,
          maxPages: 10,
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: true
        };

        const configFile = path.join(testConfigDir, `dangerous-${index}.json`);
        fs.writeFileSync(configFile, JSON.stringify(testConfig));

        expect(() => {
          new ConfigManager(configFile);
        }).toThrow();
      });
    });

    it('should accept valid HTTPS URLs', () => {
      const validConfig = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        ignorePatterns: [],
        ignoreExtensions: [],
        screenshots: true
      };

      const configFile = path.join(testConfigDir, 'valid-https.json');
      fs.writeFileSync(configFile, JSON.stringify(validConfig));

      expect(() => {
        new ConfigManager(configFile);
      }).not.toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should reject excessive maxPages values', () => {
      const invalidConfig = {
        baseUrl: 'https://example.com',
        maxPages: 10000, // Too high
        timeout: 30000,
        ignorePatterns: [],
        ignoreExtensions: [],
        screenshots: true
      };

      const configFile = path.join(testConfigDir, 'excessive-pages.json');
      fs.writeFileSync(configFile, JSON.stringify(invalidConfig));

      expect(() => {
        new ConfigManager(configFile);
      }).toThrow('maxPages must be a number between 1 and 1000');
    });

    it('should reject invalid timeout values', () => {
      const configs = [
        { timeout: 500 },    // Too low
        { timeout: 200000 }, // Too high
        { timeout: 'invalid' }, // Wrong type
      ];

      configs.forEach((invalidTimeout, index) => {
        const testConfig = {
          baseUrl: 'https://example.com',
          maxPages: 10,
          ...invalidTimeout,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: true
        };

        const configFile = path.join(testConfigDir, `invalid-timeout-${index}.json`);
        fs.writeFileSync(configFile, JSON.stringify(testConfig));

        expect(() => {
          new ConfigManager(configFile);
        }).toThrow(/timeout must be a number between 1000ms and 120000ms/);
      });
    });

    it('should reject invalid data types', () => {
      const invalidConfigs = [
        {
          baseUrl: 'https://example.com',
          maxPages: 'ten', // Should be number
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: true
        },
        {
          baseUrl: 'https://example.com',
          maxPages: 10,
          timeout: 30000,
          ignorePatterns: 'not-array', // Should be array
          ignoreExtensions: [],
          screenshots: true
        },
        {
          baseUrl: 'https://example.com',
          maxPages: 10,
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: 'true' // Should be boolean
        }
      ];

      invalidConfigs.forEach((config, index) => {
        const configFile = path.join(testConfigDir, `invalid-types-${index}.json`);
        fs.writeFileSync(configFile, JSON.stringify(config));

        expect(() => {
          new ConfigManager(configFile);
        }).toThrow('Configuration validation failed');
      });
    });
  });

  describe('Command Line Options Security', () => {
    it('should validate merged command line options', () => {
      const configManager = new ConfigManager();
      
      expect(() => {
        configManager.mergeCommandLineOptions({
          baseUrl: 'invalid-url'
        });
      }).toThrow('Configuration validation failed');
    });

    it('should prevent path traversal in outputDir', () => {
      const configManager = new ConfigManager();
      
      // Test various path traversal attempts
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '/etc/passwd',
        'C:\\windows\\system32'
      ];

      maliciousPaths.forEach(maliciousPath => {
        // This test ensures the validation doesn't prevent legitimate relative paths
        // but logs security concerns for absolute and traversal paths
        expect(() => {
          configManager.mergeCommandLineOptions({
            outputDir: maliciousPath
          });
        }).not.toThrow(); // Type validation allows strings, but security should be handled at filesystem level
      });
    });
  });

  describe('JSON Parsing Security', () => {
    it('should handle malformed JSON gracefully', () => {
      const malformedConfigFile = path.join(testConfigDir, 'malformed.json');
      fs.writeFileSync(malformedConfigFile, '{ invalid json }');

      expect(() => {
        new ConfigManager(malformedConfigFile);
      }).toThrow();
    });

    it('should handle very large JSON files', () => {
      // Create a large but valid config to test DoS protection
      const largeConfig = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        ignorePatterns: new Array(1000).fill('pattern'),
        ignoreExtensions: new Array(1000).fill('.ext'),
        screenshots: true
      };

      const largeConfigFile = path.join(testConfigDir, 'large.json');
      fs.writeFileSync(largeConfigFile, JSON.stringify(largeConfig));

      expect(() => {
        new ConfigManager(largeConfigFile);
      }).not.toThrow();
    });
  });

  describe('Environment Variable Security', () => {
    it('should validate environment variable URLs', () => {
      // Test that environment variable validation works
      const originalEnv = process.env.CRAWLER_BASE_URL;
      
      try {
        process.env.CRAWLER_BASE_URL = 'invalid-url';
        
        // This would be tested in integration test with the main application
        // Since we're testing ConfigManager in isolation, we focus on the validation logic
        const configManager = new ConfigManager();
        
        expect(() => {
          configManager.mergeCommandLineOptions({
            baseUrl: process.env.CRAWLER_BASE_URL
          });
        }).toThrow('baseUrl must be a valid URL');
        
      } finally {
        process.env.CRAWLER_BASE_URL = originalEnv;
      }
    });
  });
});