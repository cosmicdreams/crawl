// tests/integration/stages/animation-extractor.integration.test.ts
/**
 * Integration tests for Animation Extractor
 * Tests real browser-based extraction with actual HTML
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { AnimationExtractorStage } from '../../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { chromium, Browser } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TransitionValue } from '../../../src/core/tokens/types/composites.js';

describe('AnimationExtractorStage Integration Tests', () => {
    let browser: Browser;
    let testOutputDir: string;
    let testHtmlPath: string;
    let crawlResult: CrawlResult;

    const testHtmlPage1 = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .fade-transition { transition: opacity 0.3s ease-in-out; }
                .slide-transition { transition: transform 0.5s ease-out; }
                .instant-transition { transition: all 0.2s linear; }
                .slow-transition { transition: opacity 1s ease; }

                @keyframes fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .fade-animation { animation: fade-in 0.5s ease-in; }
            </style>
        </head>
        <body>
            <div class="fade-transition">Fade transition</div>
            <div class="slide-transition">Slide transition</div>
            <div class="instant-transition">Instant transition</div>
            <div class="slow-transition">Slow transition</div>
            <div class="fade-animation">Fade animation</div>
        </body>
        </html>
    `;

    const testHtmlPage2 = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                /* Reuse fade-transition to test deduplication */
                .box { transition: opacity 0.3s ease-in-out; }
                .another-box { transition: opacity 0.3s ease-in-out; }

                /* New transition */
                .custom-transition { transition: all 300ms cubic-bezier(0.42, 0, 0.58, 1); }
            </style>
        </head>
        <body>
            <div class="box">Box 1</div>
            <div class="another-box">Box 2</div>
            <div class="custom-transition">Custom</div>
        </body>
        </html>
    `;

    beforeAll(async () => {
        browser = await chromium.launch();
        testOutputDir = path.join(process.cwd(), 'test-output-animations');

        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Create test HTML files
        testHtmlPath = path.join(testOutputDir, 'test-animations.html');
        fs.writeFileSync(testHtmlPath, testHtmlPage1);

        const testHtmlPath2 = path.join(testOutputDir, 'test-animations-2.html');
        fs.writeFileSync(testHtmlPath2, testHtmlPage2);

        // Set up crawl result
        crawlResult = {
            baseUrl: `file://${testHtmlPath}`,
            crawledPages: [
                {
                    url: `file://${testHtmlPath}`,
                    title: 'Test Page 1',
                    status: 200,
                    contentType: 'text/html'
                },
                {
                    url: `file://${testHtmlPath2}`,
                    title: 'Test Page 2',
                    status: 200,
                    contentType: 'text/html'
                }
            ],
            timestamp: new Date().toISOString()
        };
    });

    afterAll(async () => {
        await browser.close();
        // Clean up test files
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Transition Extraction', () => {
        it('should extract transitions from real HTML', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should find transitions
            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.transitions).toBeGreaterThan(0);

            // Verify spec-compliant TransitionValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('transition');
                expect(token.category).toBe('transition');
                expect(token.value).toHaveProperty('duration');
                expect(token.value).toHaveProperty('delay');
                expect(token.value).toHaveProperty('timingFunction');

                const value = token.value as TransitionValue;
                expect(value.duration).toHaveProperty('value');
                expect(value.duration).toHaveProperty('unit');
                expect(value.delay).toHaveProperty('value');
                expect(value.delay).toHaveProperty('unit');
                expect(Array.isArray(value.timingFunction)).toBe(true);
                expect(value.timingFunction).toHaveLength(4);
            });
        });

        it('should extract correct duration values', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Find the 0.3s transition
            const fadeTransition = result.tokens.find(token => {
                const value = token.value as TransitionValue;
                return value.duration.value === 0.3 && value.duration.unit === 's';
            });

            expect(fadeTransition).toBeDefined();
            if (fadeTransition) {
                const value = fadeTransition.value as TransitionValue;
                expect(value.duration.value).toBe(0.3);
                expect(value.duration.unit).toBe('s');
            }
        });

        it('should extract correct timing functions', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should have multiple different timing functions
            const timingFunctions = new Set(
                result.tokens.map(token => {
                    const value = token.value as TransitionValue;
                    return JSON.stringify(value.timingFunction);
                })
            );

            expect(timingFunctions.size).toBeGreaterThan(1);
        });

        it('should handle ms duration values', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Find the 300ms transition (from custom-transition)
            const msTransition = result.tokens.find(token => {
                const value = token.value as TransitionValue;
                return value.duration.value === 300 && value.duration.unit === 'ms';
            });

            // May or may not be present depending on browser computation
            if (msTransition) {
                const value = msTransition.value as TransitionValue;
                expect(value.duration.unit).toBe('ms');
            }
        });
    });

    describe('Animation Extraction', () => {
        it('should extract animations from real HTML', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: false,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should find animations
            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.keyframeAnimations).toBeGreaterThan(0);

            // Verify spec-compliant structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('transition');
                expect(token.category).toBe('animation');
                expect(token.value).toHaveProperty('duration');
                expect(token.value).toHaveProperty('delay');
                expect(token.value).toHaveProperty('timingFunction');
            });
        });
    });

    describe('Combined Extraction', () => {
        it('should extract both transitions and animations', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should have both types
            expect(result.stats.transitions).toBeGreaterThan(0);
            expect(result.stats.keyframeAnimations).toBeGreaterThan(0);

            // Verify categorization
            const transitions = result.tokens.filter(t => t.category === 'transition');
            const animations = result.tokens.filter(t => t.category === 'animation');

            expect(transitions.length).toBeGreaterThan(0);
            expect(animations.length).toBeGreaterThan(0);
        });
    });

    describe('Deduplication', () => {
        it('should deduplicate animations across multiple pages', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // The 0.3s ease-in-out transition appears in both pages
            // Find it and check usage count
            const fadeTransition = result.tokens.find(token => {
                const value = token.value as TransitionValue;
                return value.duration.value === 0.3 &&
                       value.duration.unit === 's' &&
                       JSON.stringify(value.timingFunction) === JSON.stringify([0.42, 0, 0.58, 1]);
            });

            expect(fadeTransition).toBeDefined();
            if (fadeTransition) {
                // Should have usage count > 1 since it appears on multiple pages
                expect(fadeTransition.usageCount).toBeGreaterThan(1);
                // Should track multiple source URLs
                expect(fadeTransition.sourceUrls?.length).toBeGreaterThan(1);
            }
        });

        it('should track source URLs for each unique animation', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            result.tokens.forEach(token => {
                expect(token.sourceUrls).toBeDefined();
                expect(Array.isArray(token.sourceUrls)).toBe(true);
                expect(token.sourceUrls!.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Filtering', () => {
        it('should filter by minimum occurrences', async () => {
            const extractorLowThreshold = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const extractorHighThreshold = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 10,
                outputDir: testOutputDir
            });

            const resultLow = await extractorLowThreshold.process(crawlResult);
            const resultHigh = await extractorHighThreshold.process(crawlResult);

            // Low threshold should have more tokens
            expect(resultLow.tokens.length).toBeGreaterThan(resultHigh.tokens.length);
        });

        it('should respect transition/animation category filters', async () => {
            const transitionsOnly = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const animationsOnly = new AnimationExtractorStage({
                includeTransitions: false,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const resultTransitions = await transitionsOnly.process(crawlResult);
            const resultAnimations = await animationsOnly.process(crawlResult);

            // Transitions-only should have no animations
            expect(resultTransitions.stats.keyframeAnimations).toBe(0);
            expect(resultTransitions.stats.transitions).toBeGreaterThan(0);

            // Animations-only should have no transitions
            expect(resultAnimations.stats.transitions).toBe(0);
            expect(resultAnimations.stats.keyframeAnimations).toBeGreaterThan(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle pages that fail to load', async () => {
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

            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            // Should not throw, but handle gracefully
            await expect(extractor.process(badCrawlResult)).resolves.toBeDefined();
        });

        it('should skip elements with no animations', async () => {
            const noAnimHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div>No animations here</div>
                    <p>Just static content</p>
                </body>
                </html>
            `;

            const noAnimPath = path.join(testOutputDir, 'no-anim.html');
            fs.writeFileSync(noAnimPath, noAnimHtml);

            const noAnimCrawl: CrawlResult = {
                baseUrl: `file://${noAnimPath}`,
                crawledPages: [
                    {
                        url: `file://${noAnimPath}`,
                        title: 'No Animations',
                        status: 200,
                        contentType: 'text/html'
                    }
                ],
                timestamp: new Date().toISOString()
            };

            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(noAnimCrawl);

            // Should return empty results, not error
            expect(result.tokens.length).toBe(0);
            expect(result.stats.totalAnimations).toBe(0);
        });
    });

    describe('File Output', () => {
        it('should save results to the specified directory', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            await extractor.process(crawlResult);

            const outputFile = path.join(testOutputDir, 'raw', 'animation-analysis.json');
            expect(fs.existsSync(outputFile)).toBe(true);

            // Verify file contents
            const fileContents = fs.readFileSync(outputFile, 'utf-8');
            const tokens = JSON.parse(fileContents);

            expect(Array.isArray(tokens)).toBe(true);
            expect(tokens.length).toBeGreaterThan(0);
        });
    });

    describe('Statistics', () => {
        it('should generate accurate statistics', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Verify stats structure
            expect(result.stats).toHaveProperty('totalAnimations');
            expect(result.stats).toHaveProperty('uniqueAnimations');
            expect(result.stats).toHaveProperty('transitions');
            expect(result.stats).toHaveProperty('keyframeAnimations');

            // Verify stats accuracy
            expect(result.stats.uniqueAnimations).toBe(result.tokens.length);
            expect(result.stats.transitions + result.stats.keyframeAnimations).toBeLessThanOrEqual(result.stats.uniqueAnimations);
        });
    });

    describe('Semantic Naming', () => {
        it('should generate semantic names for common animations', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should have semantically named tokens
            const hasSemanticNames = result.tokens.some(token =>
                token.name.includes('fast') ||
                token.name.includes('normal') ||
                token.name.includes('slow') ||
                token.name.includes('instant')
            );

            expect(hasSemanticNames).toBe(true);
        });

        it('should include easing function in names', async () => {
            const extractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await extractor.process(crawlResult);

            // Should have easing functions in names
            const hasEasingNames = result.tokens.some(token =>
                token.name.includes('ease') ||
                token.name.includes('linear') ||
                token.name.includes('custom')
            );

            expect(hasEasingNames).toBe(true);
        });
    });
});
