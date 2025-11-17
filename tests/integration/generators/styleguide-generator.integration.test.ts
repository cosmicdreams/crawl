// tests/integration/generators/styleguide-generator.integration.test.ts
/**
 * Integration tests for Styleguide Generator
 * Tests complete styleguide generation from real extracted tokens
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { StyleguideGenerator } from '../../../src/core/generators/styleguide-generator.js';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { TypographyExtractorStage } from '../../../src/core/stages/typography-extractor-stage.js';
import { SpacingExtractorStage } from '../../../src/core/stages/spacing-extractor-stage.js';
import { BorderExtractorStage } from '../../../src/core/stages/border-extractor-stage.js';
import { AnimationExtractorStage } from '../../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('StyleguideGenerator Integration Tests', () => {
    let testOutputDir: string;
    let testHtmlPath: string;
    let crawlResult: CrawlResult;

    const testHtmlPage = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                /* Colors */
                .primary { color: #3b82f6; }
                .secondary { color: #10b981; }
                .background { background-color: #f3f4f6; }
                .text { color: #1f2937; }

                /* Typography */
                h1 { font-family: Georgia, serif; font-size: 32px; font-weight: 700; line-height: 1.2; }
                p { font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.6; }
                .small { font-size: 14px; }

                /* Spacing */
                .margin-small { margin: 8px; }
                .margin-medium { margin: 16px; }
                .padding-large { padding: 24px; }

                /* Borders */
                .border-thin { border: 1px solid #e5e7eb; }
                .border-thick { border: 2px solid #d1d5db; }
                .rounded { border-radius: 8px; }
                .circle { border-radius: 50%; }

                /* Shadows */
                .shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
                .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }

                /* Animations */
                .fade { transition: opacity 0.3s ease-in-out; }
                .slide { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .pulse { animation: pulse 2s ease-in-out infinite; }
            </style>
        </head>
        <body>
            <div class="primary">Primary color</div>
            <div class="secondary">Secondary color</div>
            <div class="background">Background</div>
            <div class="text">Text</div>

            <h1>Heading 1</h1>
            <p>Paragraph text</p>
            <span class="small">Small text</span>

            <div class="margin-small">Margin small</div>
            <div class="margin-medium">Margin medium</div>
            <div class="padding-large">Padding large</div>

            <div class="border-thin">Thin border</div>
            <div class="border-thick">Thick border</div>
            <div class="rounded">Rounded</div>
            <div class="circle">Circle</div>

            <div class="shadow-sm">Small shadow</div>
            <div class="shadow-md">Medium shadow</div>
            <div class="shadow-lg">Large shadow</div>

            <div class="fade">Fade transition</div>
            <div class="slide">Slide transition</div>
            <div class="pulse">Pulse animation</div>
        </body>
        </html>
    `;

    beforeAll(async () => {
        testOutputDir = path.join(process.cwd(), 'test-output-styleguide-integration');

        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Create test HTML file
        testHtmlPath = path.join(testOutputDir, 'test-page.html');
        fs.writeFileSync(testHtmlPath, testHtmlPage);

        // Set up crawl result
        crawlResult = {
            baseUrl: `file://${testHtmlPath}`,
            crawledPages: [
                {
                    url: `file://${testHtmlPath}`,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }
            ],
            timestamp: new Date().toISOString()
        };
    });

    afterAll(() => {
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Complete Pipeline Integration', () => {
        it('should generate styleguide from tokens extracted by all extractors', async () => {
            // Run all extractors
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const spacingExtractor = new SpacingExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const borderExtractor = new BorderExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const animationExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            // Extract tokens from all extractors
            const colorResult = await colorExtractor.process(crawlResult);
            const typographyResult = await typographyExtractor.process(crawlResult);
            const spacingResult = await spacingExtractor.process(crawlResult);
            const borderResult = await borderExtractor.process(crawlResult);
            const animationResult = await animationExtractor.process(crawlResult);

            // Combine all tokens
            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens,
                ...spacingResult.tokens,
                ...borderResult.tokens,
                ...animationResult.tokens
            ];

            // Generate styleguide
            const styleguideOutputPath = path.join(testOutputDir, 'integrated-styleguide.html');
            const generator = new StyleguideGenerator({
                title: 'Integrated Design System Styleguide',
                outputPath: styleguideOutputPath,
                includeMetadata: true,
                includeUsageStats: true
            });

            const html = generator.generate(allTokens);

            // Verify styleguide was created
            expect(fs.existsSync(styleguideOutputPath)).toBe(true);

            // Verify HTML structure
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Integrated Design System Styleguide');

            // Verify token categories are present based on what was extracted
            if (colorResult.tokens.length > 0) {
                expect(html).toContain('Colors');
            }
            if (typographyResult.tokens.length > 0) {
                expect(html).toContain('Typography');
            }
            if (spacingResult.tokens.length > 0) {
                expect(html).toContain('Spacing');
            }
            if (borderResult.tokens.length > 0) {
                expect(html).toContain('Border');
            }
            if (animationResult.tokens.length > 0) {
                expect(html).toContain('Animations');
            }

            // At least some tokens should have been found
            expect(allTokens.length).toBeGreaterThan(0);

            // Verify statistics
            expect(html).toContain(`<span class="stat-value">${allTokens.length}</span>`);
            expect(html).toContain('Total Tokens');
        }, 15000); // Extended timeout for parallel extractor execution
    });

    describe('Visual Representation Verification', () => {
        it('should include visual swatches for extracted colors', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have color swatches with background-color styles
            expect(html).toContain('color-swatch');
            expect(html).toContain('background-color:');

            // Should display hex values
            result.tokens.forEach(token => {
                const colorValue = token.value as any;
                expect(html).toContain(colorValue.hex);
            });
        });

        it('should include font samples for extracted typography', async () => {
            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const result = await typographyExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Only validate typography content if tokens were actually extracted
            if (result.tokens.length > 0) {
                // Should have typography samples with actual text
                expect(html).toContain('typography-sample');
                expect(html).toContain('The quick brown fox jumps over the lazy dog');

                // Should include font properties
                expect(html).toContain('font-family:');
                expect(html).toContain('font-size:');
                expect(html).toContain('font-weight:');
            } else {
                // If no typography tokens were extracted, styleguide should still be valid HTML
                expect(html).toContain('<!DOCTYPE html>');
                // The CSS may still contain the class name, so don't test for its absence
                // Just verify no actual typography section was generated
                expect(html).not.toContain('<section id="typography">');
            }
        });

        it('should include visual spacing scales', async () => {
            const spacingExtractor = new SpacingExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const result = await spacingExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have spacing visual elements
            expect(html).toContain('spacing-box');
            expect(html).toContain('width:');

            // Should display dimension values
            result.tokens.forEach(token => {
                expect(html).toContain(token.name);
            });
        });

        it('should include border samples', async () => {
            const borderExtractor = new BorderExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const result = await borderExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have border samples
            expect(html).toContain('border-sample');
            expect(html).toContain('border:');

            // Should include radius samples if present
            const radiusTokens = result.tokens.filter(t => t.category === 'radius');
            if (radiusTokens.length > 0) {
                expect(html).toContain('radius-sample');
                expect(html).toContain('border-radius:');
            }
        });

        it('should include shadow samples', async () => {
            const borderExtractor = new BorderExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const result = await borderExtractor.process(crawlResult);
            const shadowTokens = result.tokens.filter(t => t.type === 'shadow');

            if (shadowTokens.length > 0) {
                const generator = new StyleguideGenerator();
                const html = generator.generate(shadowTokens);

                // Should have shadow samples with box-shadow
                expect(html).toContain('shadow-sample');
                expect(html).toContain('box-shadow:');

                // Should display shadow properties
                expect(html).toContain('Offset:');
                expect(html).toContain('Blur:');
                expect(html).toContain('Spread:');
                expect(html).toContain('Color:');
            }
        });

        it('should include animation samples with timing information', async () => {
            const animationExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await animationExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have animation samples
            expect(html).toContain('animation-sample');
            expect(html).toContain('Hover to see animation');

            // Should display timing properties
            expect(html).toContain('Duration:');
            expect(html).toContain('Delay:');
            expect(html).toContain('Timing:');
            expect(html).toContain('cubic-bezier');
        });
    });

    describe('HTML Output Validation', () => {
        it('should generate valid HTML5 with all sections', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const colorResult = await colorExtractor.process(crawlResult);
            const typographyResult = await typographyExtractor.process(crawlResult);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(allTokens);

            // Verify HTML5 structure (should always be present)
            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('<html lang="en">');
            expect(html).toContain('<meta charset="UTF-8">');
            expect(html).toContain('<meta name="viewport"');

            // Verify navigation (should always be present)
            expect(html).toContain('<nav class="styleguide-nav">');

            // Verify sections based on what was actually extracted
            if (colorResult.tokens.length > 0) {
                expect(html).toContain('<section id="color">');
                expect(html).toContain('<a href="#color">');
            }

            if (typographyResult.tokens.length > 0) {
                expect(html).toContain('<section id="typography">');
                expect(html).toContain('<a href="#typography">');
            }

            // At least some tokens should have been found
            expect(allTokens.length).toBeGreaterThan(0);
        });

        it('should include embedded CSS styles', async () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<style>');
            expect(html).toContain('.styleguide-container');
            expect(html).toContain('.color-card');
            expect(html).toContain('.typography-sample');
            expect(html).toContain('</style>');
        });

        it('should include JavaScript for interactivity', async () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<script>');
            expect(html).toContain('querySelectorAll');
            expect(html).toContain('addEventListener');
            expect(html).toContain('</script>');
        });

        it('should write output to specified file path', async () => {
            const outputPath = path.join(testOutputDir, 'test-styleguide.html');

            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new StyleguideGenerator({
                outputPath
            });

            generator.generate(result.tokens);

            expect(fs.existsSync(outputPath)).toBe(true);

            const fileContent = fs.readFileSync(outputPath, 'utf-8');
            expect(fileContent).toContain('<!DOCTYPE html>');
            expect(fileContent.length).toBeGreaterThan(1000);
        });
    });

    describe('Token Category Grouping', () => {
        it('should group color tokens by category', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have separate sections for text and background colors
            const categories = [...new Set(result.tokens.map(t => t.category))];
            categories.forEach(category => {
                expect(html).toContain(`${category.charAt(0).toUpperCase() + category.slice(1)} Colors`);
            });
        });

        it('should group spacing tokens by type', async () => {
            const spacingExtractor = new SpacingExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const result = await spacingExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            // Should have separate sections for margin and padding
            const marginTokens = result.tokens.filter(t => t.category === 'margin');
            const paddingTokens = result.tokens.filter(t => t.category === 'padding');

            if (marginTokens.length > 0) {
                expect(html).toContain('Margin');
            }

            if (paddingTokens.length > 0) {
                expect(html).toContain('Padding');
            }
        });

        it('should group animation tokens by category', async () => {
            const animationExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await animationExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            const transitionTokens = result.tokens.filter(t => t.category === 'transition');
            const animationTokens = result.tokens.filter(t => t.category === 'animation');

            if (transitionTokens.length > 0) {
                expect(html).toContain('Transitions');
            }

            if (animationTokens.length > 0) {
                expect(html).toContain('Animations');
            }
        });
    });

    describe('Statistics and Metadata', () => {
        it('should display accurate token counts', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const colorResult = await colorExtractor.process(crawlResult);
            const typographyResult = await typographyExtractor.process(crawlResult);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(allTokens);

            expect(html).toContain(`<span class="stat-value">${allTokens.length}</span>`);
            expect(html).toContain('<span class="stat-label">Total Tokens</span>');
        });

        it('should display category counts', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const colorResult = await colorExtractor.process(crawlResult);
            const typographyResult = await typographyExtractor.process(crawlResult);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens
            ];

            const generator = new StyleguideGenerator();
            const html = generator.generate(allTokens);

            // Count unique categories (colors + typography = 2 minimum)
            const categories = new Set(allTokens.map(t => {
                if (t.type === 'color') return 'color';
                if (t.type === 'typography') return 'typography';
                return t.type;
            }));

            expect(html).toContain(`<span class="stat-value">${categories.size}</span>`);
            expect(html).toContain('<span class="stat-label">Categories</span>');
        });

        it('should include usage statistics when enabled', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new StyleguideGenerator({
                includeUsageStats: true
            });

            const html = generator.generate(result.tokens);

            // Should include usage count information
            result.tokens.forEach(token => {
                if (token.usageCount && token.usageCount > 0) {
                    expect(html).toContain(`Used ${token.usageCount} time`);
                }
            });
        });

        it('should include generation date in footer', async () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('Generated on');
            expect(html).toContain(new Date().getFullYear().toString());
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty token list gracefully', async () => {
            const generator = new StyleguideGenerator();
            const html = generator.generate([]);

            expect(html).toContain('<!DOCTYPE html>');
            expect(html).toContain('Design System Styleguide');
            expect(html).toContain('<span class="stat-value">0</span>');
        });

        it('should handle single category of tokens', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new StyleguideGenerator();
            const html = generator.generate(result.tokens);

            expect(html).toContain('Colors');
            // Should not include sections for missing categories
            expect(html).not.toMatch(/<section id="typography">/);
        });

        it('should create nested output directories if needed', async () => {
            const nestedPath = path.join(testOutputDir, 'nested', 'dir', 'styleguide.html');

            const generator = new StyleguideGenerator({
                outputPath: nestedPath
            });

            generator.generate([]);

            expect(fs.existsSync(nestedPath)).toBe(true);
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large numbers of tokens efficiently', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const typographyExtractor = new TypographyExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const spacingExtractor = new SpacingExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const borderExtractor = new BorderExtractorStage({
                outputDir: testOutputDir,
                minimumOccurrences: 1
            });

            const animationExtractor = new AnimationExtractorStage({
                includeTransitions: true,
                includeAnimations: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            // Extract all tokens
            const [colorResult, typographyResult, spacingResult, borderResult, animationResult] = await Promise.all([
                colorExtractor.process(crawlResult),
                typographyExtractor.process(crawlResult),
                spacingExtractor.process(crawlResult),
                borderExtractor.process(crawlResult),
                animationExtractor.process(crawlResult)
            ]);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens,
                ...spacingResult.tokens,
                ...borderResult.tokens,
                ...animationResult.tokens
            ];

            const startTime = Date.now();

            const generator = new StyleguideGenerator();
            const html = generator.generate(allTokens);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should generate within reasonable time (< 5 seconds for typical token count)
            expect(duration).toBeLessThan(5000);

            // Should produce valid HTML
            expect(html).toContain('<!DOCTYPE html>');
            expect(html.length).toBeGreaterThan(1000);
        });
    });
});
