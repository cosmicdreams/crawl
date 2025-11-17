// tests/integration/stages/border-extractor.integration.test.ts
/**
 * Integration tests for Border Extractor
 * Tests end-to-end border extraction with real HTML and browser
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { BorderExtractorStage } from '../../../src/core/stages/border-extractor-stage.js';
import { CrawlResult } from '../../../src/core/types.js';
import { chromium, Browser } from 'playwright';
import { createServer } from 'http';
import { AddressInfo } from 'net';
import fs from 'node:fs';
import path from 'node:path';

describe('BorderExtractorStage Integration Tests', () => {
    let browser: Browser;
    let server: ReturnType<typeof createServer>;
    let baseUrl: string;
    let testOutputDir: string;

    beforeAll(async () => {
        browser = await chromium.launch();
        testOutputDir = path.join(process.cwd(), 'test-output-border');

        if (!fs.existsSync(testOutputDir)) {
            fs.mkdirSync(testOutputDir, { recursive: true });
        }

        // Create a simple HTTP server for test pages
        server = createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(req.url === '/page1' ? testHtmlPage1 : testHtmlPage2);
        });

        await new Promise<void>((resolve) => {
            server.listen(0, () => {
                const port = (server.address() as AddressInfo).port;
                baseUrl = `http://localhost:${port}`;
                resolve();
            });
        });
    });

    afterAll(async () => {
        await browser.close();
        server.close();

        // Cleanup test output
        if (fs.existsSync(testOutputDir)) {
            fs.rmSync(testOutputDir, { recursive: true, force: true });
        }
    });

    const testHtmlPage1 = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .box1 { border-width: 1px; border-style: solid; border-radius: 4px; }
                .box2 { border-width: 2px; border-style: dashed; border-radius: 8px; }
                .box3 { border-width: 1px; border-style: solid; border-radius: 4px; }
                .shadow1 { box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); }
                .shadow2 { box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.1); }
            </style>
        </head>
        <body>
            <div class="box1">Box 1</div>
            <div class="box2">Box 2</div>
            <div class="box3">Box 3</div>
            <div class="shadow1">Shadow 1</div>
            <div class="shadow2">Shadow 2</div>
        </body>
        </html>
    `;

    const testHtmlPage2 = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .card { border-width: 1px; border-style: solid; border-radius: 0.5rem; }
                .btn { border-radius: 9999px; box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.1); }
            </style>
        </head>
        <body>
            <div class="card">Card</div>
            <button class="btn">Button</button>
        </body>
        </html>
    `;

    describe('Border Width Extraction', () => {
        it('should extract border widths from real HTML', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.borderWidths).toBeGreaterThan(0);

            // Verify spec-compliant DimensionValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('dimension');
                expect(token.category).toBe('width');
                expect(token.value).toHaveProperty('value');
                expect(token.value).toHaveProperty('unit');
                expect(['px', 'rem']).toContain((token.value as any).unit);
            });
        });

        it('should deduplicate identical border widths', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Find the 1px border width token
            const borderWidth1px = result.tokens.find(t =>
                t.category === 'width' && (t.value as any).value === 1
            );

            expect(borderWidth1px).toBeDefined();
            // Should be used by box1 and box3
            expect(borderWidth1px!.usageCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Border Style Extraction', () => {
        it('should extract border styles from real HTML', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: true,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.borderStyles).toBeGreaterThan(0);

            // Verify spec-compliant BorderStyleValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('strokeStyle');
                expect(token.category).toBe('style');
                expect(typeof token.value).toBe('string');
                expect(['solid', 'dashed', 'dotted', 'double']).toContain(token.value as string);
            });
        });

        it('should extract both solid and dashed styles', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: true,
                includeBorderRadius: false,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            const solidStyle = result.tokens.find(t => t.value === 'solid');
            const dashedStyle = result.tokens.find(t => t.value === 'dashed');

            expect(solidStyle).toBeDefined();
            expect(dashedStyle).toBeDefined();
        });
    });

    describe('Border Radius Extraction', () => {
        it('should extract border radii from real HTML', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: true,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.borderRadii).toBeGreaterThan(0);

            // Verify spec-compliant DimensionValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('dimension');
                expect(token.category).toBe('radius');
                expect(token.value).toHaveProperty('value');
                expect(token.value).toHaveProperty('unit');
            });
        });

        it('should handle both px and rem radius values', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: true,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [
                    { url: `${baseUrl}/page1`, title: 'Test 1', status: 200, contentType: 'text/html' },
                    { url: `${baseUrl}/page2`, title: 'Test 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Note: getComputedStyle() returns computed pixel values, not original CSS units
            // So 0.5rem from page2 gets computed to 8px (0.5 * 16px default font size)
            const pxRadii = result.tokens.filter(t => (t.value as any).unit === 'px');

            // All radii should be in px after browser computation
            expect(pxRadii.length).toBeGreaterThan(0);
            expect(result.tokens.every(t => (t.value as any).unit === 'px')).toBe(true);

            // Verify we got the expected radius values from both pages
            // Page1: 4px, 8px, 9999px
            // Page2: 8px (0.5rem computed), 9999px
            const has4px = result.tokens.some(t => (t.value as any).value === 4);
            const has8px = result.tokens.some(t => (t.value as any).value === 8);
            const has9999px = result.tokens.some(t => (t.value as any).value === 9999);

            expect(has4px).toBe(true);
            expect(has8px).toBe(true);
            expect(has9999px).toBe(true);
        });

        it('should generate semantic names for common radius values', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: true,
                includeShadows: false,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [
                    { url: `${baseUrl}/page1`, title: 'Test 1', status: 200, contentType: 'text/html' },
                    { url: `${baseUrl}/page2`, title: 'Test 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Should have semantic names like border-radius-sm, border-radius-md, border-radius-full
            const hasSemanticNames = result.tokens.some(t =>
                t.name.includes('sm') || t.name.includes('md') || t.name.includes('lg') || t.name.includes('full')
            );

            expect(hasSemanticNames).toBe(true);
        });
    });

    describe('Shadow Extraction', () => {
        it('should extract box shadows from real HTML', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.tokens.length).toBeGreaterThan(0);
            expect(result.stats.shadows).toBeGreaterThan(0);

            // Verify spec-compliant ShadowValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('shadow');
                expect(token.category).toBe('shadow');
                expect(token.value).toHaveProperty('color');
                expect(token.value).toHaveProperty('offsetX');
                expect(token.value).toHaveProperty('offsetY');
                expect(token.value).toHaveProperty('blur');
                expect(token.value).toHaveProperty('spread');
            });
        });

        it('should extract shadow color information', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            const shadowToken = result.tokens[0];
            const shadowValue = shadowToken.value as any;

            expect(shadowValue.color).toBeDefined();
            expect(shadowValue.color).toHaveProperty('colorSpace');
            expect(shadowValue.color).toHaveProperty('components');
            expect(shadowValue.color).toHaveProperty('alpha');
        });

        it('should generate semantic names for shadow sizes', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: false,
                includeBorderStyle: false,
                includeBorderRadius: false,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Should have semantic names like shadow-sm, shadow-md, shadow-lg
            const hasSemanticNames = result.tokens.some(t =>
                t.name.includes('sm') || t.name.includes('md') || t.name.includes('lg')
            );

            expect(hasSemanticNames).toBe(true);
        });
    });

    describe('Deduplication Across Pages', () => {
        it('should deduplicate borders across multiple pages', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [
                    { url: `${baseUrl}/page1`, title: 'Test 1', status: 200, contentType: 'text/html' },
                    { url: `${baseUrl}/page2`, title: 'Test 2', status: 200, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Find the 1px border width that appears in both pages
            const borderWidth1px = result.tokens.find(t =>
                t.category === 'width' && (t.value as any).value === 1 && (t.value as any).unit === 'px'
            );

            expect(borderWidth1px).toBeDefined();
            expect(borderWidth1px!.sourceUrls.length).toBe(2);
            expect(borderWidth1px!.sourceUrls).toContain(`${baseUrl}/page1`);
            expect(borderWidth1px!.sourceUrls).toContain(`${baseUrl}/page2`);
        });
    });

    describe('Filtering by Minimum Occurrences', () => {
        it('should filter borders by minimum occurrences', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 3,  // Only include borders that appear 3+ times
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // All returned tokens should have usageCount >= 3
            result.tokens.forEach(token => {
                expect(token.usageCount).toBeGreaterThanOrEqual(3);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle pages that fail to load', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [
                    { url: `${baseUrl}/page1`, title: 'Test 1', status: 200, contentType: 'text/html' },
                    { url: `${baseUrl}/nonexistent`, title: 'Not Found', status: 404, contentType: 'text/html' }
                ],
                timestamp: new Date().toISOString()
            };

            // Should not throw, but handle gracefully
            const result = await extractor.process(crawlResult);

            // Should still extract from page1
            expect(result.tokens.length).toBeGreaterThan(0);
        });
    });

    describe('File Output', () => {
        it('should save results to JSON file', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            await extractor.process(crawlResult);

            const outputFile = path.join(testOutputDir, 'raw', 'border-analysis.json');
            expect(fs.existsSync(outputFile)).toBe(true);

            const fileContent = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
            expect(Array.isArray(fileContent)).toBe(true);
            expect(fileContent.length).toBeGreaterThan(0);
        });

        it('should sort results by usage count', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            // Verify sorting (descending by usage count)
            for (let i = 0; i < result.tokens.length - 1; i++) {
                expect(result.tokens[i].usageCount).toBeGreaterThanOrEqual(
                    result.tokens[i + 1].usageCount
                );
            }
        });
    });

    describe('Statistics Generation', () => {
        it('should generate accurate statistics for all border categories', async () => {
            const extractor = new BorderExtractorStage({
                includeBorderWidth: true,
                includeBorderStyle: true,
                includeBorderRadius: true,
                includeShadows: true,
                minimumOccurrences: 1,
                outputDir: testOutputDir
            });

            const crawlResult: CrawlResult = {
                baseUrl,
                crawledPages: [{ url: `${baseUrl}/page1`, title: 'Test', status: 200, contentType: 'text/html' }],
                timestamp: new Date().toISOString()
            };

            const result = await extractor.process(crawlResult);

            expect(result.stats).toBeDefined();
            expect(result.stats.totalBorders).toBeGreaterThan(0);
            expect(result.stats.uniqueBorders).toBeGreaterThan(0);
            expect(result.stats.borderWidths).toBeGreaterThan(0);
            expect(result.stats.borderStyles).toBeGreaterThan(0);
            expect(result.stats.borderRadii).toBeGreaterThan(0);
            expect(result.stats.shadows).toBeGreaterThan(0);

            // Verify sum of categories equals unique borders
            const categoriesSum =
                result.stats.borderWidths +
                result.stats.borderStyles +
                result.stats.borderRadii +
                result.stats.shadows;

            expect(categoriesSum).toBe(result.stats.uniqueBorders);
        });
    });
});
