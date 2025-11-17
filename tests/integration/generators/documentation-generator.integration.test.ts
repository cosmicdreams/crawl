// tests/integration/generators/documentation-generator.integration.test.ts
/**
 * Integration tests for Documentation Generator
 * Tests complete documentation generation from real extracted tokens
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DocumentationGenerator } from '../../../src/core/generators/documentation-generator.js';
import { StyleguideGenerator } from '../../../src/core/generators/styleguide-generator.js';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { TypographyExtractorStage } from '../../../src/core/stages/typography-extractor-stage.js';
import { SpacingExtractorStage } from '../../../src/core/stages/spacing-extractor-stage.js';
import { BorderExtractorStage } from '../../../src/core/stages/border-extractor-stage.js';
import { AnimationExtractorStage } from '../../../src/core/stages/animation-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('DocumentationGenerator Integration Tests', () => {
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
                .accent { color: #f59e0b; }
                .background { background-color: #f3f4f6; }
                .surface { background-color: #ffffff; }
                .text { color: #1f2937; }
                .text-muted { color: #6b7280; }

                /* Typography */
                h1 { font-family: Georgia, serif; font-size: 32px; font-weight: 700; line-height: 1.2; }
                h2 { font-family: Georgia, serif; font-size: 24px; font-weight: 600; line-height: 1.3; }
                p { font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.6; }
                .small { font-family: Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.5; }
                .large { font-family: Arial, sans-serif; font-size: 20px; font-weight: 500; line-height: 1.4; }

                /* Spacing */
                .margin-xs { margin: 4px; }
                .margin-sm { margin: 8px; }
                .margin-md { margin: 16px; }
                .margin-lg { margin: 24px; }
                .padding-sm { padding: 8px; }
                .padding-md { padding: 16px; }
                .padding-lg { padding: 24px; }

                /* Borders */
                .border-thin { border: 1px solid #e5e7eb; }
                .border-medium { border: 2px solid #d1d5db; }
                .border-thick { border: 3px solid #9ca3af; }
                .rounded-sm { border-radius: 4px; }
                .rounded-md { border-radius: 8px; }
                .rounded-lg { border-radius: 12px; }
                .circle { border-radius: 50%; }

                /* Shadows */
                .shadow-sm { box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
                .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
                .shadow-xl { box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }

                /* Animations */
                .fade { transition: opacity 0.3s ease-in-out; }
                .slide { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                .scale { transition: transform 0.2s ease-out; }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                .pulse { animation: pulse 2s ease-in-out infinite; }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin { animation: spin 1s linear infinite; }
            </style>
        </head>
        <body>
            <div class="primary">Primary color</div>
            <div class="secondary">Secondary color</div>
            <div class="accent">Accent color</div>
            <div class="background">Background</div>
            <div class="surface">Surface</div>
            <div class="text">Text</div>
            <div class="text-muted">Text muted</div>

            <h1>Heading 1</h1>
            <h2>Heading 2</h2>
            <p>Paragraph text</p>
            <span class="small">Small text</span>
            <span class="large">Large text</span>

            <div class="margin-xs">Margin XS</div>
            <div class="margin-sm">Margin small</div>
            <div class="margin-md">Margin medium</div>
            <div class="margin-lg">Margin large</div>
            <div class="padding-sm">Padding small</div>
            <div class="padding-md">Padding medium</div>
            <div class="padding-lg">Padding large</div>

            <div class="border-thin">Thin border</div>
            <div class="border-medium">Medium border</div>
            <div class="border-thick">Thick border</div>
            <div class="rounded-sm">Rounded small</div>
            <div class="rounded-md">Rounded medium</div>
            <div class="rounded-lg">Rounded large</div>
            <div class="circle">Circle</div>

            <div class="shadow-sm">Small shadow</div>
            <div class="shadow-md">Medium shadow</div>
            <div class="shadow-lg">Large shadow</div>
            <div class="shadow-xl">XL shadow</div>

            <div class="fade">Fade transition</div>
            <div class="slide">Slide transition</div>
            <div class="scale">Scale transition</div>
            <div class="pulse">Pulse animation</div>
            <div class="spin">Spin animation</div>
        </body>
        </html>
    `;

    beforeAll(async () => {
        testOutputDir = path.join(process.cwd(), 'test-output-docs-integration');

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
        it('should generate documentation from tokens extracted by all extractors', async () => {
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

            // Extract tokens from all extractors in parallel
            const [colorResult, typographyResult, spacingResult, borderResult, animationResult] = await Promise.all([
                colorExtractor.process(crawlResult),
                typographyExtractor.process(crawlResult),
                spacingExtractor.process(crawlResult),
                borderExtractor.process(crawlResult),
                animationExtractor.process(crawlResult)
            ]);

            // Combine all tokens
            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens,
                ...spacingResult.tokens,
                ...borderResult.tokens,
                ...animationResult.tokens
            ];

            // Generate documentation
            const docsOutputDir = path.join(testOutputDir, 'docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeApiDocs: true,
                includeIntegrationGuides: true
            });

            await generator.generate(allTokens);

            // Verify README was created
            const readmePath = path.join(docsOutputDir, 'README.md');
            expect(fs.existsSync(readmePath)).toBe(true);

            const readmeContent = fs.readFileSync(readmePath, 'utf-8');

            // Verify README structure
            expect(readmeContent).toContain('# Design System Documentation');
            expect(readmeContent).toContain('## Overview');
            expect(readmeContent).toContain('## Quick Start');
            expect(readmeContent).toContain(`**Total Tokens**: ${allTokens.length}`);

            // Verify token category links are present based on what was extracted
            if (colorResult.tokens.length > 0) {
                expect(readmeContent).toContain('Color Tokens');
            }
            if (typographyResult.tokens.length > 0) {
                expect(readmeContent).toContain('Typography Tokens');
            }
            if (spacingResult.tokens.length > 0) {
                expect(readmeContent).toContain('Spacing Tokens');
            }
            if (borderResult.tokens.length > 0) {
                expect(readmeContent).toContain('Border');
            }
            if (animationResult.tokens.length > 0) {
                expect(readmeContent).toContain('Animation');
            }

            // Verify category documentation files were created
            const categoryFiles = fs.readdirSync(docsOutputDir).filter(f => f.endsWith('-tokens.md') && f !== 'README.md');
            expect(categoryFiles.length).toBeGreaterThan(0);

            // At least some tokens should have been found
            expect(allTokens.length).toBeGreaterThan(0);
        }, 15000); // Extended timeout for parallel extractor execution

        it('should generate both styleguide and documentation in same workflow', async () => {
            // Extract some tokens
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            // Generate styleguide
            const styleguideOutputPath = path.join(testOutputDir, 'styleguide.html');
            const styleguideGen = new StyleguideGenerator({
                outputPath: styleguideOutputPath
            });
            styleguideGen.generate(result.tokens);

            // Generate documentation
            const docsOutputDir = path.join(testOutputDir, 'docs-with-styleguide');
            const docsGen = new DocumentationGenerator({
                outputDir: docsOutputDir
            });
            await docsGen.generate(result.tokens);

            // Verify both outputs exist
            expect(fs.existsSync(styleguideOutputPath)).toBe(true);
            expect(fs.existsSync(path.join(docsOutputDir, 'README.md'))).toBe(true);

            // Verify styleguide is HTML
            const styleguideContent = fs.readFileSync(styleguideOutputPath, 'utf-8');
            expect(styleguideContent).toContain('<!DOCTYPE html>');

            // Verify documentation is Markdown
            const readmeContent = fs.readFileSync(path.join(docsOutputDir, 'README.md'), 'utf-8');
            expect(readmeContent).toContain('# Design System Documentation');
        });
    });

    describe('Category Documentation Files', () => {
        it('should create separate markdown file for each token category', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'category-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(result.tokens);

            // Should have created color-tokens.md
            const colorDocPath = path.join(docsOutputDir, 'color-tokens.md');
            expect(fs.existsSync(colorDocPath)).toBe(true);

            const content = fs.readFileSync(colorDocPath, 'utf-8');
            expect(content).toContain('# Color Tokens');
            expect(content).toContain('## Token List');
        });

        it('should include token details in category documentation', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'detailed-category-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(result.tokens);

            const colorDocPath = path.join(docsOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            // Should include token names and values
            result.tokens.forEach(token => {
                expect(content).toContain(token.name);
            });

            // Should have markdown table
            expect(content).toContain('| Token Name |');
            expect(content).toContain('|---');
        });

        it('should group tokens by category within documentation', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'grouped-category-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(result.tokens);

            const colorDocPath = path.join(docsOutputDir, 'color-tokens.md');
            const content = fs.readFileSync(colorDocPath, 'utf-8');

            // Should have the main color tokens title
            expect(content).toContain('# Color Tokens');

            // Should list all tokens
            result.tokens.forEach(token => {
                expect(content).toContain(token.name);
            });
        });
    });

    describe('API Documentation', () => {
        it('should generate API documentation when enabled', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'api-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeApiDocs: true
            });

            await generator.generate(result.tokens);

            const apiDocPath = path.join(docsOutputDir, 'api-reference.md');
            expect(fs.existsSync(apiDocPath)).toBe(true);

            const content = fs.readFileSync(apiDocPath, 'utf-8');
            expect(content).toContain('# API Reference');
            expect(content).toContain('## Token Access');
        });

        it('should not generate API documentation when disabled', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'no-api-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeApiDocs: false
            });

            await generator.generate(result.tokens);

            const apiDocPath = path.join(docsOutputDir, 'api-reference.md');
            expect(fs.existsSync(apiDocPath)).toBe(false);
        });
    });

    describe('Framework Integration Guides', () => {
        it('should generate all framework guides when enabled', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'framework-guides');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeIntegrationGuides: true
            });

            await generator.generate(result.tokens);

            // Should have integration guide files for default frameworks (react, vue, css-variables)
            const frameworks = ['react', 'vue', 'css-variables'];
            frameworks.forEach(framework => {
                const guidePath = path.join(docsOutputDir, `integration-${framework}.md`);
                expect(fs.existsSync(guidePath)).toBe(true);

                const content = fs.readFileSync(guidePath, 'utf-8');
                expect(content).toContain('# ');
                expect(content).toContain('## Installation');
                expect(content).toContain('## Setup');
            });
        });

        it('should include code examples in framework guides', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'framework-examples');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeIntegrationGuides: true
            });

            await generator.generate(result.tokens);

            // Check React guide for code examples
            const reactGuidePath = path.join(docsOutputDir, 'integration-react.md');
            const reactContent = fs.readFileSync(reactGuidePath, 'utf-8');

            expect(reactContent).toContain('```');
            expect(reactContent).toContain('import');
        });

        it('should not generate guides when disabled', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'no-guides');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeIntegrationGuides: false
            });

            await generator.generate(result.tokens);

            // Should not have integration guide files
            const frameworks = ['react', 'vue', 'css-variables', 'sass', 'tailwind'];
            frameworks.forEach(framework => {
                const guidePath = path.join(docsOutputDir, `integration-${framework}.md`);
                expect(fs.existsSync(guidePath)).toBe(false);
            });
        });
    });

    describe('Multi-Category Integration', () => {
        it('should handle multiple token types in single documentation set', async () => {
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

            const [colorResult, typographyResult, spacingResult] = await Promise.all([
                colorExtractor.process(crawlResult),
                typographyExtractor.process(crawlResult),
                spacingExtractor.process(crawlResult)
            ]);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens,
                ...spacingResult.tokens
            ];

            const docsOutputDir = path.join(testOutputDir, 'multi-category');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(allTokens);

            // Verify README has all categories
            const readmePath = path.join(docsOutputDir, 'README.md');
            const readmeContent = fs.readFileSync(readmePath, 'utf-8');

            if (colorResult.tokens.length > 0) {
                expect(readmeContent).toContain('Color');
            }
            if (typographyResult.tokens.length > 0) {
                expect(readmeContent).toContain('Typography');
            }
            if (spacingResult.tokens.length > 0) {
                expect(readmeContent).toContain('Spacing');
            }

            // Verify category files exist (at least one category should have tokens)
            const files = fs.readdirSync(docsOutputDir);
            const categoryFiles = files.filter(f => f.endsWith('-tokens.md'));
            expect(categoryFiles.length).toBeGreaterThan(0);
        });

        it('should maintain consistent formatting across all categories', async () => {
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

            const [colorResult, typographyResult] = await Promise.all([
                colorExtractor.process(crawlResult),
                typographyExtractor.process(crawlResult)
            ]);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens
            ];

            const docsOutputDir = path.join(testOutputDir, 'consistent-formatting');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(allTokens);

            const files = fs.readdirSync(docsOutputDir).filter(f => f.endsWith('-tokens.md'));

            files.forEach(file => {
                const content = fs.readFileSync(path.join(docsOutputDir, file), 'utf-8');

                // All category files should have consistent structure
                expect(content).toContain('# ');
                expect(content).toContain('## Token List');
                expect(content).toContain('| Token Name |');
            });
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('should handle empty token list gracefully', async () => {
            const docsOutputDir = path.join(testOutputDir, 'empty-docs');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate([]);

            // Should still create README
            const readmePath = path.join(docsOutputDir, 'README.md');
            expect(fs.existsSync(readmePath)).toBe(true);

            const content = fs.readFileSync(readmePath, 'utf-8');
            expect(content).toContain('# Design System Documentation');
            expect(content).toContain('**Total Tokens**: 0');
        });

        it('should create nested output directories if needed', async () => {
            const nestedPath = path.join(testOutputDir, 'nested', 'deep', 'docs');

            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const generator = new DocumentationGenerator({
                outputDir: nestedPath
            });

            await generator.generate(result.tokens);

            expect(fs.existsSync(path.join(nestedPath, 'README.md'))).toBe(true);
        });

        it('should handle single token category', async () => {
            const colorExtractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const result = await colorExtractor.process(crawlResult);

            const docsOutputDir = path.join(testOutputDir, 'single-category');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir
            });

            await generator.generate(result.tokens);

            const readmePath = path.join(docsOutputDir, 'README.md');
            const readmeContent = fs.readFileSync(readmePath, 'utf-8');

            // Should only mention color tokens
            expect(readmeContent).toContain('Color');
            // Should not have sections for missing categories
            expect(readmeContent).not.toContain('Typography Tokens:');
        });
    });

    describe('Performance and Scalability', () => {
        it('should handle large numbers of tokens efficiently', async () => {
            // Extract all token types
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

            // Extract all tokens in parallel
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

            const docsOutputDir = path.join(testOutputDir, 'performance-test');
            const generator = new DocumentationGenerator({
                outputDir: docsOutputDir,
                includeApiDocs: true,
                includeIntegrationGuides: true
            });

            const startTime = Date.now();
            await generator.generate(allTokens);
            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should generate within reasonable time (< 5 seconds for typical token count)
            expect(duration).toBeLessThan(5000);

            // Verify all outputs were created
            expect(fs.existsSync(path.join(docsOutputDir, 'README.md'))).toBe(true);

            // Verify README content is valid
            const readmeContent = fs.readFileSync(path.join(docsOutputDir, 'README.md'), 'utf-8');
            expect(readmeContent).toContain('# Design System Documentation');
            expect(readmeContent.length).toBeGreaterThan(500);
        });
    });

    describe('Cross-Generator Integration', () => {
        it('should work seamlessly with StyleguideGenerator output', async () => {
            // Extract tokens
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

            const [colorResult, typographyResult] = await Promise.all([
                colorExtractor.process(crawlResult),
                typographyExtractor.process(crawlResult)
            ]);

            const allTokens = [
                ...colorResult.tokens,
                ...typographyResult.tokens
            ];

            // Generate both styleguide and documentation
            const outputDir = path.join(testOutputDir, 'cross-generator');
            const docsOutputDir = path.join(outputDir, 'docs');
            const styleguideOutputPath = path.join(outputDir, 'styleguide.html');

            const styleguideGen = new StyleguideGenerator({
                outputPath: styleguideOutputPath
            });
            styleguideGen.generate(allTokens);

            const docsGen = new DocumentationGenerator({
                outputDir: docsOutputDir
            });
            await docsGen.generate(allTokens);

            // Both should use the same tokens
            expect(fs.existsSync(styleguideOutputPath)).toBe(true);
            expect(fs.existsSync(path.join(docsOutputDir, 'README.md'))).toBe(true);

            // Verify both contain references to the same tokens
            const styleguideContent = fs.readFileSync(styleguideOutputPath, 'utf-8');
            const readmeContent = fs.readFileSync(path.join(docsOutputDir, 'README.md'), 'utf-8');

            // Both should show the same total token count
            expect(styleguideContent).toContain(`${allTokens.length}`);
            expect(readmeContent).toContain(`${allTokens.length}`);
        });
    });
});
