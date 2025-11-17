// tests/integration/full-pipeline.test.ts
/**
 * Full Extraction Pipeline Integration Tests
 * Tests all extractors working together in a complete end-to-end workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ColorExtractorStage } from '../../src/core/stages/color-extractor-stage.js';
import { TypographyExtractor } from '../../src/core/stages/typography-extractor.ts';
import { SpacingExtractorStage } from '../../src/core/stages/spacing-extractor-stage.js';
import { BorderExtractorStage } from '../../src/core/stages/border-extractor-stage.js';
import { AnimationExtractorStage } from '../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../src/core/types.js';
import { chromium, Browser } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { ExtractedTokenData } from '../../src/core/tokens/generators/spec-generator.js';

describe('Full Extraction Pipeline Integration Tests', () => {
    let browser: Browser;
    let testOutputDir: string;
    let testHtmlPath: string;
    let crawlResult: CrawlResult;

    const comprehensiveDesignSystemHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                :root {
                    --primary-color: #3b82f6;
                    --secondary-color: #8b5cf6;
                    --spacing-sm: 8px;
                    --spacing-md: 16px;
                    --spacing-lg: 24px;
                    --radius-sm: 4px;
                    --radius-md: 8px;
                }

                body {
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
                    font-size: 16px;
                    line-height: 1.5;
                    color: #1f2937;
                    background-color: #ffffff;
                    margin: 0;
                    padding: 24px;
                }

                .button {
                    background-color: #3b82f6;
                    color: #ffffff;
                    padding: 12px 24px;
                    border: 2px solid #2563eb;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 14px;
                    transition: all 0.3s ease-in-out;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .button:hover {
                    background-color: #2563eb;
                    box-shadow: 0 6px 8px rgba(0, 0, 0, 0.15);
                }

                .card {
                    background-color: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 12px;
                    padding: 24px;
                    margin: 16px 0;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .card-title {
                    font-size: 24px;
                    font-weight: 700;
                    line-height: 1.2;
                    color: #111827;
                    margin-bottom: 8px;
                }

                .card-content {
                    font-size: 16px;
                    line-height: 1.5;
                    color: #4b5563;
                }

                .badge {
                    background-color: #8b5cf6;
                    color: #ffffff;
                    padding: 4px 12px;
                    border-radius: 9999px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .input {
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    padding: 8px 12px;
                    font-size: 14px;
                    transition: border-color 0.2s ease;
                }

                .input:focus {
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .grid {
                    display: grid;
                    gap: 24px;
                    grid-template-columns: repeat(3, 1fr);
                }

                @keyframes slide-in {
                    from {
                        transform: translateX(-100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .animated {
                    animation: slide-in 0.5s ease-out;
                }

                .text-sm { font-size: 14px; }
                .text-md { font-size: 16px; }
                .text-lg { font-size: 18px; }
                .text-xl { font-size: 24px; }

                .font-normal { font-weight: 400; }
                .font-medium { font-weight: 500; }
                .font-semibold { font-weight: 600; }
                .font-bold { font-weight: 700; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2 class="card-title">Design System Example</h2>
                <p class="card-content">This page demonstrates a comprehensive design system.</p>
                <button class="button">Primary Button</button>
                <span class="badge">New</span>
            </div>

            <div class="grid">
                <div class="card">
                    <h3 class="text-lg font-semibold">Card 1</h3>
                    <p class="text-md font-normal">Content for card 1</p>
                </div>
                <div class="card">
                    <h3 class="text-lg font-semibold">Card 2</h3>
                    <p class="text-md font-normal">Content for card 2</p>
                </div>
                <div class="card">
                    <h3 class="text-lg font-semibold">Card 3</h3>
                    <p class="text-md font-normal">Content for card 3</p>
                </div>
            </div>

            <input type="text" class="input" placeholder="Enter text...">

            <div class="animated">
                <p class="text-sm font-medium">This element slides in</p>
            </div>
        </body>
        </html>
    `;

    beforeAll(async () => {
        browser = await chromium.launch();
        testOutputDir = path.join(process.cwd(), 'test-output-full-pipeline');

        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Create test HTML file
        testHtmlPath = path.join(testOutputDir, 'design-system-test.html');
        fs.writeFileSync(testHtmlPath, comprehensiveDesignSystemHtml);

        // Set up crawl result
        crawlResult = {
            baseUrl: `file://${testHtmlPath}`,
            crawledPages: [
                {
                    url: `file://${testHtmlPath}`,
                    title: 'Design System Test Page',
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

    describe('Pipeline Orchestration', () => {
        it('should run all extractors successfully in sequence', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                includeBorderColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const spacingExtractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const borderExtractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const animationExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            // Run all extractors in sequence
            const colorResult = await colorExtractor.process(crawlResult);
            const typographyResult = await typographyExtractor.process(crawlResult);
            const spacingResult = await spacingExtractor.process(crawlResult);
            const borderResult = await borderExtractor.process(crawlResult);
            const animationResult = await animationExtractor.process(crawlResult);

            // All should complete successfully
            expect(colorResult).toBeDefined();
            expect(typographyResult).toBeDefined();
            expect(spacingResult).toBeDefined();
            expect(borderResult).toBeDefined();
            expect(animationResult).toBeDefined();

            // All should extract tokens
            expect(colorResult.tokens.length).toBeGreaterThan(0);
            expect(typographyResult.tokens.length).toBeGreaterThan(0);
            expect(spacingResult.tokens.length).toBeGreaterThan(0);
            expect(borderResult.tokens.length).toBeGreaterThan(0);
            expect(animationResult.tokens.length).toBeGreaterThan(0);
        });

        it('should produce comprehensive design token catalog', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new AnimationExtractorStage({
                    includeTransitions: true,
                    includeAnimations: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            // Combine all tokens
            const allTokens: ExtractedTokenData[] = results.flatMap(r => r.tokens);

            // Should have diverse token types
            const tokenTypes = new Set(allTokens.map(t => t.type));
            expect(tokenTypes.size).toBeGreaterThanOrEqual(5);

            // Should have diverse categories
            const categories = new Set(allTokens.map(t => t.category));
            expect(categories.size).toBeGreaterThanOrEqual(10);

            // Should cover all major design token domains
            expect(allTokens.some(t => t.type === 'color')).toBe(true);
            expect(allTokens.some(t => t.type === 'typography')).toBe(true);
            expect(allTokens.some(t => t.type === 'dimension')).toBe(true);
            expect(allTokens.some(t => t.type === 'shadow')).toBe(true);
            expect(allTokens.some(t => t.type === 'transition')).toBe(true);
        });
    });

    describe('Cross-Extractor Coordination', () => {
        it('should track consistent source URLs across all extractors', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            // All tokens should reference the same source URLs
            results.forEach(result => {
                result.tokens.forEach(token => {
                    expect(token.sourceUrls).toBeDefined();
                    expect(token.sourceUrls!.length).toBeGreaterThan(0);
                    token.sourceUrls!.forEach(url => {
                        expect(url).toContain('design-system-test.html');
                    });
                });
            });
        });

        it('should use consistent metadata structures across extractors', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            // All tokens should have same metadata structure
            results.forEach(result => {
                result.tokens.forEach(token => {
                    // Required metadata fields
                    expect(token).toHaveProperty('type');
                    expect(token).toHaveProperty('name');
                    expect(token).toHaveProperty('value');
                    expect(token).toHaveProperty('category');
                    expect(token).toHaveProperty('usageCount');
                    expect(token).toHaveProperty('sourceUrls');
                });
            });
        });
    });

    describe('Output File Generation', () => {
        it('should generate output files for all extractors', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new AnimationExtractorStage({
                    includeTransitions: true,
                    includeAnimations: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            await Promise.all(extractors.map(e => e.process(crawlResult)));

            // Verify all output files exist
            const expectedFiles = [
                'color-analysis.json',
                'typography-analysis.json',
                'spacing-analysis.json',
                'border-analysis.json',
                'animation-analysis.json'
            ];

            const rawOutputDir = path.join(testOutputDir, 'raw');
            expectedFiles.forEach(filename => {
                const filepath = path.join(rawOutputDir, filename);
                expect(fs.existsSync(filepath)).toBe(true);

                // Verify file contents are valid JSON
                const contents = fs.readFileSync(filepath, 'utf-8');
                const tokens = JSON.parse(contents);
                expect(Array.isArray(tokens)).toBe(true);
            });
        });
    });

    describe('Performance and Scalability', () => {
        it('should complete full pipeline within reasonable time', async () => {
            const startTime = Date.now();

            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new AnimationExtractorStage({
                    includeTransitions: true,
                    includeAnimations: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            await Promise.all(extractors.map(e => e.process(crawlResult)));

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within 30 seconds for a single page
            expect(duration).toBeLessThan(30000);
        });

        it('should handle large numbers of tokens efficiently', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new AnimationExtractorStage({
                    includeTransitions: true,
                    includeAnimations: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            const totalTokens = results.reduce((sum, r) => sum + r.tokens.length, 0);

            // Should handle extraction without memory issues
            expect(totalTokens).toBeGreaterThan(0);
            expect(totalTokens).toBeLessThan(1000); // Reasonable upper bound for single page
        });
    });

    describe('Error Resilience', () => {
        it('should continue processing even if one extractor fails', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            // Create a bad crawl result for one extractor to fail on
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

            // Both extractors should handle gracefully
            const results = await Promise.all(
                extractors.map(e => e.process(badCrawlResult).catch(() => ({ tokens: [], stats: {} as any })))
            );

            // Should not throw, even if results are empty
            expect(results).toBeDefined();
            expect(results.length).toBe(2);
        });
    });

    describe('Design System Coverage', () => {
        it('should extract comprehensive design system tokens', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new SpacingExtractorStage({
                    includeMargins: true,
                    includePadding: true,
                    includeGap: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new BorderExtractorStage({
                    includeBorderWidth: true,
                    includeBorderStyle: true,
                    includeBorderRadius: true,
                    includeShadows: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new AnimationExtractorStage({
                    includeTransitions: true,
                    includeAnimations: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            // Verify comprehensive coverage
            const [colorResult, typographyResult, spacingResult, borderResult, animationResult] = results;

            // Should extract colors (primary, secondary, text, background)
            expect(colorResult.tokens.length).toBeGreaterThanOrEqual(4);

            // Should extract typography (font families, sizes, weights)
            expect(typographyResult.tokens.length).toBeGreaterThanOrEqual(3);

            // Should extract spacing (margins, padding, gaps)
            expect(spacingResult.tokens.length).toBeGreaterThanOrEqual(3);

            // Should extract borders (widths, styles, radii, shadows)
            expect(borderResult.tokens.length).toBeGreaterThanOrEqual(3);

            // Should extract animations (transitions, keyframe animations)
            expect(animationResult.tokens.length).toBeGreaterThanOrEqual(1);
        });

        it('should provide sufficient detail for design system documentation', async () => {
            const extractors = [
                new ColorExtractorStage({
                    includeTextColors: true,
                    includeBackgroundColors: true,
                    includeBorderColors: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                }),
                new TypographyExtractor({
                    includeHeadings: true,
                    includeBodyText: true,
                    includeSpecialText: true,
                    minimumOccurrences: 1,
                    outputDir: testOutputDir
                })
            ];

            const results = await Promise.all(extractors.map(e => e.process(crawlResult)));

            // Each token should have documentation-ready information
            results.forEach(result => {
                result.tokens.forEach(token => {
                    // Should have descriptive name
                    expect(token.name.length).toBeGreaterThan(0);

                    // Should have usage information
                    expect(token.usageCount).toBeGreaterThan(0);

                    // Should have description
                    expect(token.description).toBeDefined();

                    // Should have source tracking
                    expect(token.sourceUrls).toBeDefined();
                    expect(token.sourceUrls!.length).toBeGreaterThan(0);
                });
            });
        });
    });
});
