// tests/integration/stages/spacing-extractor.integration.test.ts
/**
 * Integration tests for Spacing Extractor
 * Tests real browser-based extraction with actual HTML pages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SpacingExtractorStage } from '../../../src/core/stages/spacing-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { chromium, Browser, BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('SpacingExtractorStage Integration Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let testOutputDir: string;

    beforeEach(async () => {
        testOutputDir = path.join(__dirname, '../../temp/spacing-extraction-tests');
        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        browser = await chromium.launch();
        context = await browser.newContext();
    });

    afterEach(async () => {
        await context.close();
        await browser.close();

        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    describe('Real HTML Spacing Extraction', () => {
        it('should extract margin values from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box1 { margin: 16px; }
                        .box2 { margin: 1rem; }
                        .box3 { margin-top: 24px; margin-bottom: 24px; }
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

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
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
            expect(result.stats.marginSpacings).toBeGreaterThan(0);

            // Verify spec-compliant DimensionValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('dimension');
                expect(token.value).toHaveProperty('value');
                expect(token.value).toHaveProperty('unit');
                expect(['px', 'rem']).toContain(token.value.unit);
            });

            await page.close();
        });

        it('should extract padding values from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .padded1 { padding: 8px; }
                        .padded2 { padding: 0.5rem; }
                        .padded3 { padding-left: 12px; padding-right: 12px; }
                    </style>
                </head>
                <body>
                    <div class="padded1">Padded 1</div>
                    <div class="padded2">Padded 2</div>
                    <div class="padded3">Padded 3</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: false,
                includePadding: true,
                includeGap: false,
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
            expect(result.stats.paddingSpacings).toBeGreaterThan(0);

            await page.close();
        });

        it('should extract gap values from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .flex1 { display: flex; gap: 8px; }
                        .flex2 { display: flex; gap: 1rem; }
                        .grid1 { display: grid; row-gap: 16px; column-gap: 24px; }
                    </style>
                </head>
                <body>
                    <div class="flex1"><span>A</span><span>B</span></div>
                    <div class="flex2"><span>C</span><span>D</span></div>
                    <div class="grid1"><span>E</span><span>F</span></div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: false,
                includePadding: false,
                includeGap: true,
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
            expect(result.stats.gapSpacings).toBeGreaterThan(0);

            await page.close();
        });
    });

    describe('CSS Value Conversion', () => {
        it('should convert px values to spec-compliant DimensionValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box { margin: 16px; }
                    </style>
                </head>
                <body>
                    <div class="box">Content</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
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

            const pxToken = result.tokens.find(t => t.value.unit === 'px' && t.value.value === 16);
            expect(pxToken).toBeDefined();
            expect(pxToken?.name).toBe('margin-4');  // 16px = 1rem = spacing-4

            await page.close();
        });

        it('should convert rem values to spec-compliant DimensionValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box { padding: 1rem; }
                    </style>
                </head>
                <body>
                    <div class="box">Content</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: false,
                includePadding: true,
                includeGap: false,
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

            // Note: getComputedStyle() returns computed pixel values, not original CSS units
            // So 1rem gets computed to 16px (assuming default font size)
            const token = result.tokens.find(t => t.value.unit === 'px' && t.value.value === 16);
            expect(token).toBeDefined();
            expect(token?.name).toBe('padding-4');  // 16px = 1rem = spacing-4

            await page.close();
        });
    });

    describe('Deduplication Across Multiple Pages', () => {
        it('should deduplicate same spacing value across multiple pages', async () => {
            const sharedMargin = '16px';

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <head><style>.box { margin: ${sharedMargin}; }</style></head>
                <body><div class="box">Page 1</div></body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <head><style>.box { margin: ${sharedMargin}; }</style></head>
                <body><div class="box">Page 2</div></body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
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

            const marginToken = result.tokens.find(t => t.value.value === 16 && t.value.unit === 'px');

            expect(marginToken).toBeDefined();
            expect(marginToken?.usageCount).toBeGreaterThan(1);
            expect(marginToken?.sourceUrls?.length).toBe(2);
        });
    });

    describe('Filtering by Minimum Occurrences', () => {
        it('should filter out spacing values below minimum occurrences threshold', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .frequent { margin: 16px; }
                        .rare { margin: 24px; }
                    </style>
                </head>
                <body>
                    <div class="frequent">F1</div>
                    <div class="frequent">F2</div>
                    <div class="frequent">F3</div>
                    <div class="rare">R1</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
                minimumOccurrences: 2,
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

            // Frequent margin should appear
            const frequentToken = result.tokens.find(t => t.value.value === 16);
            expect(frequentToken).toBeDefined();

            await page.close();
        });
    });

    describe('Error Handling', () => {
        it('should handle pages that fail to load', async () => {
            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
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

            await expect(extractor.process(crawlResult)).resolves.toBeDefined();
        });

        it('should skip zero values', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .no-margin { margin: 0; }
                        .has-margin { margin: 16px; }
                    </style>
                </head>
                <body>
                    <div class="no-margin">No Margin</div>
                    <div class="has-margin">Has Margin</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
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

            // Should not include 0px values
            const zeroToken = result.tokens.find(t => t.value.value === 0);
            expect(zeroToken).toBeUndefined();

            await page.close();
        });
    });

    describe('File Output Verification', () => {
        it('should save results to correct output location', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head><style>.box { margin: 16px; }</style></head>
                <body><div class="box">Content</div></body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: false,
                includeGap: false,
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

            const outputFile = path.join(testOutputDir, 'raw', 'spacing-analysis.json');
            expect(fs.existsSync(outputFile)).toBe(true);

            await page.close();
        });

        it('should output valid JSON with spec-compliant structure', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box1 { margin: 16px; }
                        .box2 { padding: 8px; }
                    </style>
                </head>
                <body>
                    <div class="box1">Margin</div>
                    <div class="box2">Padding</div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: false,
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

            const outputFile = path.join(testOutputDir, 'raw', 'spacing-analysis.json');
            const fileContent = fs.readFileSync(outputFile, 'utf-8');
            const parsedTokens = JSON.parse(fileContent);

            expect(Array.isArray(parsedTokens)).toBe(true);

            parsedTokens.forEach((token: any) => {
                expect(token).toHaveProperty('type', 'dimension');
                expect(token).toHaveProperty('name');
                expect(token).toHaveProperty('value');
                expect(token.value).toHaveProperty('value');
                expect(token.value).toHaveProperty('unit');
            });

            await page.close();
        });
    });

    describe('Statistics Generation', () => {
        it('should generate accurate statistics for all spacing categories', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .box1 { margin: 16px; }
                        .box2 { padding: 8px; }
                        .box3 { display: flex; gap: 12px; }
                    </style>
                </head>
                <body>
                    <div class="box1">Margin</div>
                    <div class="box2">Padding</div>
                    <div class="box3"><span>Gap</span><span>Items</span></div>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new SpacingExtractorStage({
                includeMargins: true,
                includePadding: true,
                includeGap: true,
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
            expect(result.stats.totalSpacings).toBeGreaterThan(0);

            await page.close();
        });
    });
});
