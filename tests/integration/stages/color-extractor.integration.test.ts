// tests/integration/stages/color-extractor.integration.test.ts
/**
 * Integration tests for Color Extractor Stage
 * Tests real browser-based extraction with actual HTML pages
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ColorExtractorStage } from '../../../src/core/stages/color-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { chromium, Browser, BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('ColorExtractorStage Integration Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let testOutputDir: string;

    beforeEach(async () => {
        // Set up test output directory
        testOutputDir = path.join(__dirname, '../../temp/color-extraction-tests');
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Launch browser for integration tests
        browser = await chromium.launch();
        context = await browser.newContext();
    });

    afterEach(async () => {
        await context.close();
        await browser.close();

        // Clean up test output directory
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Real HTML Color Extraction', () => {
        it('should extract text colors from real HTML', async () => {
            const page = await context.newPage();

            // Create test HTML with various text colors
            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .primary { color: #0066cc; }
                        .secondary { color: rgb(255, 99, 71); }
                        .tertiary { color: hsl(120, 100%, 50%); }
                    </style>
                </head>
                <body>
                    <h1 class="primary">Primary Text</h1>
                    <p class="secondary">Secondary Text</p>
                    <span class="tertiary">Tertiary Text</span>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Verify tokens were extracted
            expect(result.tokens.length).toBeGreaterThan(0);

            // Verify spec-compliant ColorValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('color');
                expect(token.value).toHaveProperty('colorSpace');
                expect(token.value).toHaveProperty('components');
                expect(token.value).toHaveProperty('hex');
                expect(token.value.colorSpace).toBe('srgb');
                expect(Array.isArray(token.value.components)).toBe(true);
                expect(token.value.components).toHaveLength(3);
            });

            await page.close();
        });

        it('should extract background colors from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box1 { background-color: #ff6347; }
                        .box2 { background-color: rgba(0, 123, 255, 0.8); }
                        .box3 { background: linear-gradient(to right, #ff0000, #00ff00); }
                    </style>
                </head>
                <body>
                    <div class="box1">Box 1</div>
                    <div class="box2">Box 2</div>
                    <div class="box3">Box 3</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: false,
                includeBackgroundColors: true,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.backgroundColors).toBeGreaterThan(0);

            await page.close();
        });

        it('should extract border colors from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .bordered { border: 2px solid #333333; }
                        .multi-border {
                            border-top-color: #ff0000;
                            border-right-color: #00ff00;
                            border-bottom-color: #0000ff;
                            border-left-color: #ffff00;
                        }
                    </style>
                </head>
                <body>
                    <div class="bordered">Bordered</div>
                    <div class="multi-border">Multi Border</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: false,
                includeBackgroundColors: false,
                includeBorderColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.borderColors).toBeGreaterThan(0);

            await page.close();
        });
    });

    describe('CSS Color Format Conversion', () => {
        it('should convert hex colors to spec-compliant ColorValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body style="color: #0066cc;">
                    <p>Test</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            const hexToken = result.tokens.find(t => t.value.hex?.toLowerCase() === '#0066cc');
            expect(hexToken).toBeDefined();
            expect(hexToken?.value.colorSpace).toBe('srgb');
            expect(hexToken?.value.components).toEqual([0, 0.4, 0.8]);

            await page.close();
        });

        it('should convert rgb/rgba colors to spec-compliant ColorValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: rgb(255, 0, 0);">Red</p>
                    <p style="color: rgba(0, 255, 0, 0.5);">Green Semi-transparent</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Check for red color
            const redToken = result.tokens.find(t => t.value.hex?.toLowerCase() === '#ff0000');
            expect(redToken).toBeDefined();
            expect(redToken?.value.components).toEqual([1, 0, 0]);

            // Check for green semi-transparent color
            const greenToken = result.tokens.find(t => t.value.hex?.toLowerCase() === '#00ff00');
            expect(greenToken).toBeDefined();
            expect(greenToken?.value.alpha).toBeCloseTo(0.5, 1);

            await page.close();
        });

        it('should convert hsl/hsla colors to spec-compliant ColorValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: hsl(120, 100%, 50%);">Green</p>
                    <p style="color: hsla(240, 100%, 50%, 0.7);">Blue Semi-transparent</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);

            // All tokens should have spec-compliant ColorValue structure
            result.tokens.forEach(token => {
                expect(token.value.colorSpace).toBe('srgb');
                expect(token.value.components).toHaveLength(3);
                expect(token.value.hex).toMatch(/^#[0-9a-f]{6}$/i);
            });

            await page.close();
        });
    });

    describe('Deduplication Across Multiple Pages', () => {
        it('should deduplicate same color across multiple pages', async () => {
            const sharedColor = '#0066cc';

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <body style="color: ${sharedColor};">
                    <p>Page 1</p>
                </body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <h1 style="color: ${sharedColor};">Page 2</h1>
                </body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url1,
                crawledPages: [
                    { url: url1, title: 'Page 1', status: 200, contentType: 'text/html' },
                    { url: url2, title: 'Page 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Find the shared color token
            const sharedToken = result.tokens.find(t => t.value.hex?.toLowerCase() === sharedColor);

            expect(sharedToken).toBeDefined();
            expect(sharedToken?.usageCount).toBeGreaterThan(1);
            expect(sharedToken?.sourceUrls?.length).toBe(2);
        });

        it('should track usage count correctly across pages', async () => {
            const commonColor = '#ff0000';

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: ${commonColor};">Text 1</p>
                    <span style="color: ${commonColor};">Text 2</span>
                </body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div style="color: ${commonColor};">Text 3</div>
                </body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url1,
                crawledPages: [
                    { url: url1, title: 'Page 1', status: 200, contentType: 'text/html' },
                    { url: url2, title: 'Page 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            const redToken = result.tokens.find(t => t.value.hex?.toLowerCase() === commonColor);

            expect(redToken).toBeDefined();
            // Should appear once per page in the map (deduped within each page)
            expect(redToken?.usageCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Filtering by Minimum Occurrences', () => {
        it('should filter out colors below minimum occurrences threshold', async () => {
            const frequentColor = '#0066cc';
            const rareColor = '#ff00ff';

            // Page 1: frequent color appears, rare color appears
            const page1Html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: ${frequentColor};">Frequent on page 1</p>
                    <span style="color: ${rareColor};">Rare on page 1</span>
                </body>
                </html>
            `;

            // Page 2: frequent color appears again (will meet threshold)
            const page2Html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <div style="color: ${frequentColor};">Frequent on page 2</div>
                </body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 2,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url1,
                crawledPages: [
                    { url: url1, title: 'Page 1', status: 200, contentType: 'text/html' },
                    { url: url2, title: 'Page 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Rare color should not appear (only on 1 page, below threshold of 2)
            const rareToken = result.tokens.find(t => t.value.hex?.toLowerCase() === rareColor.toLowerCase());
            expect(rareToken).toBeUndefined();

            // Frequent color should appear (on 2 pages, meets threshold)
            const frequentToken = result.tokens.find(t => t.value.hex?.toLowerCase() === frequentColor.toLowerCase());
            expect(frequentToken).toBeDefined();
            expect(frequentToken?.usageCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Error Handling', () => {
        it('should handle pages that fail to load', async () => {
            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                includeBorderColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: 'https://nonexistent.example.com',
                crawledPages: [{
                    url: 'https://nonexistent.example.com/404',
                    title: 'Not Found',
                    status: 404,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            // Should not throw, but handle gracefully
            await expect(extractor.process(crawlResult)).resolves.toBeDefined();
        });

        it('should skip transparent colors', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: rgba(0, 0, 0, 0);">Transparent</p>
                    <span style="color: #ff0000;">Visible</span>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Transparent color should not be in results
            const transparentToken = result.tokens.find(t =>
                t.value.components.every((c: number) => c === 0) && t.value.alpha === 0
            );
            expect(transparentToken).toBeUndefined();

            await page.close();
        });

        it('should handle malformed CSS gracefully', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .invalid { color: not-a-color; }
                        .valid { color: #ff0000; }
                    </style>
                </head>
                <body>
                    <p class="invalid">Invalid</p>
                    <p class="valid">Valid</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            // Should complete without throwing
            const result = await extractor.process(crawlResult);

            // Valid color should be extracted
            const validToken = result.tokens.find(t => t.value.hex?.toLowerCase() === '#ff0000');
            expect(validToken).toBeDefined();

            await page.close();
        });
    });

    describe('File Output Verification', () => {
        it('should save results to correct output location', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body style="color: #0066cc;">
                    <p>Test</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            await extractor.process(crawlResult);

            // Verify output file was created
            const outputFile = path.join(testOutputDir, 'raw', 'color-analysis.json');
            expect(fs.existsSync(outputFile)).toBe(true);

            await page.close();
        });

        it('should output valid JSON with spec-compliant structure', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: #ff0000;">Red</p>
                    <span style="color: #00ff00;">Green</span>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            await extractor.process(crawlResult);

            // Read and parse output file
            const outputFile = path.join(testOutputDir, 'raw', 'color-analysis.json');
            const fileContent = fs.readFileSync(outputFile, 'utf-8');
            const parsedTokens = JSON.parse(fileContent);

            // Verify structure
            expect(Array.isArray(parsedTokens)).toBe(true);

            parsedTokens.forEach((token: any) => {
                expect(token).toHaveProperty('type', 'color');
                expect(token).toHaveProperty('name');
                expect(token).toHaveProperty('value');
                expect(token.value).toHaveProperty('colorSpace');
                expect(token.value).toHaveProperty('components');
                expect(token.value).toHaveProperty('hex');
            });

            await page.close();
        });

        it('should sort tokens by usage count in output file', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <p style="color: #ff0000;">Red 1</p>
                    <span style="color: #ff0000;">Red 2</span>
                    <div style="color: #ff0000;">Red 3</div>
                    <em style="color: #00ff00;">Green 1</em>
                    <strong style="color: #0000ff;">Blue 1</strong>
                    <strong style="color: #0000ff;">Blue 2</strong>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: false,
                includeBorderColors: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            await extractor.process(crawlResult);

            // Read output file
            const outputFile = path.join(testOutputDir, 'raw', 'color-analysis.json');
            const fileContent = fs.readFileSync(outputFile, 'utf-8');
            const parsedTokens = JSON.parse(fileContent);

            // Verify tokens are sorted by usage count descending
            for (let i = 1; i < parsedTokens.length; i++) {
                expect(parsedTokens[i - 1].usageCount).toBeGreaterThanOrEqual(parsedTokens[i].usageCount);
            }

            await page.close();
        });
    });

    describe('Statistics Generation', () => {
        it('should generate accurate statistics for all color types', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .text { color: #ff0000; }
                        .bg { background-color: #00ff00; }
                        .border { border: 1px solid #0000ff; }
                    </style>
                </head>
                <body>
                    <p class="text">Text</p>
                    <div class="bg">Background</div>
                    <span class="border">Border</span>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new ColorExtractorStage({
                includeTextColors: true,
                includeBackgroundColors: true,
                includeBorderColors: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl: url,
                crawledPages: [{
                    url,
                    title: 'Test Page',
                    status: 200,
                    contentType: 'text/html'
                }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.stats).toBeDefined();
            expect(result.stats.totalColors).toBeGreaterThan(0);
            expect(result.stats.textColors).toBeGreaterThan(0);
            expect(result.stats.backgroundColors).toBeGreaterThan(0);
            expect(result.stats.borderColors).toBeGreaterThan(0);

            await page.close();
        });
    });
});
