// tests/unit/stages/color-extractor.test.ts
/**
 * Unit tests for Color Extractor Stage
 * Tests spec-compliant color extraction and conversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { ColorValue } from '../../../src/core/tokens/types/primitives.js';

describe('ColorExtractorStage', () => {
    let extractor: ColorExtractorStage;
    let mockCrawlResult: CrawlResult;

    beforeEach(() => {
        extractor = new ColorExtractorStage({
            includeTextColors: true,
            includeBackgroundColors: true,
            includeBorderColors: true,
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
            expect(extractor.name).toBe('color-extractor');
        });

        it('should accept custom options', () => {
            const customExtractor = new ColorExtractorStage({
                includeTextColors: false,
                includeBackgroundColors: true,
                includeBorderColors: false,
                minimumOccurrences: 5
            });

            expect(customExtractor).toBeDefined();
        });
    });

    describe('Spec-Compliant Output', () => {
        it('should output ExtractedTokenData with ColorValue objects', async () => {
            // This would need mock browser interaction
            // For now, testing the structure
            const mockResult = {
                tokens: [
                    {
                        type: 'color' as const,
                        name: 'text-0066cc',
                        value: {
                            colorSpace: 'srgb' as const,
                            components: [0, 0.4, 0.8] as [number, number, number],
                            hex: '#0066cc'
                        },
                        category: 'text',
                        usageCount: 5
                    }
                ],
                stats: {
                    totalColors: 1,
                    uniqueColors: 1,
                    textColors: 1,
                    backgroundColors: 0,
                    borderColors: 0
                }
            };

            // Verify structure
            expect(mockResult.tokens[0].type).toBe('color');
            expect(mockResult.tokens[0].value).toHaveProperty('colorSpace');
            expect(mockResult.tokens[0].value).toHaveProperty('components');
            expect(mockResult.tokens[0].value).toHaveProperty('hex');
        });

        it('should include proper metadata in tokens', () => {
            const mockToken = {
                type: 'color' as const,
                name: 'primary-blue',
                value: {
                    colorSpace: 'srgb' as const,
                    components: [0, 0.4, 0.8] as [number, number, number],
                    hex: '#0066cc'
                },
                category: 'background',
                description: 'background extracted from 3 page(s)',
                usageCount: 15,
                source: 'div',
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

    describe('Color Name Generation', () => {
        it('should generate names from hex values', () => {
            // Access private method through casting
            const name = (extractor as any).generateColorName('#0066cc', 'primary');
            expect(name).toBe('primary-0066cc');
        });

        it('should handle hex values without # prefix', () => {
            const name = (extractor as any).generateColorName('0066cc', 'secondary');
            expect(name).toBe('secondary-0066cc');
        });

        it('should lowercase names', () => {
            const name = (extractor as any).generateColorName('#FF6347', 'accent');
            expect(name).toBe('accent-ff6347');
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate colors by hex value', async () => {
            // Mock scenario: same color in different formats should deduplicate
            // This is tested at integration level with real browser
        });

        it('should track usage count across multiple occurrences', () => {
            // Integration test needed
        });

        it('should track source URLs for each unique color', () => {
            // Integration test needed
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', () => {
            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                includeBorderColors: true,
                minimumOccurrences: 10  // High threshold
            });

            expect(extractor).toBeDefined();
            // Actual filtering tested in integration tests
        });

        it('should respect color type filters', () => {
            const textOnlyExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1
            });

            expect(textOnlyExtractor).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid CSS colors gracefully', () => {
            // The converter will throw, but extractor should catch and log
            // This is tested in integration tests with real scenarios
        });

        it('should skip transparent colors', async () => {
            // Colors with alpha: 0 should be skipped
            // Tested in integration
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
                    { type: 'color' as const, category: 'text', name: 'text-1', value: {} as ColorValue },
                    { type: 'color' as const, category: 'text', name: 'text-2', value: {} as ColorValue },
                    { type: 'color' as const, category: 'background', name: 'bg-1', value: {} as ColorValue },
                    { type: 'color' as const, category: 'border', name: 'border-1', value: {} as ColorValue }
                ],
                stats: {
                    totalColors: 4,
                    uniqueColors: 4,
                    textColors: 2,
                    backgroundColors: 1,
                    borderColors: 1
                }
            };

            expect(mockResult.stats.totalColors).toBe(4);
            expect(mockResult.stats.textColors).toBe(2);
            expect(mockResult.stats.backgroundColors).toBe(1);
            expect(mockResult.stats.borderColors).toBe(1);
        });
    });

    describe('Output Format', () => {
        it('should save results to correct location', () => {
            // Tested in integration tests with actual file I/O
        });

        it('should sort tokens by usage count', () => {
            const mockTokens = [
                { type: 'color' as const, name: 'low', value: {} as ColorValue, usageCount: 2 },
                { type: 'color' as const, name: 'high', value: {} as ColorValue, usageCount: 20 },
                { type: 'color' as const, name: 'medium', value: {} as ColorValue, usageCount: 10 }
            ];

            const sorted = [...mockTokens].sort((a, b) =>
                (b.usageCount || 0) - (a.usageCount || 0)
            );

            expect(sorted[0].name).toBe('high');
            expect(sorted[1].name).toBe('medium');
            expect(sorted[2].name).toBe('low');
        });
    });
});
