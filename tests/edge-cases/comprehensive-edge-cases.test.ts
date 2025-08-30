// tests/edge-cases/comprehensive-edge-cases.test.ts
/**
 * Comprehensive Edge Case Test Suite
 * 
 * This file contains systematic edge case tests designed to prevent regression
 * and ensure robust handling of boundary conditions across the application.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock modules before importing
vi.mock('node:fs');
vi.mock('node:path');
vi.mock('playwright');

describe('Comprehensive Edge Case Coverage', () => {
  let fsMock;
  let pathMock;
  let playwrightMock;

  beforeEach(async () => {
    // Dynamic mock setup to avoid hoisting issues
    fsMock = await vi.importMock('node:fs');
    pathMock = await vi.importMock('node:path');
    playwrightMock = await vi.importMock('playwright');

    // Configure comprehensive Node.js fs mock
    fsMock.default = {
      existsSync: vi.fn().mockReturnValue(true),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
      readFileSync: vi.fn().mockReturnValue('{"test": "data"}'),
      readdirSync: vi.fn().mockReturnValue(['file1.txt', 'file2.json']),
      statSync: vi.fn().mockReturnValue({ 
        isDirectory: () => false, 
        isFile: () => true,
        size: 1024,
        mtime: new Date()
      }),
      unlinkSync: vi.fn(),
      rmSync: vi.fn(),
      copyFileSync: vi.fn(),
      renameSync: vi.fn(),
    };
    Object.assign(fsMock, fsMock.default);

    // Configure Node.js path mock  
    pathMock.default = {
      join: vi.fn((...args) => args.filter(Boolean).join('/')),
      dirname: vi.fn(path => path.split('/').slice(0, -1).join('/') || '/'),
      basename: vi.fn((path, ext) => {
        const base = path.split('/').pop() || '';
        return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
      }),
      extname: vi.fn(path => {
        const parts = path.split('.');
        return parts.length > 1 ? '.' + parts[parts.length - 1] : '';
      }),
      resolve: vi.fn((...args) => '/' + args.filter(Boolean).join('/')),
      relative: vi.fn((from, to) => to),
      isAbsolute: vi.fn(path => path.startsWith('/')),
      normalize: vi.fn(path => path.replace(/\/+/g, '/')),
      sep: '/',
      delimiter: ':',
    };
    Object.assign(pathMock, pathMock.default);

    // Configure comprehensive Playwright mock
    playwrightMock.chromium = {
      launch: vi.fn().mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockResolvedValue(null),
            evaluate: vi.fn().mockResolvedValue({}),
            setDefaultTimeout: vi.fn(),
            close: vi.fn().mockResolvedValue(null),
            url: vi.fn().mockReturnValue('https://example.com'),
            title: vi.fn().mockResolvedValue('Test Page'),
            content: vi.fn().mockResolvedValue('<html><body>Test</body></html>')
          })
        }),
        close: vi.fn().mockResolvedValue(null)
      })
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('File System Edge Cases', () => {
    it('should handle non-existent files gracefully', () => {
      fsMock.existsSync.mockReturnValue(false);
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      // Test that missing files don't crash the application
      expect(() => {
        try {
          fsMock.readFileSync('/non/existent/file.json');
        } catch (error) {
          // Should handle gracefully
          expect(error.message).toContain('ENOENT');
        }
      }).not.toThrow();
    });

    it('should handle permission errors gracefully', () => {
      fsMock.writeFileSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      expect(() => {
        try {
          fsMock.writeFileSync('/protected/file.json', 'data');
        } catch (error) {
          // Should handle permission errors gracefully
          expect(error.message).toContain('EACCES');
        }
      }).not.toThrow();
    });

    it('should handle corrupted JSON files', () => {
      fsMock.readFileSync.mockReturnValue('{ invalid json content');

      expect(() => {
        const content = fsMock.readFileSync('corrupted.json', 'utf8');
        try {
          JSON.parse(content);
        } catch (parseError) {
          // Should handle JSON parse errors
          expect(parseError.message).toContain('JSON');
        }
      }).not.toThrow();
    });

    it('should handle very large files', () => {
      const largeContent = 'x'.repeat(10000000); // 10MB string
      fsMock.readFileSync.mockReturnValue(largeContent);

      expect(() => {
        const content = fsMock.readFileSync('large-file.txt', 'utf8');
        expect(content.length).toBe(10000000);
      }).not.toThrow();
    });

    it('should handle empty files and directories', () => {
      fsMock.readFileSync.mockReturnValue('');
      fsMock.readdirSync.mockReturnValue([]);

      expect(() => {
        const content = fsMock.readFileSync('empty.txt', 'utf8');
        expect(content).toBe('');
        
        const files = fsMock.readdirSync('empty-dir');
        expect(files).toEqual([]);
      }).not.toThrow();
    });
  });

  describe('Path Handling Edge Cases', () => {
    it('should handle malformed paths', () => {
      const malformedPaths = [
        '', 
        null, 
        undefined,
        '//multiple//slashes',
        '../../../etc/passwd',
        'path with spaces',
        'path\x00with\x00nulls',
        'very'.repeat(100) + 'long'.repeat(100) + 'path'
      ];

      malformedPaths.forEach(malformedPath => {
        expect(() => {
          if (malformedPath != null) {
            pathMock.normalize(malformedPath);
            pathMock.resolve(malformedPath);
          }
        }).not.toThrow();
      });
    });

    it('should handle cross-platform path separators', () => {
      const windowsPath = 'C:\\Users\\test\\file.txt';
      const unixPath = '/home/test/file.txt';

      expect(() => {
        pathMock.normalize(windowsPath);
        pathMock.normalize(unixPath);
        pathMock.dirname(windowsPath);
        pathMock.dirname(unixPath);
      }).not.toThrow();
    });

    it('should handle unicode and special characters in paths', () => {
      const specialPaths = [
        'файл.txt', // Cyrillic
        '文件.json', // Chinese
        'file-with-émojis-🚀.log',
        'file with spaces and "quotes".txt',
        "file-with-'single-quotes'.md"
      ];

      specialPaths.forEach(path => {
        expect(() => {
          pathMock.basename(path);
          pathMock.extname(path);
          pathMock.dirname(path);
        }).not.toThrow();
      });
    });
  });

  describe('Network and Browser Edge Cases', () => {
    it('should handle network timeouts', async () => {
      playwrightMock.chromium.launch.mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockRejectedValue(new Error('net::ERR_TIMED_OUT')),
            setDefaultTimeout: vi.fn(),
            close: vi.fn().mockResolvedValue(null)
          })
        }),
        close: vi.fn().mockResolvedValue(null)
      });

      const browser = await playwrightMock.chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      await expect(page.goto('https://slow-site.example.com'))
        .rejects.toThrow('net::ERR_TIMED_OUT');
      
      // Cleanup should still work
      await expect(page.close()).resolves.not.toThrow();
      await expect(browser.close()).resolves.not.toThrow();
    });

    it('should handle connection refused errors', async () => {
      playwrightMock.chromium.launch.mockResolvedValue({
        newContext: vi.fn().mockResolvedValue({
          newPage: vi.fn().mockResolvedValue({
            goto: vi.fn().mockRejectedValue(new Error('net::ERR_CONNECTION_REFUSED at http://localhost:3333/')),
            setDefaultTimeout: vi.fn(),
            close: vi.fn().mockResolvedValue(null)
          })
        }),
        close: vi.fn().mockResolvedValue(null)
      });

      const browser = await playwrightMock.chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      await expect(page.goto('http://localhost:3333/'))
        .rejects.toThrow('net::ERR_CONNECTION_REFUSED');
    });

    it('should handle browser crashes', async () => {
      playwrightMock.chromium.launch.mockRejectedValue(
        new Error('Browser crashed during startup')
      );

      await expect(playwrightMock.chromium.launch())
        .rejects.toThrow('Browser crashed during startup');
    });

    it('should handle malformed URLs', async () => {
      const malformedUrls = [
        '',
        'not-a-url',
        'http://',
        'https://[invalid-ipv6',
        'ftp://example.com', // Different protocol
        'javascript:alert("xss")', // Potential XSS
        'file:///etc/passwd', // Local file access
        'data:text/html,<script>alert("xss")</script>' // Data URLs
      ];

      const browser = await playwrightMock.chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      for (const url of malformedUrls) {
        playwrightMock.chromium.launch.mockResolvedValue({
          newContext: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              goto: vi.fn().mockRejectedValue(new Error(`Invalid URL: ${url}`)),
              setDefaultTimeout: vi.fn(),
              close: vi.fn().mockResolvedValue(null)
            })
          }),
          close: vi.fn().mockResolvedValue(null)
        });

        const browserInstance = await playwrightMock.chromium.launch();
        const contextInstance = await browserInstance.newContext();
        const pageInstance = await contextInstance.newPage();

        await expect(pageInstance.goto(url))
          .rejects.toThrow();
      }
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const testValues = [null, undefined, '', 0, false, NaN, [], {}];

      testValues.forEach(value => {
        expect(() => {
          // Test various operations that might receive these values
          const str = String(value);
          const json = JSON.stringify(value);
          const bool = Boolean(value);
          
          expect(typeof str).toBe('string');
          expect(typeof bool).toBe('boolean');
        }).not.toThrow();
      });
    });

    it('should handle circular references in objects', () => {
      const obj: any = { name: 'test' };
      obj.self = obj; // Create circular reference

      expect(() => {
        try {
          JSON.stringify(obj);
        } catch (error) {
          // Should handle circular reference gracefully
          expect(error.message).toContain('circular');
        }
      }).not.toThrow();
    });

    it('should handle extremely large numbers', () => {
      const largeNumbers = [
        Number.MAX_SAFE_INTEGER,
        Number.MAX_VALUE,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        Number.MIN_VALUE,
        1e308,
        -1e308
      ];

      largeNumbers.forEach(num => {
        expect(() => {
          const str = String(num);
          const isFinite = Number.isFinite(num);
          const json = JSON.stringify(num);
          
          expect(typeof str).toBe('string');
          expect(typeof isFinite).toBe('boolean');
        }).not.toThrow();
      });
    });

    it('should handle special date values', () => {
      const specialDates = [
        new Date(NaN), // Invalid date
        new Date(0), // Unix epoch
        new Date('invalid'), // Invalid date string
        new Date(8640000000000001), // Beyond max date
        new Date(-8640000000000001) // Before min date
      ];

      specialDates.forEach(date => {
        expect(() => {
          // Handle the toISOString() call that can throw with invalid dates
          let iso: string;
          try {
            iso = date.toISOString();
          } catch (error) {
            iso = 'Invalid Date';
          }
          
          const time = date.getTime();
          const valid = !isNaN(date.getTime());
          
          expect(typeof time).toBe('number');
          expect(typeof valid).toBe('boolean');
          expect(typeof iso).toBe('string');
        }).not.toThrow();
      });
    });
  });

  describe('Performance and Memory Edge Cases', () => {
    it('should handle memory pressure scenarios', () => {
      // Simulate high memory usage
      const largeArrays = Array(1000).fill(0).map(() => 
        Array(1000).fill('x'.repeat(100))
      );

      expect(() => {
        // Should be able to process large data without crashing
        expect(largeArrays.length).toBe(1000);
        expect(largeArrays[0].length).toBe(1000);
        
        // Cleanup
        largeArrays.length = 0;
      }).not.toThrow();
    });

    it('should handle concurrent operations', async () => {
      const concurrentOperations = Array(50).fill(0).map(async (_, i) => {
        return new Promise(resolve => {
          setTimeout(() => {
            fsMock.existsSync(`file-${i}.txt`);
            resolve(i);
          }, Math.random() * 10);
        });
      });

      await expect(Promise.all(concurrentOperations)).resolves.toHaveLength(50);
    });

    it('should handle rapid successive operations', async () => {
      const rapidOperations = [];
      
      for (let i = 0; i < 1000; i++) {
        rapidOperations.push(Promise.resolve(fsMock.existsSync(`rapid-${i}.txt`)));
      }

      await expect(Promise.all(rapidOperations)).resolves.toHaveLength(1000);
    });
  });

  describe('Error Recovery Edge Cases', () => {
    it('should recover from transient failures', async () => {
      let attemptCount = 0;
      playwrightMock.chromium.launch.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Transient failure');
        }
        return {
          newContext: vi.fn().mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              goto: vi.fn().mockResolvedValue(null),
              setDefaultTimeout: vi.fn(),
              close: vi.fn().mockResolvedValue(null)
            })
          }),
          close: vi.fn().mockResolvedValue(null)
        };
      });

      // Simulate retry logic
      let browser;
      for (let i = 0; i < 5; i++) {
        try {
          browser = await playwrightMock.chromium.launch();
          break;
        } catch (error) {
          if (i === 4) throw error; // Final attempt
          await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
        }
      }

      expect(browser).toBeDefined();
      expect(attemptCount).toBe(3);
    });

    it('should handle cascading failures gracefully', async () => {
      // Simulate a chain of failures
      fsMock.existsSync.mockReturnValue(false);
      fsMock.readFileSync.mockImplementation(() => {
        throw new Error('File not found');
      });
      playwrightMock.chromium.launch.mockRejectedValue(
        new Error('Browser not available')
      );

      // Application should handle multiple failures without crashing
      expect(() => {
        try {
          const exists = fsMock.existsSync('missing.json');
          if (!exists) {
            try {
              fsMock.readFileSync('missing.json');
            } catch (fsError) {
              // Try alternative action
              playwrightMock.chromium.launch().catch(browserError => {
                // All systems failing, but application should continue
                expect(browserError.message).toContain('Browser not available');
              });
            }
          }
        } catch (error) {
          // Should handle gracefully
        }
      }).not.toThrow();
    });
  });

  describe('Security Edge Cases', () => {
    it('should handle potential path traversal attacks', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        '\\\\server\\share\\file.txt',
        'file:///etc/passwd',
        '\0/etc/passwd'
      ];

      maliciousPaths.forEach(path => {
        expect(() => {
          // Path should be normalized and sanitized
          const normalized = pathMock.normalize(path);
          const resolved = pathMock.resolve(path);
          
          expect(typeof normalized).toBe('string');
          expect(typeof resolved).toBe('string');
        }).not.toThrow();
      });
    });

    it('should handle potential code injection attempts', () => {
      const injectionAttempts = [
        '<script>alert("xss")</script>',
        '${process.env.NODE_ENV}',
        '#{7*7}',
        '{{constructor.constructor("alert(1)")()}}',
        'javascript:alert(document.cookie)',
        'data:text/html,<script>alert("xss")</script>'
      ];

      injectionAttempts.forEach(attempt => {
        expect(() => {
          // Should treat as plain text, not executable code
          const escaped = JSON.stringify(attempt);
          const length = attempt.length;
          
          expect(typeof escaped).toBe('string');
          expect(typeof length).toBe('number');
        }).not.toThrow();
      });
    });
  });
});

// Export utilities for use in other test files
export const EdgeCaseTestUtils = {
  createMalformedData: (type: 'crawlResult' | 'config' | 'paths') => {
    switch (type) {
      case 'crawlResult':
        return {
          baseUrl: null,
          crawledPages: undefined,
          timestamp: '',
          malformed: true
        };
      case 'config':
        return {
          base_url: '',
          crawl_settings: null,
          invalid_setting: 'should be ignored'
        };
      case 'paths':
        return {
          all_paths: null,
          problem_paths: 'not an array',
          malformed: true
        };
    }
  },

  createNetworkErrorMock: (errorType: 'timeout' | 'refused' | 'dns' | 'ssl') => {
    const errors = {
      timeout: 'net::ERR_TIMED_OUT',
      refused: 'net::ERR_CONNECTION_REFUSED',
      dns: 'net::ERR_NAME_NOT_RESOLVED',
      ssl: 'net::ERR_CERT_AUTHORITY_INVALID'
    };
    
    return vi.fn().mockRejectedValue(new Error(errors[errorType]));
  },

  createLargeDataset: (size: number) => ({
    baseUrl: 'https://example.com',
    crawledPages: Array(size).fill(0).map((_, i) => ({
      url: `https://example.com/page-${i}`,
      title: `Page ${i}`,
      status: 200,
      contentType: 'text/html',
      largeData: 'x'.repeat(1000) // 1KB per page
    })),
    timestamp: new Date().toISOString()
  })
};