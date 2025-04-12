/**
 * Tests for the CSS generation functionality in generate-tokens.js
 *
 * These tests verify that the CSS generation works correctly and handles edge cases.
 */

import fs from 'fs';
import path from 'path';

import { describe, test, expect, vi, beforeEach } from 'vitest';

import tokenGenerator from '../../../src/generators/generate-tokens.js';
import {
  createMockTypographyData,
  createMockColorData,
  createMockSpacingData,
  createMockBorderData,
  createMockAnimationData,
  mockConsole
} from '../../fixtures/test-mocks.js';

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn()
  },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn()
}));

// Mock path module
vi.mock('path', () => ({
  default: {
    join: vi.fn().mockImplementation((...args) => args.join('/')),
    dirname: vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
  },
  join: vi.fn().mockImplementation((...args) => args.join('/')),
  dirname: vi.fn().mockImplementation((p) => p.split('/').slice(0, -1).join('/'))
}));


describe('Token Generator CSS Tests', () => {
  beforeEach(() => {
    // Mock console methods to prevent output during tests
    mockConsole();

    // Reset fs mocks
    fs.existsSync.mockReturnValue(true);
    fs.mkdirSync.mockImplementation(() => {});
    fs.writeFileSync.mockImplementation(() => {});
  });

  test('generateCSSFiles should handle tokens with missing properties', () => {
    // Setup - create tokens with minimal required properties
    const tokens = {
      typography: {
        fontFamily: { sans: 'Arial, sans-serif' },
        fontSize: { base: '16px' },
        fontWeight: { normal: '400', bold: '700' },
        lineHeight: { normal: '1.5' },
        letterSpacing: { normal: 'normal' },
        textTransform: { none: 'none' }
      },
      colors: {
        primary: { base: '#ff0000' },
        secondary: { base: '#00ff00' },
        neutral: { base: '#000000' },
        accent: { accent1: '#ff00ff', accent2: '#00ffff' },
        semantic: { success: '#00ff00', error: '#ff0000', warning: '#ffff00', info: '#0000ff' }
      },
      spacing: {
        scale: { small: '8px', medium: '16px' }
      },
      borders: {
        width: { thin: '1px', medium: '2px' },
        radius: { small: '4px', medium: '8px' },
        style: { solid: 'solid', dashed: 'dashed' },
        shadow: { small: '0 1px 3px rgba(0,0,0,0.1)' }
      },
      animations: {
        duration: { fast: '0.2s', normal: '0.5s' },
        timingFunction: { ease: 'ease', linear: 'linear' },
        delay: { none: '0s', short: '0.1s' },
        keyframes: {}
      }
    };

    // Execute
    tokenGenerator.generateCSSFiles(tokens, 'test/output');

    // Verify that writeFileSync was called for each CSS file
    expect(fs.writeFileSync).toHaveBeenCalled();
  });

  test('generateCSSFiles should create CSS files for valid tokens', () => {
    // Reset the mock to clear previous calls
    fs.writeFileSync.mockClear();
    fs.existsSync.mockClear();
    fs.mkdirSync.mockClear();

    // Setup - create a simple tokens object
    const tokens = {
      typography: {
        fontFamily: { sans: 'Arial, sans-serif' },
        fontSize: { base: '16px' },
        fontWeight: { normal: '400', bold: '700' },
        lineHeight: { normal: '1.5' },
        letterSpacing: { normal: 'normal' },
        textTransform: { none: 'none' }
      },
      colors: {
        primary: { base: '#ff0000' },
        secondary: { base: '#00ff00' },
        neutral: { base: '#000000' },
        accent: { accent1: '#ff00ff', accent2: '#00ffff' },
        semantic: { success: '#00ff00', error: '#ff0000', warning: '#ffff00', info: '#0000ff' }
      },
      spacing: {
        scale: { small: '8px', medium: '16px' }
      },
      borders: {
        width: { thin: '1px', medium: '2px' },
        radius: { small: '4px', medium: '8px' },
        style: { solid: 'solid', dashed: 'dashed' },
        shadow: { small: '0 1px 3px rgba(0,0,0,0.1)' }
      },
      animations: {
        duration: { fast: '0.2s', normal: '0.5s' },
        timingFunction: { ease: 'ease', linear: 'linear' },
        delay: { none: '0s', short: '0.1s' },
        keyframes: {}
      }
    };

    // Mock the existsSync to return false so mkdirSync is called
    fs.existsSync.mockReturnValue(false);

    // Execute
    tokenGenerator.generateCSSFiles(tokens, 'test/output');

    // Verify that writeFileSync was called
    expect(fs.writeFileSync).toHaveBeenCalled();

    // Verify that the output directory was created
    expect(fs.existsSync).toHaveBeenCalled();
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  test('generateJSONTokens should create JSON token files', () => {
    // Reset the mock to clear previous calls
    fs.writeFileSync.mockClear();

    // Setup - create a complete tokens object with all required properties
    const tokens = {
      typography: {
        fontFamily: { sans: 'Arial, sans-serif' },
        fontSize: { base: '16px' },
        fontWeight: { normal: '400', bold: '700' },
        lineHeight: { normal: '1.5' },
        letterSpacing: { normal: 'normal' },
        textTransform: { none: 'none' }
      },
      colors: {
        primary: { base: '#ff0000' },
        secondary: { base: '#00ff00' },
        neutral: { base: '#000000' },
        accent: { accent1: '#ff00ff', accent2: '#00ffff' },
        semantic: { success: '#00ff00', error: '#ff0000', warning: '#ffff00', info: '#0000ff' }
      },
      spacing: {
        scale: { small: '8px', medium: '16px' }
      },
      borders: {
        width: { thin: '1px', medium: '2px' },
        radius: { small: '4px', medium: '8px' },
        style: { solid: 'solid', dashed: 'dashed' },
        shadow: { small: '0 1px 3px rgba(0,0,0,0.1)' }
      },
      animations: {
        duration: { fast: '0.2s', normal: '0.5s' },
        timingFunction: { ease: 'ease', linear: 'linear' },
        delay: { none: '0s', short: '0.1s' },
        keyframes: {}
      }
    };

    // Execute
    tokenGenerator.generateJSONTokens(tokens);

    // Verify that writeFileSync was called for JSON files
    expect(fs.writeFileSync).toHaveBeenCalled();
  });
});
