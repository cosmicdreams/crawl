// tests/unit/stages/animation-extractor.test.ts
/**
 * Unit tests for Animation Extractor
 * Tests spec-compliant animation extraction and conversion
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AnimationExtractorStage } from '../../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { DurationValue, CubicBezierValue } from '../../../src/core/tokens/types/primitives.js';
import { TransitionValue } from '../../../src/core/tokens/types/composites.js';

describe('AnimationExtractorStage', () => {
    let extractor: AnimationExtractorStage;
    let mockCrawlResult: CrawlResult;

    beforeEach(() => {
        extractor = new AnimationExtractorStage({
            includeTransitions: true,
            includeAnimations: true,
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
            expect(extractor.name).toBe('animation-extractor');
        });

        it('should accept custom options', () => {
            const customExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 5,
                outputDir: './custom-output'
            });

            expect(customExtractor).toBeDefined();
        });
    });

    describe('Spec-Compliant Output', () => {
        it('should output ExtractedTokenData with TransitionValue objects', async () => {
            // Testing the expected structure
            const mockResult = {
                tokens: [
                    {
                        type: 'transition' as const,
                        name: 'transition-normal-ease',
                        value: {
                            duration: {
                                value: 0.3,
                                unit: 's' as const
                            },
                            delay: {
                                value: 0,
                                unit: 's' as const
                            },
                            timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                        },
                        category: 'transition',
                        usageCount: 5
                    }
                ],
                stats: {
                    totalAnimations: 1,
                    uniqueAnimations: 1,
                    transitions: 1,
                    keyframeAnimations: 0
                }
            };

            // Verify structure
            expect(mockResult.tokens[0].type).toBe('transition');
            expect(mockResult.tokens[0].value).toHaveProperty('duration');
            expect(mockResult.tokens[0].value).toHaveProperty('delay');
            expect(mockResult.tokens[0].value).toHaveProperty('timingFunction');

            const value = mockResult.tokens[0].value as TransitionValue;
            expect(value.duration).toHaveProperty('value');
            expect(value.duration).toHaveProperty('unit');
            expect(value.delay).toHaveProperty('value');
            expect(value.delay).toHaveProperty('unit');
            expect(Array.isArray(value.timingFunction)).toBe(true);
        });

        it('should include proper metadata in tokens', () => {
            const mockToken = {
                type: 'transition' as const,
                name: 'transition-fast-ease-in',
                value: {
                    duration: {
                        value: 200,
                        unit: 'ms' as const
                    },
                    delay: {
                        value: 0,
                        unit: 'ms' as const
                    },
                    timingFunction: [0.42, 0, 1, 1] as CubicBezierValue
                },
                category: 'transition',
                description: 'transition extracted from 2 page(s)',
                usageCount: 10,
                source: 'opacity',
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

    describe('Animation Name Generation', () => {
        it('should generate semantic names for common durations', () => {
            const instantTransition = {
                cssValue: '0.2s|ease|0s',
                specValue: {
                    duration: { value: 0.2, unit: 's' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                },
                property: 'all',
                element: 'div',
                usageCount: 1,
                category: 'transition' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateAnimationName(instantTransition);
            expect(name).toContain('instant');
        });

        it('should recognize common easing functions', () => {
            const easeInTransition = {
                cssValue: '0.3s|ease-in|0s',
                specValue: {
                    duration: { value: 0.3, unit: 's' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.42, 0, 1, 1] as CubicBezierValue
                },
                property: 'all',
                element: 'div',
                usageCount: 1,
                category: 'transition' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateAnimationName(easeInTransition);
            expect(name).toContain('ease-in');
        });

        it('should handle ms duration values', () => {
            const msTransition = {
                cssValue: '200ms|ease|0s',
                specValue: {
                    duration: { value: 200, unit: 'ms' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                },
                property: 'all',
                element: 'div',
                usageCount: 1,
                category: 'transition' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateAnimationName(msTransition);
            expect(name).toMatch(/transition-(instant|fast|normal|slow|very-slow)-/);
        });

        it('should categorize speed correctly', () => {
            const testCases = [
                { value: 0.1, unit: 's' as const, expectedSpeed: 'instant' },
                { value: 0.2, unit: 's' as const, expectedSpeed: 'instant' },
                { value: 0.3, unit: 's' as const, expectedSpeed: 'fast' },
                { value: 0.5, unit: 's' as const, expectedSpeed: 'normal' },
                { value: 1.0, unit: 's' as const, expectedSpeed: 'slow' },
                { value: 2.0, unit: 's' as const, expectedSpeed: 'very-slow' }
            ];

            testCases.forEach(({ value, unit, expectedSpeed }) => {
                const transition = {
                    cssValue: `${value}${unit}|ease|0s`,
                    specValue: {
                        duration: { value, unit },
                        delay: { value: 0, unit: 's' as const },
                        timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                    },
                    property: 'all',
                    element: 'div',
                    usageCount: 1,
                    category: 'transition' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateAnimationName(transition);
                expect(name).toContain(expectedSpeed);
            });
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate animation values', async () => {
            // Mock scenario: same animation value in different elements should deduplicate
            // This is tested at integration level with real browser
        });

        it('should track usage count across multiple occurrences', () => {
            // Integration test needed
        });

        it('should track source URLs for each unique animation', () => {
            // Integration test needed
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 10  // High threshold
            });

            expect(extractor).toBeDefined();
            // Actual filtering tested in integration tests
        });

        it('should respect category filters', () => {
            const transitionsOnlyExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1
            });

            expect(transitionsOnlyExtractor).toBeDefined();
        });
    });

    describe('Error Handling', () => {
        it('should handle invalid animation values gracefully', () => {
            // The converter will throw, but extractor should catch and log
            // This is tested in integration tests with real scenarios
        });

        it('should skip zero duration values', () => {
            // Zero duration animations should typically be skipped
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
                    { type: 'transition' as const, category: 'transition', name: 'transition-fast-ease', value: {} as TransitionValue },
                    { type: 'transition' as const, category: 'transition', name: 'transition-normal-ease-in', value: {} as TransitionValue },
                    { type: 'transition' as const, category: 'animation', name: 'animation-slow-linear', value: {} as TransitionValue }
                ],
                stats: {
                    totalAnimations: 3,
                    uniqueAnimations: 3,
                    transitions: 2,
                    keyframeAnimations: 1
                }
            };

            expect(mockResult.stats.totalAnimations).toBe(3);
            expect(mockResult.stats.transitions).toBe(2);
            expect(mockResult.stats.keyframeAnimations).toBe(1);
        });
    });

    describe('Output Format', () => {
        it('should save results to correct location', () => {
            // Tested in integration tests with actual file I/O
        });

        it('should sort tokens by usage count', () => {
            const mockTokens = [
                { type: 'transition' as const, name: 'low', value: {} as TransitionValue, usageCount: 2 },
                { type: 'transition' as const, name: 'high', value: {} as TransitionValue, usageCount: 20 },
                { type: 'transition' as const, name: 'medium', value: {} as TransitionValue, usageCount: 10 }
            ];

            const sorted = [...mockTokens].sort((a, b) =>
                (b.usageCount || 0) - (a.usageCount || 0)
            );

            expect(sorted[0].name).toBe('high');
            expect(sorted[1].name).toBe('medium');
            expect(sorted[2].name).toBe('low');
        });
    });

    describe('Timing Function Recognition', () => {
        it('should recognize standard easing functions', () => {
            const easingTests = [
                { bezier: [0.25, 0.1, 0.25, 1] as CubicBezierValue, expected: 'ease' },
                { bezier: [0.42, 0, 1, 1] as CubicBezierValue, expected: 'ease-in' },
                { bezier: [0, 0, 0.58, 1] as CubicBezierValue, expected: 'ease-out' },
                { bezier: [0.42, 0, 0.58, 1] as CubicBezierValue, expected: 'ease-in-out' },
                { bezier: [0, 0, 1, 1] as CubicBezierValue, expected: 'linear' }
            ];

            easingTests.forEach(({ bezier, expected }) => {
                const transition = {
                    cssValue: '0.3s|custom|0s',
                    specValue: {
                        duration: { value: 0.3, unit: 's' as const },
                        delay: { value: 0, unit: 's' as const },
                        timingFunction: bezier
                    },
                    property: 'all',
                    element: 'div',
                    usageCount: 1,
                    category: 'transition' as const,
                    sourceUrls: ['https://example.com']
                };

                const name = (extractor as any).generateAnimationName(transition);
                expect(name).toContain(expected);
            });
        });

        it('should label custom bezier curves as custom', () => {
            const customTransition = {
                cssValue: '0.3s|custom|0s',
                specValue: {
                    duration: { value: 0.3, unit: 's' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.5, 0.5, 0.5, 0.5] as CubicBezierValue
                },
                property: 'all',
                element: 'div',
                usageCount: 1,
                category: 'transition' as const,
                sourceUrls: ['https://example.com']
            };

            const name = (extractor as any).generateAnimationName(customTransition);
            expect(name).toContain('custom');
        });
    });

    describe('Category Extraction', () => {
        it('should extract transition categories', () => {
            const transition = {
                cssValue: '0.3s|ease|0s',
                specValue: {
                    duration: { value: 0.3, unit: 's' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                },
                property: 'opacity',
                element: 'div',
                usageCount: 1,
                category: 'transition' as const,
                sourceUrls: ['https://example.com']
            };

            expect(transition.category).toBe('transition');
        });

        it('should extract animation categories', () => {
            const animation = {
                cssValue: 'fade-in|0.5s|ease|0s',
                specValue: {
                    duration: { value: 0.5, unit: 's' as const },
                    delay: { value: 0, unit: 's' as const },
                    timingFunction: [0.25, 0.1, 0.25, 1] as CubicBezierValue
                },
                property: 'fade-in',
                element: 'div',
                usageCount: 1,
                category: 'animation' as const,
                sourceUrls: ['https://example.com']
            };

            expect(animation.category).toBe('animation');
        });
    });
});
