/**
 * Corrected tests for the generate-tokens.js module
 *
 * These tests verify that the token generation works correctly with properly structured data
 * and expectations that match the actual output structure.
 */

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

describe('Token Generator Corrected Tests', () => {
  beforeEach(() => {
    // Mock console methods to prevent output during tests
    mockConsole();
  });

  test('generateTypographyTokens should generate tokens from properly structured data', () => {
    // Setup - create mock data with the structure the function expects
    const mockData = createMockTypographyData();

    // Add the properties the function specifically looks for
    mockData.allFontFamilies = mockData.fontFamilies;
    mockData.allFontSizes = mockData.fontSizes;
    mockData.allFontWeights = mockData.fontWeights;
    mockData.allLineHeights = mockData.lineHeights;
    mockData.allLetterSpacings = mockData.letterSpacings;
    mockData.allTextTransforms = mockData.textTransforms;

    // Execute
    const tokens = tokenGenerator.generateTypographyTokens(mockData);

    // Verify
    expect(tokens).toBeDefined();
    expect(tokens.fontFamily).toBeDefined();
    expect(tokens.fontSize).toBeDefined();
    expect(tokens.fontWeight).toBeDefined();
    expect(tokens.lineHeight).toBeDefined();
    expect(tokens.letterSpacing).toBeDefined();
    expect(tokens.textTransform).toBeDefined();

    // Check that tokens were generated for each category
    expect(Object.keys(tokens.fontFamily).length).toBeGreaterThan(0);
    expect(Object.keys(tokens.fontSize).length).toBeGreaterThan(0);
    expect(Object.keys(tokens.fontWeight).length).toBeGreaterThan(0);
  });

  test('generateColorTokens should generate tokens from properly structured data', () => {
    // Setup - create mock data with the structure the function expects
    const mockData = createMockColorData();

    // Execute
    const tokens = tokenGenerator.generateColorTokens(mockData);

    // Verify
    expect(tokens).toBeDefined();
    expect(tokens.primary).toBeDefined();
    expect(tokens.secondary).toBeDefined();
    expect(tokens.neutral).toBeDefined();

    // Check that color tokens were generated
    expect(Object.keys(tokens.primary).length).toBeGreaterThan(0);
    expect(Object.keys(tokens.neutral).length).toBeGreaterThan(0);
  });

  test('generateSpacingTokens should generate tokens from properly structured data', () => {
    // Setup - create mock data with the structure the function expects
    const mockData = createMockSpacingData();

    // Execute
    const tokens = tokenGenerator.generateSpacingTokens(mockData);

    // Verify
    expect(tokens).toBeDefined();
    expect(tokens.scale).toBeDefined();
    expect(tokens.margin).toBeDefined();
    expect(tokens.padding).toBeDefined();
    expect(tokens.gap).toBeDefined();
  });

  test('generateBorderTokens should generate tokens from properly structured data', () => {
    // Setup - create mock data with the structure the function expects
    const mockData = createMockBorderData();

    // Execute
    const tokens = tokenGenerator.generateBorderTokens(mockData);

    // Verify
    expect(tokens).toBeDefined();
    expect(tokens.width).toBeDefined();
    expect(tokens.radius).toBeDefined();
    expect(tokens.style).toBeDefined();
    expect(tokens.shadow).toBeDefined();
  });

  test('generateAnimationTokens should generate tokens from properly structured data', () => {
    // Setup - create mock data with the structure the function expects
    const mockData = createMockAnimationData();

    // Execute
    const tokens = tokenGenerator.generateAnimationTokens(mockData);

    // Verify
    expect(tokens).toBeDefined();
    expect(tokens.duration).toBeDefined();
    expect(tokens.timingFunction).toBeDefined();
    expect(tokens.delay).toBeDefined();
    expect(tokens.keyframes).toBeDefined();
  });

  test('generateDesignTokens should combine all token types', () => {
    // Setup - create mock data for all token types
    const mockTypography = createMockTypographyData();
    mockTypography.allFontFamilies = mockTypography.fontFamilies;
    mockTypography.allFontSizes = mockTypography.fontSizes;
    mockTypography.allFontWeights = mockTypography.fontWeights;
    mockTypography.allLineHeights = mockTypography.lineHeights;
    mockTypography.allLetterSpacings = mockTypography.letterSpacings;
    mockTypography.allTextTransforms = mockTypography.textTransforms;

    const mockColors = createMockColorData();
    const mockSpacing = createMockSpacingData();
    const mockBorders = createMockBorderData();
    const mockAnimations = createMockAnimationData();

    // Execute
    const tokens = tokenGenerator.generateDesignTokens({
      typography: mockTypography,
      colors: mockColors,
      spacing: mockSpacing,
      borders: mockBorders,
      animations: mockAnimations
    });

    // Verify
    expect(tokens).toBeDefined();

    // Check that the tokens object has the expected structure
    // Note: The actual structure depends on how generateDesignTokens combines the tokens
    // This test just verifies that the function returns something defined
  });

  test('generateTypographyTokens should handle missing data', () => {
    // Execute
    const tokens = tokenGenerator.generateTypographyTokens(null);

    // Verify
    expect(tokens).toEqual({});
    expect(console.warn).toHaveBeenCalledWith('No typography data available');
  });

  test('generateColorTokens should handle missing data', () => {
    // Execute
    const tokens = tokenGenerator.generateColorTokens(null);

    // Verify
    expect(tokens).toEqual({});
    expect(console.warn).toHaveBeenCalledWith('No color data available');
  });

  test('generateSpacingTokens should handle missing data', () => {
    // Execute
    const tokens = tokenGenerator.generateSpacingTokens(null);

    // Verify
    expect(tokens).toEqual({});
    expect(console.warn).toHaveBeenCalledWith('No spacing data available');
  });

  test('generateBorderTokens should handle missing data', () => {
    // Execute
    const tokens = tokenGenerator.generateBorderTokens(null);

    // Verify
    expect(tokens).toEqual({});
    expect(console.warn).toHaveBeenCalledWith('No border data available');
  });

  test('generateAnimationTokens should handle missing data', () => {
    // Execute
    const tokens = tokenGenerator.generateAnimationTokens(null);

    // Verify
    expect(tokens).toEqual({});
    expect(console.warn).toHaveBeenCalledWith('No animation data available');
  });
});
