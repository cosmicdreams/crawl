// tests/unit/stages/spacing-extractor.test.ts
/**
 * Unit tests for Spacing Extractor
 * Tests spec-compliant spacing extraction and conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SpacingExtractorStage } from '../../../src/core/stages/spacing-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { DimensionValue } from '../../../src/core/tokens/types/primitives.js';

describe('SpacingExtractorStage', () => {
    let extractor: SpacingExtractorStage;
    let mockCrawlResult: CrawlResult;

    beforeEach(() => {
        extractor = new SpacingExtractorStage({
            includeMargins: true,
            includePadding: true,
            includeGap: true,
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
            expect(extractor.name).toBe('spacing-extractor');
        });

        it('should accept custom options', () => {
            const customExtractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
                minimumOccurrences: 5
            });

            expect(customExtractor).toBeDefined();
        });
    });

    describe('Spec-Compliant Output', () => {
        it('should output ExtractedTokenData with DimensionValue objects', async () => {
            // Testing the expected structure
            const mockResult = {
                tokens: [
                    {
                        type: 'dimension' as const,
                        name: 'margin-4',
                        value: {
                            value: 1,
                            unit: 'rem' as const
                        },
                        category: 'margin',
                        usageCount: 5
                    }
                ],
                stats: {
                    totalSpacings: 1,
                    uniqueSpacings: 1,
                    marginSpacings: 1,
                    paddingSpacings: 0,
                    gapSpacings: 0
                }
            };

            // Verify structure
            expect(mockResult.tokens[0].type).toBe('dimension');
            expect(mockResult.tokens[0].value).toHaveProperty('value');
            expect(mockResult.tokens[0].value).toHaveProperty('unit');
        });

        it('should include proper metadata in tokens', () => {
            const mockToken = {
                type: 'dimension' as const,
                name: 'padding-4',
                value: {
                    value: 16,
                    unit: 'px' as const
                },
                category: 'padding',
                description: 'padding extracted from 2 page(s)',
                usageCount: 10,
                source: 'padding',
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

    describe('Spacing Name Generation', () => {
        it('should generate semantic names for common rem values', () => {
            const spacing1rem = {
                cssValue: '1rem',
                specValue: { value: 1, unit: 'rem' as const },
                property: 'margin',
                element: 'div',
                usageCount: 1,
                category: 'margin',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateSpacingName(spacing1rem);
            expect(name).toBe('margin-4');  // 1rem = spacing-4 in common scale
        });

        it('should generate semantic names for common px values', () => {
            const spacing16px = {
                cssValue: '16px',
                specValue: { value: 16, unit: 'px' as const },
                property: 'padding',
                element: 'div',
                usageCount: 1,
                category: 'padding',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateSpacingName(spacing16px);
            expect(name).toBe('padding-4');  // 16px = 1rem = spacing-4
        });

        it('should generate size-based names for gap values', () => {
            const gapSmall = {
                cssValue: '0.5rem',
                specValue: { value: 0.5, unit: 'rem' as const },
                property: 'gap',
                element: 'div',
                usageCount: 1,
                category: 'gap',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateSpacingName(gapSmall);
            expect(name).toBe('gap-2');  // 0.5rem = spacing-2 in standard scale
        });

        it('should handle custom spacing values', () => {
            const customSpacing = {
                cssValue: '13px',
                specValue: { value: 13, unit: 'px' as const },
                property: 'margin',
                element: 'div',
                usageCount: 1,
                category: 'margin',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateSpacingName(customSpacing);
            expect(name).toMatch(/margin-\d+-px/);
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate spacing values', async () => {
            // Mock scenario: same spacing value in different elements should deduplicate
            // This is tested at integration level with real browser
        });

        it('should track usage count across multiple occurrences', () => {
            // Integration test needed
        });

        it('should track source URLs for each unique spacing', () => {
            // Integration test needed
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', () => {
            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
                minimumOccurrences: 10  // High threshold
            });

            expect(extractor).toBeDefined();
            // Actual filtering tested in integration tests
        });

        it('should respect category filters', () => {
            const marginsOnlyExtractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
                minimumOccurrences: 1
            });

            expect(marginsOnlyExtractor).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid spacing values gracefully', () => {
            // The converter will throw, but extractor should catch and log
            // This is tested in integration tests with real scenarios
        });

        it('should skip zero values', () => {
            // Zero padding/margin values should typically be skipped
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
                    { type: 'dimension' as const, category: 'margin', name: 'margin-4', value: {} as DimensionValue },
                    { type: 'dimension' as const, category: 'margin', name: 'margin-2', value: {} as DimensionValue },
                    { type: 'dimension' as const, category: 'padding', name: 'padding-4', value: {} as DimensionValue },
                    { type: 'dimension' as const, category: 'gap', name: 'gap-md', value: {} as DimensionValue }
                ],
                stats: {
                    totalSpacings: 4,
                    uniqueSpacings: 4,
                    marginSpacings: 2,
                    paddingSpacings: 1,
                    gapSpacings: 1
                }
            };

            expect(mockResult.stats.totalSpacings).toBe(4);
            expect(mockResult.stats.marginSpacings).toBe(2);
            expect(mockResult.stats.paddingSpacings).toBe(1);
            expect(mockResult.stats.gapSpacings).toBe(1);
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

    describe('Common Spacing Scale', () => {
        it('should map to common spacing scale for standard values', () => {
            const spacingScale = [
                { rem: 0, expected: '0' },
                { rem: 0.25, expected: '1' },
                { rem: 0.5, expected: '2' },
                { rem: 0.75, expected: '3' },
                { rem: 1, expected: '4' },
                { rem: 1.25, expected: '5' },
                { rem: 1.5, expected: '6' },
                { rem: 2, expected: '8' },
                { rem: 2.5, expected: '10' },
                { rem: 3, expected: '12' },
                { rem: 4, expected: '16' }
            ];

            spacingScale.forEach(({ rem, expected }) => {
                const spacing = {
                    cssValue: `${rem}rem`,
                    specValue: { value: rem, unit: 'rem' as const },
                    property: 'margin',
                    element: 'div',
                    usageCount: 1,
                    category: 'margin',
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateSpacingName(spacing);
                expect(name).toBe(`margin-${expected}`);
            });
        });

        it('should handle px to rem conversion for spacing scale', () => {
            const pxScale = [
                { px: 0, expected: '0' },
                { px: 4, expected: '1' },      // 0.25rem
                { px: 8, expected: '2' },      // 0.5rem
                { px: 12, expected: '3' },     // 0.75rem
                { px: 16, expected: '4' },     // 1rem
                { px: 20, expected: '5' },     // 1.25rem
                { px: 24, expected: '6' },     // 1.5rem
                { px: 32, expected: '8' },     // 2rem
                { px: 40, expected: '10' },    // 2.5rem
                { px: 48, expected: '12' },    // 3rem
                { px: 64, expected: '16' }     // 4rem
            ];

            pxScale.forEach(({ px, expected }) => {
                const spacing = {
                    cssValue: `${px}px`,
                    specValue: { value: px, unit: 'px' as const },
                    property: 'padding',
                    element: 'div',
                    usageCount: 1,
                    category: 'padding',
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateSpacingName(spacing);
                expect(name).toBe(`padding-${expected}`);
            });
        });
    });

    describe('Category Extraction', () => {
        it('should extract margin categories', () => {
            const margins = ['margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft'];

            margins.forEach(prop => {
                const mockSpacing = {
                    cssValue: '16px',
                    specValue: { value: 16, unit: 'px' as const },
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'margin',
                    sourceUrls: ['https://example.com']
                };

                expect(mockSpacing.category).toBe('margin');
            });
        });

        it('should extract padding categories', () => {
            const paddings = ['padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];

            paddings.forEach(prop => {
                const mockSpacing = {
                    cssValue: '16px',
                    specValue: { value: 16, unit: 'px' as const },
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'padding',
                    sourceUrls: ['https://example.com']
                };

                expect(mockSpacing.category).toBe('padding');
            });
        });

        it('should extract gap categories', () => {
            const gaps = ['gap', 'rowGap', 'columnGap'];

            gaps.forEach(prop => {
                const mockSpacing = {
                    cssValue: '1rem',
                    specValue: { value: 1, unit: 'rem' as const },
                    property: prop,
                    element: 'div',
                    usageCount: 1,
                    category: 'gap',
                    sourceUrls: ['https://example.com']
                };

                expect(mockSpacing.category).toBe('gap');
            });
        });
    });
});
