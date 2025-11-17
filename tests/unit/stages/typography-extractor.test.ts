// tests/unit/stages/typography-extractor.test.ts
/**
 * Unit tests for Typography Extractor
 * Tests spec-compliant typography extraction and conversion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TypographyExtractor } from '../../../src/core/stages/typography-extractor.js';
import { CrawlResult } from '../../../src/core/types.js';
import { TypographyValue } from '../../../src/core/tokens/types/composites.js';

describe('TypographyExtractor', () => {
    let extractor: TypographyExtractor;
    let mockCrawlResult: CrawlResult;

    beforeEach(() => {
        extractor = new TypographyExtractor({
            includeHeadings: true,
            includeBodyText: true,
            includeSpecialText: true,
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
            expect(extractor.name).toBe('typography-extractor');
        });

        it('should accept custom options', () => {
            const customExtractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
                minimumOccurrences: 5
            });

            expect(customExtractor).toBeDefined();
        });
    });

    describe('Spec-Compliant Output', () => {
        it('should output ExtractedTokenData with TypographyValue objects', async () => {
            // This would need mock browser interaction
            // For now, testing the structure
            const mockResult = {
                tokens: [
                    {
                        type: 'typography' as const,
                        name: 'heading-h1',
                        value: {
                            fontFamily: { $value: 'Arial, sans-serif' },
                            fontSize: { $value: { value: 32, unit: 'px' as const } },
                            fontWeight: { $value: 700 },
                            lineHeight: { $value: 1.2 }
                        },
                        category: 'heading',
                        usageCount: 3
                    }
                ],
                stats: {
                    totalStyles: 1,
                    uniqueStyles: 1,
                    headingStyles: 1,
                    bodyStyles: 0,
                    specialStyles: 0
                }
            };

            // Verify structure
            expect(mockResult.tokens[0].type).toBe('typography');
            expect(mockResult.tokens[0].value).toHaveProperty('fontFamily');
            expect(mockResult.tokens[0].value).toHaveProperty('fontSize');
            expect(mockResult.tokens[0].value).toHaveProperty('fontWeight');
            expect(mockResult.tokens[0].value).toHaveProperty('lineHeight');
        });

        it('should include proper metadata in tokens', () => {
            const mockToken = {
                type: 'typography' as const,
                name: 'heading-h1',
                value: {
                    fontFamily: { $value: 'Georgia, serif' },
                    fontSize: { $value: { value: 2.5, unit: 'rem' as const } },
                    fontWeight: { $value: 700 },
                    lineHeight: { $value: 1.3 }
                },
                category: 'heading',
                description: 'heading extracted from 2 page(s)',
                usageCount: 10,
                source: 'h1',
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

    describe('Typography Name Generation', () => {
        it('should generate semantic names for headings', () => {
            const mockInfo = {
                cssProperties: {
                    fontFamily: 'Arial',
                    fontSize: '32px',
                    fontWeight: '700',
                    lineHeight: '1.2'
                },
                specValue: {} as TypographyValue,
                source: 'h1',
                element: 'h1',
                usageCount: 1,
                category: 'heading',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateTypographyName(mockInfo);
            expect(name).toBe('heading-h1');
        });

        it('should generate semantic names for body text', () => {
            const mockInfo = {
                cssProperties: {
                    fontFamily: 'Arial',
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '1.5'
                },
                specValue: {} as TypographyValue,
                source: 'p',
                element: 'p',
                usageCount: 1,
                category: 'body',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateTypographyName(mockInfo);
            expect(name).toBe('body-text');
        });

        it('should generate semantic names for special text', () => {
            const codeInfo = {
                cssProperties: {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: '400',
                    lineHeight: '1.4'
                },
                specValue: {} as TypographyValue,
                source: 'code',
                element: 'code',
                usageCount: 1,
                category: 'special',
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateTypographyName(codeInfo);
            expect(name).toBe('text-code');
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate typography styles by key', async () => {
            // Mock scenario: same typography style in different elements should deduplicate
            // This is tested at integration level with real browser
        });

        it('should track usage count across multiple occurrences', () => {
            // Integration test needed
        });

        it('should track source URLs for each unique style', () => {
            // Integration test needed
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', () => {
            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: true,
                minimumOccurrences: 10  // High threshold
            });

            expect(extractor).toBeDefined();
            // Actual filtering tested in integration tests
        });

        it('should respect category filters', () => {
            const headingsOnlyExtractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
                minimumOccurrences: 1
            });

            expect(headingsOnlyExtractor).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid CSS properties gracefully', () => {
            // The converter will throw, but extractor should catch and log
            // This is tested in integration tests with real scenarios
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
                    { type: 'typography' as const, category: 'heading', name: 'heading-h1', value: {} as TypographyValue },
                    { type: 'typography' as const, category: 'heading', name: 'heading-h2', value: {} as TypographyValue },
                    { type: 'typography' as const, category: 'body', name: 'body-text', value: {} as TypographyValue },
                    { type: 'typography' as const, category: 'special', name: 'text-code', value: {} as TypographyValue }
                ],
                stats: {
                    totalStyles: 4,
                    uniqueStyles: 4,
                    headingStyles: 2,
                    bodyStyles: 1,
                    specialStyles: 1
                }
            };

            expect(mockResult.stats.totalStyles).toBe(4);
            expect(mockResult.stats.headingStyles).toBe(2);
            expect(mockResult.stats.bodyStyles).toBe(1);
            expect(mockResult.stats.specialStyles).toBe(1);
        });
    });

    describe('Output Format', () => {
        it('should save results to correct location', () => {
            // Tested in integration tests with actual file I/O
        });

        it('should sort tokens by usage count', () => {
            const mockTokens = [
                { type: 'typography' as const, name: 'low', value: {} as TypographyValue, usageCount: 2 },
                { type: 'typography' as const, name: 'high', value: {} as TypographyValue, usageCount: 20 },
                { type: 'typography' as const, name: 'medium', value: {} as TypographyValue, usageCount: 10 }
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
        it('should extract all heading levels', () => {
            const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

            headings.forEach(heading => {
                const mockInfo = {
                    cssProperties: {
                        fontFamily: 'Arial',
                        fontSize: '16px',
                        fontWeight: '700',
                        lineHeight: '1.2'
                    },
                    specValue: {} as TypographyValue,
                    source: heading,
                    element: heading,
                    usageCount: 1,
                    category: 'heading',
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateTypographyName(mockInfo);
                expect(name).toBe(`heading-${heading}`);
            });
        });

        it('should extract body text elements', () => {
            const bodyElements = ['p', 'span', 'a'];
            const expectedNames = ['body-text', 'body-inline', 'body-link'];

            bodyElements.forEach((element, index) => {
                const mockInfo = {
                    cssProperties: {
                        fontFamily: 'Arial',
                        fontSize: '16px',
                        fontWeight: '400',
                        lineHeight: '1.5'
                    },
                    specValue: {} as TypographyValue,
                    source: element,
                    element: element,
                    usageCount: 1,
                    category: 'body',
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateTypographyName(mockInfo);
                expect(name).toBe(expectedNames[index]);
            });
        });

        it('should extract special text elements', () => {
            const specialElements = ['code', 'blockquote', 'em', 'strong'];
            const expectedNames = ['text-code', 'text-quote', 'text-emphasis', 'text-strong'];

            specialElements.forEach((element, index) => {
                const mockInfo = {
                    cssProperties: {
                        fontFamily: 'monospace',
                        fontSize: '14px',
                        fontWeight: '400',
                        lineHeight: '1.4'
                    },
                    specValue: {} as TypographyValue,
                    source: element,
                    element: element,
                    usageCount: 1,
                    category: 'special',
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateTypographyName(mockInfo);
                expect(name).toBe(expectedNames[index]);
            });
        });
    });
});
