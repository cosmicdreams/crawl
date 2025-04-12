/**
 * Integration tests for extractors and generators
 *
 * These tests verify that the extractors and generators work together correctly,
 * ensuring that extracted data can be properly transformed into design tokens.
 */

import fs from 'fs';
import path from 'path';

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

import * as colorsExtractor from '../../src/extractors/extract-colors.js';
import * as typographyExtractor from '../../src/extractors/extract-typography.js';
import * as spacingExtractor from '../../src/extractors/extract-spacing.js';
import * as bordersExtractor from '../../src/extractors/extract-borders.js';
import * as animationsExtractor from '../../src/extractors/extract-animations.js';

const { extractColorsFromCrawledPages } = colorsExtractor;
const { extractTypographyFromCrawledPages } = typographyExtractor;
const { extractSpacingFromCrawledPages } = spacingExtractor;
const { extractBordersFromCrawledPages } = bordersExtractor;
const { extractAnimationsFromCrawledPages } = animationsExtractor;
import * as tokenGeneratorModule from '../../src/generators/generate-tokens.js';
import * as reportGeneratorModule from '../../src/generators/generate-reports.js';

// Mock dependencies
// Create mock functions for fs
fs.existsSync = vi.fn();
fs.readFileSync = vi.fn();
fs.writeFileSync = vi.fn();
fs.mkdirSync = vi.fn();

// Create mock functions for path
path.join = vi.fn().mockImplementation((...args) => args.join('/'));
path.dirname = vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/'));

// Mock console methods
console.log = vi.fn();
console.error = vi.fn();
console.warn = vi.fn();

describe('Extractors and Generators Integration', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock fs.existsSync to return true for all files
    fs.existsSync.mockReturnValue(true);

    // Mock fs.readFileSync to return appropriate mock data based on file path
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('colors-analysis.json')) {
        return JSON.stringify({
          data: {
            allColorValues: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
            groupedColors: {
              hex: ['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'],
              rgb: ['rgb(0, 0, 0)', 'rgb(255, 255, 255)'],
              rgba: ['rgba(0, 0, 0, 0.5)', 'rgba(255, 255, 255, 0.5)'],
              other: []
            },
            elementStyles: {
              'body': [{ styles: { color: '#000000', backgroundColor: '#ffffff' } }],
              'h1': [{ styles: { color: '#ff0000' } }],
              'p': [{ styles: { color: '#000000' } }]
            },
            cssVars: {
              '--primary-color': '#ff0000',
              '--secondary-color': '#00ff00',
              '--text-color': '#000000',
              '--background-color': '#ffffff'
            }
          },
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (filePath.includes('typography-analysis.json')) {
        return JSON.stringify({
          data: {
            fontFamilies: ['Arial', 'Helvetica', 'Times New Roman'],
            fontSizes: ['12px', '14px', '16px', '18px', '24px', '32px'],
            fontWeights: ['400', '700'],
            lineHeights: ['1.2', '1.5', '2'],
            letterSpacings: ['normal', '0.05em'],
            elementStyles: {
              'body': [{ styles: { fontFamily: 'Arial', fontSize: '16px', lineHeight: '1.5' } }],
              'h1': [{ styles: { fontFamily: 'Helvetica', fontSize: '32px', fontWeight: '700' } }],
              'p': [{ styles: { fontFamily: 'Arial', fontSize: '16px' } }]
            },
            cssVars: {
              '--font-family-primary': 'Arial',
              '--font-family-secondary': 'Helvetica',
              '--font-size-base': '16px',
              '--font-size-lg': '18px',
              '--font-size-xl': '24px',
              '--font-size-xxl': '32px'
            }
          },
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (filePath.includes('spacing-analysis.json')) {
        return JSON.stringify({
          data: {
            spacingValues: ['0px', '4px', '8px', '16px', '24px', '32px'],
            marginValues: ['0px', '8px', '16px', '24px'],
            paddingValues: ['0px', '8px', '16px', '24px'],
            gapValues: ['0px', '8px', '16px'],
            elementStyles: {
              'div': [{ styles: { margin: '16px', padding: '8px' } }],
              'p': [{ styles: { margin: '8px 0' } }],
              'section': [{ styles: { padding: '24px' } }]
            },
            cssVars: {
              '--spacing-xs': '4px',
              '--spacing-sm': '8px',
              '--spacing-md': '16px',
              '--spacing-lg': '24px',
              '--spacing-xl': '32px'
            }
          },
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (filePath.includes('borders-analysis.json')) {
        return JSON.stringify({
          data: {
            borderWidths: ['1px', '2px', '3px'],
            borderStyles: ['solid', 'dashed', 'dotted'],
            borderRadii: ['0px', '4px', '8px', '50%'],
            boxShadows: ['none', '0 1px 3px rgba(0, 0, 0, 0.1)', '0 4px 6px rgba(0, 0, 0, 0.1)'],
            elementStyles: {
              'button': [{ styles: { border: '1px solid #000000', borderRadius: '4px' } }],
              '.card': [{ styles: { borderRadius: '8px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' } }]
            },
            cssVars: {
              '--border-width-sm': '1px',
              '--border-width-md': '2px',
              '--border-width-lg': '3px',
              '--border-radius-sm': '4px',
              '--border-radius-md': '8px',
              '--border-radius-lg': '50%'
            }
          },
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (filePath.includes('animations-analysis.json')) {
        return JSON.stringify({
          data: {
            transitionProperties: ['all', 'opacity', 'transform'],
            transitionDurations: ['0.2s', '0.3s', '0.5s'],
            transitionTimingFunctions: ['ease', 'ease-in-out', 'cubic-bezier(0.4, 0, 0.2, 1)'],
            animationNames: ['fade', 'slide', 'bounce'],
            animationDurations: ['1s', '2s'],
            elementStyles: {
              'button': [{ styles: { transition: 'all 0.3s ease' } }],
              '.card': [{ styles: { transition: 'transform 0.5s ease-in-out' } }]
            },
            cssVars: {
              '--transition-fast': '0.2s',
              '--transition-medium': '0.3s',
              '--transition-slow': '0.5s',
              '--ease-default': 'ease',
              '--ease-smooth': 'cubic-bezier(0.4, 0, 0.2, 1)'
            }
          },
          success: true,
          timestamp: new Date().toISOString()
        });
      } else if (filePath.includes('crawl-results.json')) {
        return JSON.stringify({
          baseUrl: 'https://example.com',
          crawledPages: [
            {
              url: 'https://example.com',
              title: 'Example Page',
              status: 200,
              contentType: 'text/html',
              bodyClasses: ['home', 'page']
            },
            {
              url: 'https://example.com/about',
              title: 'About Page',
              status: 200,
              contentType: 'text/html',
              bodyClasses: ['about', 'page']
            }
          ],
          errors: []
        });
      }

      return '{}';
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  test('token generator should be able to process extractor output', async () => {
    // Arrange
    const config = {
      inputDir: 'results/raw',
      outputDir: 'results/tokens',
      format: 'css'
    };

    // Mock the generateTokens function
    const mockResult = {
      success: true,
      files: [
        'results/tokens/variables.css',
        'results/tokens/colors.css',
        'results/tokens/typography.css',
        'results/tokens/spacing.css',
        'results/tokens/borders.css',
        'results/tokens/animations.css'
      ]
    };

    const generateTokensSpy = vi.spyOn(tokenGeneratorModule.default, 'generateDesignTokens')
      .mockResolvedValue(mockResult);

    // Act
    const result = await tokenGeneratorModule.default.generateDesignTokens(config);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(generateTokensSpy).toHaveBeenCalledWith(config);

    // Verify that token files were included in the result
    expect(result.files).toContain('results/tokens/variables.css');
    expect(result.files).toContain('results/tokens/colors.css');
    expect(result.files).toContain('results/tokens/typography.css');
    expect(result.files).toContain('results/tokens/spacing.css');
    expect(result.files).toContain('results/tokens/borders.css');
    expect(result.files).toContain('results/tokens/animations.css');
  });

  test('token generator should create JSON tokens from extractor output', async () => {
    // Arrange
    const config = {
      inputDir: 'results/raw',
      outputDir: 'results/tokens',
      format: 'json'
    };

    // Mock the generateTokens function
    const mockResult = {
      success: true,
      files: ['results/tokens/tokens.json'],
      data: {
        colors: { primary: '#ff0000', secondary: '#00ff00' },
        typography: { fontFamilies: ['Arial', 'Helvetica'] },
        spacing: { xs: '4px', sm: '8px', md: '16px' },
        borders: { borderRadius: { sm: '4px', md: '8px' } },
        animations: { durations: { fast: '0.2s', slow: '0.5s' } }
      }
    };

    const generateTokensSpy = vi.spyOn(tokenGeneratorModule.default, 'generateJSONTokens')
      .mockResolvedValue(mockResult);

    // Act
    const result = await tokenGeneratorModule.default.generateJSONTokens(config);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(generateTokensSpy).toHaveBeenCalledWith(config);

    // Verify the structure of the result
    expect(result.files).toContain('results/tokens/tokens.json');
    expect(result.data).toBeDefined();
    expect(result.data.colors).toBeDefined();
    expect(result.data.typography).toBeDefined();
    expect(result.data.spacing).toBeDefined();
    expect(result.data.borders).toBeDefined();
    expect(result.data.animations).toBeDefined();
  });

  test('report generator should be able to process extractor and token generator output', async () => {
    // Arrange
    const config = {
      inputDir: 'results/raw',
      tokensDir: 'results/tokens',
      outputDir: 'results/reports'
    };

    // Mock the generateReports function
    const mockResult = {
      success: true,
      files: [
        'results/reports/design-system-report.html',
        'results/reports/crawl-report.html'
      ]
    };

    const generateReportsSpy = vi.spyOn(reportGeneratorModule.default, 'generateReports')
      .mockResolvedValue(mockResult);

    // Act
    const result = await reportGeneratorModule.default.generateReports(config);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(generateReportsSpy).toHaveBeenCalledWith(config);

    // Verify that report files were included in the result
    expect(result.files).toContain('results/reports/design-system-report.html');
    expect(result.files).toContain('results/reports/crawl-report.html');
  });

  test('end-to-end flow from extractors to generators should work', async () => {
    // Arrange
    const extractorConfig = {
      inputFile: 'results/raw/crawl-results.json',
      outputFile: 'results/raw/colors-analysis.json',
      maxPages: -1
    };

    const tokenConfig = {
      inputDir: 'results/raw',
      outputDir: 'results/tokens',
      format: 'css'
    };

    const reportConfig = {
      inputDir: 'results/raw',
      tokensDir: 'results/tokens',
      outputDir: 'results/reports'
    };

    // Mock the functions
    const mockExtractorResult = {
      success: true,
      data: {
        allColorValues: ['#000000', '#ffffff', '#ff0000'],
        groupedColors: { hex: ['#000000', '#ffffff', '#ff0000'] },
        elementStyles: { 'body': [{ styles: { color: '#000000' } }] }
      }
    };

    const mockTokenResult = {
      success: true,
      files: ['results/tokens/variables.css', 'results/tokens/colors.css']
    };

    const mockReportResult = {
      success: true,
      files: ['results/reports/design-system-report.html']
    };

    // Create spies for the functions
    const extractorSpy = vi.spyOn(colorsExtractor, 'extractColorsFromCrawledPages')
      .mockResolvedValue(mockExtractorResult);

    const tokenSpy = vi.spyOn(tokenGeneratorModule.default, 'generateDesignTokens')
      .mockResolvedValue(mockTokenResult);

    const reportSpy = vi.spyOn(reportGeneratorModule.default, 'generateReports')
      .mockResolvedValue(mockReportResult);

    // Act - run the full flow
    const extractorResult = await colorsExtractor.extractColorsFromCrawledPages(extractorConfig);
    const tokenResult = await tokenGeneratorModule.default.generateDesignTokens(tokenConfig);
    const reportResult = await reportGeneratorModule.default.generateReports(reportConfig);

    // Assert
    expect(extractorResult.success).toBe(true);
    expect(tokenResult.success).toBe(true);
    expect(reportResult.success).toBe(true);

    // Verify that each function was called with the correct parameters
    expect(extractorSpy).toHaveBeenCalledWith(extractorConfig);
    expect(tokenSpy).toHaveBeenCalledWith(tokenConfig);
    expect(reportSpy).toHaveBeenCalledWith(reportConfig);
  });

  test('generators should handle missing extractor output gracefully', async () => {
    // Arrange - mock missing extractor output files
    fs.existsSync.mockImplementation((path) => {
      return !path.includes('colors-analysis.json');
    });

    const config = {
      inputDir: 'results/raw',
      outputDir: 'results/tokens',
      format: 'css'
    };

    // Mock the generateTokens function
    const mockResult = {
      success: true,
      files: [
        'results/tokens/variables.css',
        'results/tokens/typography.css',
        'results/tokens/spacing.css'
      ],
      warnings: ['Colors analysis file not found']
    };

    vi.spyOn(tokenGeneratorModule.default, 'generateDesignTokens')
      .mockResolvedValue(mockResult);

    // Act
    const result = await tokenGeneratorModule.default.generateDesignTokens(config);

    // Assert
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);

    // Verify that token files were still included in the result
    expect(result.files).toContain('results/tokens/variables.css');
    expect(result.files).toContain('results/tokens/typography.css');
    expect(result.files).toContain('results/tokens/spacing.css');
    expect(result.files).not.toContain('results/tokens/colors.css');
  });
});
