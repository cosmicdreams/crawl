// src/core/types.test.ts
import { describe, it, expect } from 'vitest';
import { CrawlConfig, DesignToken, PageInfo, CrawlResult, ExtractorConfig, TelemetryOptions } from './types.js';

describe('Type Definitions', () => {
  describe('CrawlConfig', () => {
    it('should create valid minimal CrawlConfig', () => {
      const config: CrawlConfig = {
        baseUrl: 'https://example.com',
        maxPages: 5,
        timeout: 30000,
        ignorePatterns: [],
        ignoreExtensions: [],
        screenshots: false
      };
      
      expect(config.baseUrl).toBe('https://example.com');
      expect(config.maxPages).toBe(5);
      expect(config.timeout).toBe(30000);
      expect(Array.isArray(config.ignorePatterns)).toBe(true);
      expect(Array.isArray(config.ignoreExtensions)).toBe(true);
      expect(config.screenshots).toBe(false);
    });

    it('should create valid comprehensive CrawlConfig with extractors', () => {
      const config: CrawlConfig = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 60000,
        ignorePatterns: ['*.pdf', '*/admin/*'],
        ignoreExtensions: ['.jpg', '.png', '.gif'],
        screenshots: true,
        outputDir: './custom-output',
        extractors: {
          colors: {
            includeTextColors: true,
            includeBackgroundColors: true,
            includeBorderColors: false,
            minimumOccurrences: 2
          },
          typography: {
            includeHeadings: true,
            includeBodyText: true,
            includeSpecialText: false,
            minOccurrences: 3
          },
          spacing: {
            includeMargins: true,
            includePadding: true,
            includeGap: true,
            minOccurrences: 1
          },
          borders: {
            includeBorderWidth: true,
            includeBorderStyle: true,
            includeBorderRadius: true,
            includeShadows: false,
            minOccurrences: 2
          },
          animations: {
            minOccurrences: 1
          }
        },
        tokens: {
          outputFormats: ['css', 'json', 'figma'],
          prefix: 'ds'
        }
      };
      
      expect(config.extractors?.colors?.includeTextColors).toBe(true);
      expect(config.extractors?.typography?.minOccurrences).toBe(3);
      expect(config.extractors?.spacing?.includeGap).toBe(true);
      expect(config.extractors?.borders?.includeShadows).toBe(false);
      expect(config.extractors?.animations?.minOccurrences).toBe(1);
      expect(config.tokens?.outputFormats).toEqual(['css', 'json', 'figma']);
      expect(config.tokens?.prefix).toBe('ds');
    });

    it('should validate URL format requirements', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com/path',
        'https://example.com:8080/path?query=value'
      ];
      
      validUrls.forEach(url => {
        const config: CrawlConfig = {
          baseUrl: url,
          maxPages: 5,
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: false
        };
        expect(config.baseUrl).toBe(url);
      });
    });

    it('should validate maxPages constraints', () => {
      const validMaxPages = [1, 10, 100, 1000];
      
      validMaxPages.forEach(maxPages => {
        const config: CrawlConfig = {
          baseUrl: 'https://example.com',
          maxPages,
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: false
        };
        expect(config.maxPages).toBe(maxPages);
        expect(config.maxPages).toBeGreaterThanOrEqual(1);
        expect(config.maxPages).toBeLessThanOrEqual(1000);
      });
    });

    it('should validate timeout constraints', () => {
      const validTimeouts = [1000, 30000, 60000, 120000];
      
      validTimeouts.forEach(timeout => {
        const config: CrawlConfig = {
          baseUrl: 'https://example.com',
          maxPages: 5,
          timeout,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: false
        };
        expect(config.timeout).toBe(timeout);
        expect(config.timeout).toBeGreaterThanOrEqual(1000);
        expect(config.timeout).toBeLessThanOrEqual(120000);
      });
    });
  });

  describe('DesignToken', () => {
    it('should create valid color token', () => {
      const token: DesignToken = {
        name: 'primary-blue',
        value: '#3b82f6',
        type: 'color',
        category: 'primary',
        description: 'Primary brand color',
        usageCount: 15,
        source: '.btn-primary, .link-primary',
        properties: {
          hex: '#3b82f6',
          rgb: 'rgb(59, 130, 246)',
          hsl: 'hsl(217, 91%, 60%)'
        }
      };
      
      expect(token.name).toBe('primary-blue');
      expect(token.value).toBe('#3b82f6');
      expect(token.type).toBe('color');
      expect(token.category).toBe('primary');
      expect(token.usageCount).toBe(15);
      expect(token.properties?.hex).toBe('#3b82f6');
    });

    it('should create valid typography token', () => {
      const token: DesignToken = {
        name: 'heading-large',
        value: '2rem',
        type: 'typography',
        category: 'font-size',
        description: 'Large heading font size',
        usageCount: 8,
        source: 'h1, .text-2xl',
        properties: {
          pixels: '32px',
          lineHeight: '2.25rem',
          fontWeight: '600'
        }
      };
      
      expect(token.type).toBe('typography');
      expect(token.value).toBe('2rem');
      expect(token.properties?.pixels).toBe('32px');
    });

    it('should create valid spacing token', () => {
      const token: DesignToken = {
        name: 'space-4',
        value: '1rem',
        type: 'spacing',
        category: 'padding',
        usageCount: 25
      };
      
      expect(token.type).toBe('spacing');
      expect(token.category).toBe('padding');
      expect(token.value).toBe('1rem');
    });

    it('should create valid border token', () => {
      const token: DesignToken = {
        name: 'border-radius-md',
        value: '0.375rem',
        type: 'border',
        category: 'radius',
        usageCount: 12,
        properties: {
          pixels: '6px'
        }
      };
      
      expect(token.type).toBe('border');
      expect(token.category).toBe('radius');
      expect(token.properties?.pixels).toBe('6px');
    });

    it('should create valid animation token', () => {
      const token: DesignToken = {
        name: 'fade-in',
        value: 'fadeIn 0.3s ease-in-out',
        type: 'animation',
        category: 'transition',
        usageCount: 5,
        properties: {
          duration: '0.3s',
          timingFunction: 'ease-in-out',
          fillMode: 'forwards'
        }
      };
      
      expect(token.type).toBe('animation');
      expect(token.properties?.duration).toBe('0.3s');
    });

    it('should handle minimal token without optional fields', () => {
      const token: DesignToken = {
        name: 'simple-token',
        value: '#ffffff',
        type: 'color'
      };
      
      expect(token.name).toBe('simple-token');
      expect(token.value).toBe('#ffffff');
      expect(token.type).toBe('color');
      expect(token.category).toBeUndefined();
      expect(token.description).toBeUndefined();
      expect(token.usageCount).toBeUndefined();
      expect(token.source).toBeUndefined();
      expect(token.properties).toBeUndefined();
    });
  });

  describe('PageInfo', () => {
    it('should create valid PageInfo', () => {
      const pageInfo: PageInfo = {
        url: 'https://example.com/about',
        title: 'About Us',
        status: 200,
        contentType: 'text/html',
        screenshot: '/screenshots/about.png'
      };
      
      expect(pageInfo.url).toBe('https://example.com/about');
      expect(pageInfo.title).toBe('About Us');
      expect(pageInfo.status).toBe(200);
      expect(pageInfo.contentType).toBe('text/html');
      expect(pageInfo.screenshot).toBe('/screenshots/about.png');
    });

    it('should handle PageInfo without screenshot', () => {
      const pageInfo: PageInfo = {
        url: 'https://example.com',
        title: 'Home Page',
        status: 200,
        contentType: 'text/html'
      };
      
      expect(pageInfo.screenshot).toBeUndefined();
    });

    it('should handle various HTTP status codes', () => {
      const statusCodes = [200, 301, 404, 500];
      
      statusCodes.forEach(status => {
        const pageInfo: PageInfo = {
          url: 'https://example.com',
          title: 'Test Page',
          status,
          contentType: 'text/html'
        };
        expect(pageInfo.status).toBe(status);
      });
    });
  });

  describe('CrawlResult', () => {
    it('should create valid CrawlResult', () => {
      const crawlResult: CrawlResult = {
        baseUrl: 'https://example.com',
        crawledPages: [
          {
            url: 'https://example.com',
            title: 'Home Page',
            status: 200,
            contentType: 'text/html',
            screenshot: '/screenshots/home.png'
          },
          {
            url: 'https://example.com/about',
            title: 'About Us',
            status: 200,
            contentType: 'text/html'
          }
        ],
        timestamp: '2025-01-01T00:00:00.000Z'
      };
      
      expect(crawlResult.baseUrl).toBe('https://example.com');
      expect(crawlResult.crawledPages).toHaveLength(2);
      expect(crawlResult.timestamp).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle empty crawl results', () => {
      const crawlResult: CrawlResult = {
        baseUrl: 'https://example.com',
        crawledPages: [],
        timestamp: new Date().toISOString()
      };
      
      expect(crawlResult.crawledPages).toHaveLength(0);
      expect(Array.isArray(crawlResult.crawledPages)).toBe(true);
    });
  });

  describe('ExtractorConfig', () => {
    it('should create valid ExtractorConfig', () => {
      interface TestExtractorOptions {
        includeTest: boolean;
        minCount: number;
      }
      
      const extractorConfig: ExtractorConfig<TestExtractorOptions> = {
        inputFile: '/path/to/input.json',
        outputFile: '/path/to/output.json',
        writeToFile: true,
        telemetry: {
          enabled: true,
          outputDir: './telemetry',
          logToConsole: false,
          writeToFile: true,
          minDuration: 100
        },
        options: {
          includeTest: true,
          minCount: 5
        }
      };
      
      expect(extractorConfig.inputFile).toBe('/path/to/input.json');
      expect(extractorConfig.outputFile).toBe('/path/to/output.json');
      expect(extractorConfig.writeToFile).toBe(true);
      expect(extractorConfig.options.includeTest).toBe(true);
      expect(extractorConfig.options.minCount).toBe(5);
    });
  });

  describe('TelemetryOptions', () => {
    it('should create valid TelemetryOptions', () => {
      const telemetry: TelemetryOptions = {
        enabled: true,
        outputDir: './performance-logs',
        logToConsole: true,
        writeToFile: true,
        minDuration: 50
      };
      
      expect(telemetry.enabled).toBe(true);
      expect(telemetry.outputDir).toBe('./performance-logs');
      expect(telemetry.logToConsole).toBe(true);
      expect(telemetry.writeToFile).toBe(true);
      expect(telemetry.minDuration).toBe(50);
    });

    it('should handle disabled telemetry', () => {
      const telemetry: TelemetryOptions = {
        enabled: false,
        outputDir: '',
        logToConsole: false,
        writeToFile: false,
        minDuration: 0
      };
      
      expect(telemetry.enabled).toBe(false);
      expect(telemetry.logToConsole).toBe(false);
      expect(telemetry.writeToFile).toBe(false);
    });
  });
});