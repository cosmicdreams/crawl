// src/utils/config-validator.test.ts
import { describe, it, expect } from 'vitest';
import { CrawlConfig, TelemetryOptions, ExtractorConfig } from '../core/types.js';

// Configuration validation utility functions
export class ConfigValidator {
  static validateCrawlConfig(config: Partial<CrawlConfig>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    if (!config.baseUrl) {
      errors.push('baseUrl is required');
    } else if (!this.isValidUrl(config.baseUrl)) {
      errors.push('baseUrl must be a valid URL');
    }

    if (config.maxPages !== undefined) {
      if (typeof config.maxPages !== 'number' || config.maxPages < 1 || config.maxPages > 1000) {
        errors.push('maxPages must be a number between 1 and 1000');
      }
    } else {
      errors.push('maxPages is required');
    }

    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 120000) {
        errors.push('timeout must be a number between 1000 and 120000 milliseconds');
      }
    } else {
      errors.push('timeout is required');
    }

    // Array validations
    if (config.ignorePatterns && !Array.isArray(config.ignorePatterns)) {
      errors.push('ignorePatterns must be an array');
    }

    if (config.ignoreExtensions && !Array.isArray(config.ignoreExtensions)) {
      errors.push('ignoreExtensions must be an array');
    }

    // Boolean validations
    if (config.screenshots !== undefined && typeof config.screenshots !== 'boolean') {
      errors.push('screenshots must be a boolean');
    }

    // Optional string validations
    if (config.outputDir && typeof config.outputDir !== 'string') {
      errors.push('outputDir must be a string');
    }

    // Extractor configuration validation
    if (config.extractors) {
      const extractorErrors = this.validateExtractors(config.extractors);
      errors.push(...extractorErrors);
    }

    return { valid: errors.length === 0, errors };
  }

  static validateExtractors(extractors: NonNullable<CrawlConfig['extractors']>): string[] {
    const errors: string[] = [];

    if (extractors.colors) {
      const colorErrors = this.validateColorExtractor(extractors.colors);
      errors.push(...colorErrors.map(e => `colors.${e}`));
    }

    if (extractors.typography) {
      const typographyErrors = this.validateTypographyExtractor(extractors.typography);
      errors.push(...typographyErrors.map(e => `typography.${e}`));
    }

    if (extractors.spacing) {
      const spacingErrors = this.validateSpacingExtractor(extractors.spacing);
      errors.push(...spacingErrors.map(e => `spacing.${e}`));
    }

    if (extractors.borders) {
      const borderErrors = this.validateBorderExtractor(extractors.borders);
      errors.push(...borderErrors.map(e => `borders.${e}`));
    }

    if (extractors.animations) {
      const animationErrors = this.validateAnimationExtractor(extractors.animations);
      errors.push(...animationErrors.map(e => `animations.${e}`));
    }

    return errors;
  }

  static validateColorExtractor(config: NonNullable<CrawlConfig['extractors']>['colors']): string[] {
    const errors: string[] = [];

    if (config?.includeTextColors !== undefined && typeof config.includeTextColors !== 'boolean') {
      errors.push('includeTextColors must be a boolean');
    }

    if (config?.includeBackgroundColors !== undefined && typeof config.includeBackgroundColors !== 'boolean') {
      errors.push('includeBackgroundColors must be a boolean');
    }

    if (config?.includeBorderColors !== undefined && typeof config.includeBorderColors !== 'boolean') {
      errors.push('includeBorderColors must be a boolean');
    }

    if (config?.minimumOccurrences !== undefined) {
      if (typeof config.minimumOccurrences !== 'number' || config.minimumOccurrences < 1) {
        errors.push('minimumOccurrences must be a number >= 1');
      }
    }

    return errors;
  }

  static validateTypographyExtractor(config: NonNullable<CrawlConfig['extractors']>['typography']): string[] {
    const errors: string[] = [];

    if (config?.includeHeadings !== undefined && typeof config.includeHeadings !== 'boolean') {
      errors.push('includeHeadings must be a boolean');
    }

    if (config?.includeBodyText !== undefined && typeof config.includeBodyText !== 'boolean') {
      errors.push('includeBodyText must be a boolean');
    }

    if (config?.includeSpecialText !== undefined && typeof config.includeSpecialText !== 'boolean') {
      errors.push('includeSpecialText must be a boolean');
    }

    if (config?.minOccurrences !== undefined) {
      if (typeof config.minOccurrences !== 'number' || config.minOccurrences < 1) {
        errors.push('minOccurrences must be a number >= 1');
      }
    }

    return errors;
  }

  static validateSpacingExtractor(config: NonNullable<CrawlConfig['extractors']>['spacing']): string[] {
    const errors: string[] = [];

    if (config?.includeMargins !== undefined && typeof config.includeMargins !== 'boolean') {
      errors.push('includeMargins must be a boolean');
    }

    if (config?.includePadding !== undefined && typeof config.includePadding !== 'boolean') {
      errors.push('includePadding must be a boolean');
    }

    if (config?.includeGap !== undefined && typeof config.includeGap !== 'boolean') {
      errors.push('includeGap must be a boolean');
    }

    return errors;
  }

  static validateBorderExtractor(config: NonNullable<CrawlConfig['extractors']>['borders']): string[] {
    const errors: string[] = [];

    if (config?.includeBorderWidth !== undefined && typeof config.includeBorderWidth !== 'boolean') {
      errors.push('includeBorderWidth must be a boolean');
    }

    if (config?.includeBorderStyle !== undefined && typeof config.includeBorderStyle !== 'boolean') {
      errors.push('includeBorderStyle must be a boolean');
    }

    if (config?.includeBorderRadius !== undefined && typeof config.includeBorderRadius !== 'boolean') {
      errors.push('includeBorderRadius must be a boolean');
    }

    if (config?.includeShadows !== undefined && typeof config.includeShadows !== 'boolean') {
      errors.push('includeShadows must be a boolean');
    }

    return errors;
  }

  static validateAnimationExtractor(config: NonNullable<CrawlConfig['extractors']>['animations']): string[] {
    const errors: string[] = [];

    if (config?.minOccurrences !== undefined) {
      if (typeof config.minOccurrences !== 'number' || config.minOccurrences < 1) {
        errors.push('minOccurrences must be a number >= 1');
      }
    }

    return errors;
  }

  static validateTelemetryOptions(options: Partial<TelemetryOptions>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (options.enabled !== undefined && typeof options.enabled !== 'boolean') {
      errors.push('enabled must be a boolean');
    }

    if (options.outputDir && typeof options.outputDir !== 'string') {
      errors.push('outputDir must be a string');
    }

    if (options.logToConsole !== undefined && typeof options.logToConsole !== 'boolean') {
      errors.push('logToConsole must be a boolean');
    }

    if (options.writeToFile !== undefined && typeof options.writeToFile !== 'boolean') {
      errors.push('writeToFile must be a boolean');
    }

    if (options.minDuration !== undefined) {
      if (typeof options.minDuration !== 'number' || options.minDuration < 0) {
        errors.push('minDuration must be a number >= 0');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

describe('ConfigValidator', () => {
  describe('validateCrawlConfig', () => {
    it('should validate a correct minimal configuration', () => {
      const config: CrawlConfig = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        ignorePatterns: [],
        ignoreExtensions: [],
        screenshots: false
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a comprehensive configuration', () => {
      const config: CrawlConfig = {
        baseUrl: 'https://example.com',
        maxPages: 50,
        timeout: 60000,
        ignorePatterns: ['*.pdf', '*/admin/*'],
        ignoreExtensions: ['.jpg', '.png'],
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
          }
        }
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing required fields', () => {
      const config = {};

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl is required');
      expect(result.errors).toContain('maxPages is required');
      expect(result.errors).toContain('timeout is required');
    });

    it('should reject invalid URL', () => {
      const config = {
        baseUrl: 'not-a-valid-url',
        maxPages: 10,
        timeout: 30000
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('baseUrl must be a valid URL');
    });

    it('should reject invalid maxPages values', () => {
      const testCases = [
        { value: 0, error: 'maxPages must be a number between 1 and 1000' },
        { value: 1001, error: 'maxPages must be a number between 1 and 1000' },
        { value: -5, error: 'maxPages must be a number between 1 and 1000' },
        { value: 'invalid', error: 'maxPages must be a number between 1 and 1000' }
      ];

      testCases.forEach(({ value, error }) => {
        const config = {
          baseUrl: 'https://example.com',
          maxPages: value,
          timeout: 30000
        };

        const result = ConfigValidator.validateCrawlConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(error);
      });
    });

    it('should reject invalid timeout values', () => {
      const testCases = [
        { value: 999, error: 'timeout must be a number between 1000 and 120000 milliseconds' },
        { value: 120001, error: 'timeout must be a number between 1000 and 120000 milliseconds' },
        { value: -1000, error: 'timeout must be a number between 1000 and 120000 milliseconds' }
      ];

      testCases.forEach(({ value, error }) => {
        const config = {
          baseUrl: 'https://example.com',
          maxPages: 10,
          timeout: value
        };

        const result = ConfigValidator.validateCrawlConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(error);
      });
    });

    it('should validate array fields', () => {
      const config = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        ignorePatterns: 'not-an-array',
        ignoreExtensions: 'not-an-array'
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('ignorePatterns must be an array');
      expect(result.errors).toContain('ignoreExtensions must be an array');
    });

    it('should validate boolean fields', () => {
      const config = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        screenshots: 'not-a-boolean'
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('screenshots must be a boolean');
    });

    it('should validate outputDir type', () => {
      const config = {
        baseUrl: 'https://example.com',
        maxPages: 10,
        timeout: 30000,
        outputDir: 123
      };

      const result = ConfigValidator.validateCrawlConfig(config);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('outputDir must be a string');
    });
  });

  describe('validateExtractors', () => {
    it('should validate color extractor configuration', () => {
      const extractors = {
        colors: {
          includeTextColors: 'not-boolean',
          minimumOccurrences: -1
        }
      };

      const errors = ConfigValidator.validateExtractors(extractors);
      expect(errors).toContain('colors.includeTextColors must be a boolean');
      expect(errors).toContain('colors.minimumOccurrences must be a number >= 1');
    });

    it('should validate typography extractor configuration', () => {
      const extractors = {
        typography: {
          includeHeadings: 'not-boolean',
          minOccurrences: 0
        }
      };

      const errors = ConfigValidator.validateExtractors(extractors);
      expect(errors).toContain('typography.includeHeadings must be a boolean');
      expect(errors).toContain('typography.minOccurrences must be a number >= 1');
    });

    it('should validate spacing extractor configuration', () => {
      const extractors = {
        spacing: {
          includeMargins: 'not-boolean',
          includePadding: 123
        }
      };

      const errors = ConfigValidator.validateExtractors(extractors);
      expect(errors).toContain('spacing.includeMargins must be a boolean');
      expect(errors).toContain('spacing.includePadding must be a boolean');
    });

    it('should validate borders extractor configuration', () => {
      const extractors = {
        borders: {
          includeBorderWidth: 'not-boolean',
          includeShadows: []
        }
      };

      const errors = ConfigValidator.validateExtractors(extractors);
      expect(errors).toContain('borders.includeBorderWidth must be a boolean');
      expect(errors).toContain('borders.includeShadows must be a boolean');
    });

    it('should validate animations extractor configuration', () => {
      const extractors = {
        animations: {
          minOccurrences: 'not-a-number'
        }
      };

      const errors = ConfigValidator.validateExtractors(extractors);
      expect(errors).toContain('animations.minOccurrences must be a number >= 1');
    });
  });

  describe('validateTelemetryOptions', () => {
    it('should validate correct telemetry options', () => {
      const options: TelemetryOptions = {
        enabled: true,
        outputDir: './telemetry',
        logToConsole: false,
        writeToFile: true,
        minDuration: 100
      };

      const result = ConfigValidator.validateTelemetryOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid telemetry options', () => {
      const options = {
        enabled: 'not-boolean',
        outputDir: 123,
        logToConsole: 'not-boolean',
        writeToFile: [],
        minDuration: -5
      };

      const result = ConfigValidator.validateTelemetryOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('enabled must be a boolean');
      expect(result.errors).toContain('outputDir must be a string');
      expect(result.errors).toContain('logToConsole must be a boolean');
      expect(result.errors).toContain('writeToFile must be a boolean');
      expect(result.errors).toContain('minDuration must be a number >= 0');
    });
  });

  describe('URL validation edge cases', () => {
    it('should accept valid URL formats', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com/path',
        'https://example.com:8080/path?query=value',
        'https://user:pass@example.com',
        'https://127.0.0.1:8080'
      ];

      validUrls.forEach(url => {
        const config = {
          baseUrl: url,
          maxPages: 10,
          timeout: 30000,
          ignorePatterns: [],
          ignoreExtensions: [],
          screenshots: false
        };

        const result = ConfigValidator.validateCrawlConfig(config);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com',
        'mailto:test@example.com',
        'file:///path/to/file',
        '',
        'http://',
        'https://',
        'example.com'
      ];

      invalidUrls.forEach(url => {
        const config = {
          baseUrl: url,
          maxPages: 10,
          timeout: 30000
        };

        const result = ConfigValidator.validateCrawlConfig(config);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('baseUrl must be a valid URL');
      });
    });
  });
});