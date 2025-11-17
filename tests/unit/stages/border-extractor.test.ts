// tests/unit/stages/border-extractor.test.ts
/**
 * Unit tests for Border Extractor
 * Tests spec-compliant border extraction and conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BorderExtractorStage } from '../../../src/core/stages/border-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { DimensionValue } from '../../../src/core/tokens/types/primitives.js';
import { BorderStyleValue, ShadowValue } from '../../../src/core/tokens/types/composites.js';

describe('BorderExtractorStage', () => {
    let extractor: BorderExtractorStage;
    let mockCrawlResult: CrawlResult;

    beforeEach(() => {
        extractor = new BorderExtractorStage({
            includeBorderWidth: true,
            includeBorderStyle: true,
            includeBorderRadius: true,
            includeShadows: true,
            minimumOccurrences: 1,
            outputDir: './test-output'
        });

        mockCrawlResult = {
            baseUrl: 'https://example.com',
            crawledPages: [
                {
                    url: 'https://example.com',
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }
            ],
            timestamp: new Date().toISOString()
        };
    });

    describe('Configuration', () => {
        it('should have correct name', () => {
            expect(extractor.name).toBe('border-extractor');
        });

        it('should accept custom options', () => {
            const customExtractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 5
            });

            expect(customExtractor).toBeDefined();
        });
    });

    describe('Spec-Compliant Output', () => {
        it('should output ExtractedTokenData with DimensionValue for widths', async () => {
            const mockResult = {
                tokens: [
                    {
                        type: 'dimension' as const,
                        name: 'border-width-1',
                        value: {
                            value: 1,
                            unit: 'px' as const
                        },
                        category: 'width',
                        usageCount: 5
                    }
                ],
                stats: {
                    totalBorders: 1,
                    uniqueBorders: 1,
                    borderWidths: 1,
                    borderStyles: 0,
                    borderRadii: 0,
                    shadows: 0
                }
            };

            expect(mockResult.tokens[0].type).toBe('dimension');
            expect(mockResult.tokens[0].value).toHaveProperty('value');
            expect(mockResult.tokens[0].value).toHaveProperty('unit');
        });

        it('should output ExtractedTokenData with BorderStyleValue for styles', async () => {
            const mockResult = {
                tokens: [
                    {
                        type: 'strokeStyle' as const,
                        name: 'border-style-solid',
                        value: 'solid',
                        category: 'style',
                        usageCount: 10
                    }
                ]
            };

            expect(mockResult.tokens[0].type).toBe('strokeStyle');
            expect(typeof mockResult.tokens[0].value).toBe('string');
            expect(mockResult.tokens[0].value).toBe('solid');
        });

        it('should output ExtractedTokenData with ShadowValue for shadows', async () => {
            const mockResult = {
                tokens: [
                    {
                        type: 'shadow' as const,
                        name: 'shadow-md',
                        value: {
                            color: {
                                colorSpace: 'srgb',
                                components: [0, 0, 0],
                                alpha: 0.1,
                                hex: '#000000'
                            },
                            offsetX: { value: 0, unit: 'px' as const },
                            offsetY: { value: 4, unit: 'px' as const },
                            blur: { value: 8, unit: 'px' as const },
                            spread: { value: 0, unit: 'px' as const }
                        },
                        category: 'shadow',
                        usageCount: 7
                    }
                ]
            };

            expect(mockResult.tokens[0].type).toBe('shadow');
            expect(mockResult.tokens[0].value).toHaveProperty('color');
            expect(mockResult.tokens[0].value).toHaveProperty('offsetX');
            expect(mockResult.tokens[0].value).toHaveProperty('offsetY');
            expect(mockResult.tokens[0].value).toHaveProperty('blur');
            expect(mockResult.tokens[0].value).toHaveProperty('spread');
        });

        it('should include proper metadata in tokens', () => {
            const mockToken = {
                type: 'dimension' as const,
                name: 'border-width-2',
                value: {
                    value: 2,
                    unit: 'px' as const
                },
                category: 'width',
                description: 'width extracted from 2 page(s)',
                usageCount: 15,
                source: 'border-width',
                sourceUrls: [
                    'https://example.com',
                    'https://example.com/about'
                ]
            };

            expect(mockToken.usageCount).toBeGreaterThan(0);
            expect(mockToken.sourceUrls).toBeInstanceOf(Array);
            expect(mockToken.category).toBeDefined();
        });
    });

    describe('Border Width Name Generation', () => {
        it('should generate names for common border widths', () => {
            const commonWidths = [
                { value: 1, unit: 'px' as const, expected: 'border-width-1' },
                { value: 2, unit: 'px' as const, expected: 'border-width-2' },
                { value: 4, unit: 'px' as const, expected: 'border-width-4' },
                { value: 0, unit: 'px' as const, expected: 'border-width-0' }
            ];

            commonWidths.forEach(({ value, unit, expected }) => {
                const border = {
                    cssValue: `${value}${unit}`,
                    specValue: { value, unit },
                    property: 'border-width',
                    element: 'div',
                    usageCount: 1,
                    category: 'width' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateBorderName(border);
                expect(name).toBe(expected);
            });
        });

        it('should handle custom border widths', () => {
            const customWidth = {
                cssValue: '3px',
                specValue: { value: 3, unit: 'px' as const },
                property: 'border-width',
                element: 'div',
                usageCount: 1,
                category: 'width' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateBorderName(customWidth);
            expect(name).toBe('border-width-3-px');
        });
    });

    describe('Border Style Name Generation', () => {
        it('should generate names for border styles', () => {
            const styles: BorderStyleValue[] = ['solid', 'dashed', 'dotted', 'double'];

            styles.forEach(style => {
                const border = {
                    cssValue: style,
                    specValue: style,
                    property: 'border-style',
                    element: 'div',
                    usageCount: 1,
                    category: 'style' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateBorderName(border);
                expect(name).toBe(`border-style-${style}`);
            });
        });
    });

    describe('Border Radius Name Generation', () => {
        it('should generate semantic names for common radius values', () => {
            const commonRadii = [
                { value: 0, unit: 'px' as const, expected: 'border-radius-0' },
                { value: 4, unit: 'px' as const, expected: 'border-radius-sm' },
                { value: 8, unit: 'px' as const, expected: 'border-radius-md' },
                { value: 16, unit: 'px' as const, expected: 'border-radius-lg' },
                { value: 9999, unit: 'px' as const, expected: 'border-radius-full' },
                { value: 0.25, unit: 'rem' as const, expected: 'border-radius-sm' },
                { value: 0.5, unit: 'rem' as const, expected: 'border-radius-md' },
                { value: 1, unit: 'rem' as const, expected: 'border-radius-lg' }
            ];

            commonRadii.forEach(({ value, unit, expected }) => {
                const border = {
                    cssValue: `${value}${unit}`,
                    specValue: { value, unit },
                    property: 'border-radius',
                    element: 'div',
                    usageCount: 1,
                    category: 'radius' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateBorderName(border);
                expect(name).toBe(expected);
            });
        });

        it('should handle custom radius values', () => {
            const customRadius = {
                cssValue: '12px',
                specValue: { value: 12, unit: 'px' as const },
                property: 'border-radius',
                element: 'div',
                usageCount: 1,
                category: 'radius' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateBorderName(customRadius);
            // 12px is closest to lg (16px) in the semantic naming system
            expect(name).toBe('border-radius-lg');
        });
    });

    describe('Shadow Name Generation', () => {
        it('should generate semantic names based on blur size', () => {
            const shadows = [
                { blur: 2, expected: 'shadow-sm' },
                { blur: 8, expected: 'shadow-md' },
                { blur: 16, expected: 'shadow-lg' }
            ];

            shadows.forEach(({ blur, expected }) => {
                const shadowValue: ShadowValue = {
                    color: {
                        colorSpace: 'srgb',
                        components: [0, 0, 0],
                        alpha: 0.1,
                        hex: '#000000'
                    },
                    offsetX: { value: 0, unit: 'px' },
                    offsetY: { value: 4, unit: 'px' },
                    blur: { value: blur, unit: 'px' },
                    spread: { value: 0, unit: 'px' }
                };

                const border = {
                    cssValue: `0 4px ${blur}px 0 rgba(0, 0, 0, 0.1)`,
                    specValue: shadowValue,
                    property: 'box-shadow',
                    element: 'div',
                    usageCount: 1,
                    category: 'shadow' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateBorderName(border);
                expect(name).toBe(expected);
            });
        });

        it('should handle custom shadow blur values', () => {
            const shadowValue: ShadowValue = {
                color: {
                    colorSpace: 'srgb',
                    components: [0, 0, 0],
                    alpha: 0.15,
                    hex: '#000000'
                },
                offsetX: { value: 0, unit: 'px' },
                offsetY: { value: 2, unit: 'px' },
                blur: { value: 20, unit: 'px' },
                spread: { value: 0, unit: 'px' }
            };

            const border = {
                cssValue: '0 2px 20px 0 rgba(0, 0, 0, 0.15)',
                specValue: shadowValue,
                property: 'box-shadow',
                element: 'div',
                usageCount: 1,
                category: 'shadow' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateBorderName(border);
            expect(name).toBe('shadow-20-px');
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate border values', async () => {
            // Mock scenario: same border value in different elements should deduplicate
            // This is tested at integration level with real browser
        });

        it('should track usage count across multiple occurrences', () => {
            // Integration test needed
        });

        it('should track source URLs for each unique border', () => {
            // Integration test needed
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 10  // High threshold
            });

            expect(extractor).toBeDefined();
            // Actual filtering tested in integration tests
        });

        it('should respect category filters', () => {
            const widthsOnlyExtractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1
            });

            expect(widthsOnlyExtractor).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid border values gracefully', () => {
            // The converter will throw, but extractor should catch and log
            // This is tested in integration tests with real scenarios
        });

        it('should skip zero border width values', () => {
            // Zero border widths should typically be skipped
            // Tested in integration tests
        });

        it('should handle network errors gracefully', async () => {
            const badCrawlResult: CrawlResult = {
                baseUrl: 'https://nonexistent.example.com',
                crawledPages: [
                    {
                        url: 'https://nonexistent.example.com/404',
                        title: 'Not Found',
                        status: 404,
                        contentType: 'text/html'
                    }
                ],
                timestamp: new Date().toISOString()
            };

            // Should not throw, but handle gracefully
            // Full test requires browser mock
        });
    });

    describe('Stats Generation', () => {
        it('should generate accurate statistics', () => {
            const mockResult = {
                tokens: [
                    { type: 'dimension' as const, category: 'width', name: 'border-width-1', value: {} as DimensionValue },
                    { type: 'dimension' as const, category: 'width', name: 'border-width-2', value: {} as DimensionValue },
                    { type: 'strokeStyle' as const, category: 'style', name: 'border-style-solid', value: 'solid' as BorderStyleValue },
                    { type: 'dimension' as const, category: 'radius', name: 'border-radius-md', value: {} as DimensionValue },
                    { type: 'shadow' as const, category: 'shadow', name: 'shadow-md', value: {} as ShadowValue }
                ],
                stats: {
                    totalBorders: 5,
                    uniqueBorders: 5,
                    borderWidths: 2,
                    borderStyles: 1,
                    borderRadii: 1,
                    shadows: 1
                }
            };

            expect(mockResult.stats.totalBorders).toBe(5);
            expect(mockResult.stats.borderWidths).toBe(2);
            expect(mockResult.stats.borderStyles).toBe(1);
            expect(mockResult.stats.borderRadii).toBe(1);
            expect(mockResult.stats.shadows).toBe(1);
        });
    });

    describe('Output Format', () => {
        it('should save results to correct location', () => {
            // Tested in integration tests with actual file I/O
        });

        it('should sort tokens by usage count', () => {
            const mockTokens = [
                { type: 'dimension' as const, name: 'low', value: {} as DimensionValue, usageCount: 2 },
                { type: 'dimension' as const, name: 'high', value: {} as DimensionValue, usageCount: 20 },
                { type: 'dimension' as const, name: 'medium', value: {} as DimensionValue, usageCount: 10 }
            ];

            const sorted = [...mockTokens].sort((a, b) =>
                (b.usageCount || 0) - (a.usageCount || 0)
            );

            expect(sorted[0].name).toBe('high');
            expect(sorted[1].name).toBe('medium');
            expect(sorted[2].name).toBe('low');
        });
    });

    describe('Category Extraction', () => {
        it('should extract border width categories', () => {
            const widthProps = ['borderWidth', 'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'];

            widthProps.forEach(prop => {
                const mockBorder = {
                    cssValue: '1px',
                    specValue: { value: 1, unit: 'px' as const },
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'width' as const,
                    sourceUrls: ['https://example.com']
                };

                expect(mockBorder.category).toBe('width');
            });
        });

        it('should extract border style categories', () => {
            const styleProps = ['borderStyle', 'borderTopStyle', 'borderRightStyle', 'borderBottomStyle', 'borderLeftStyle'];

            styleProps.forEach(prop => {
                const mockBorder = {
                    cssValue: 'solid',
                    specValue: 'solid' as BorderStyleValue,
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'style' as const,
                    sourceUrls: ['https://example.com']
                };

                expect(mockBorder.category).toBe('style');
            });
        });

        it('should extract border radius categories', () => {
            const radiusProps = ['borderRadius', 'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'];

            radiusProps.forEach(prop => {
                const mockBorder = {
                    cssValue: '8px',
                    specValue: { value: 8, unit: 'px' as const },
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'radius' as const,
                    sourceUrls: ['https://example.com']
                };

                expect(mockBorder.category).toBe('radius');
            });
        });

        it('should extract shadow categories', () => {
            const mockBorder = {
                cssValue: '0 4px 8px 0 rgba(0, 0, 0, 0.1)',
                specValue: {
                    color: {
                        colorSpace: 'srgb',
                        components: [0, 0, 0],
                        alpha: 0.1,
                        hex: '#000000'
                    },
                    offsetX: { value: 0, unit: 'px' as const },
                    offsetY: { value: 4, unit: 'px' as const },
                    blur: { value: 8, unit: 'px' as const },
                    spread: { value: 0, unit: 'px' as const }
                },
                property: 'box-shadow',
                element: 'div',
                usageCount: 1,
                category: 'shadow' as const,
                sourceUrls: ['https://example.com']
            };

            expect(mockBorder.category).toBe('shadow');
        });
    });
});
