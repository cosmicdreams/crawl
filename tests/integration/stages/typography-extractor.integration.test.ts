// tests/integration/stages/typography-extractor.integration.test.ts
/**
 * Integration tests for Typography Extractor
 * Tests real browser-based extraction with actual HTML pages
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TypographyExtractor } from '../../../src/core/stages/typography-extractor.js';
import { CrawlResult } from '../../../src/core/types.js';
import { chromium, Browser, BrowserContext } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TypographyExtractor Integration Tests', () => {
    let browser: Browser;
    let context: BrowserContext;
    let testOutputDir: string;

    beforeEach(async () => {
        // Set up test output directory
        testOutputDir = path.join(__dirname, '../../temp/typography-extraction-tests');
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

    describe('Real HTML Typography Extraction', () => {
        it('should extract heading styles from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        h1 { font-family: Georgia, serif; font-size: 32px; font-weight: 700; line-height: 1.2; }
                        h2 { font-family: Arial, sans-serif; font-size: 24px; font-weight: 600; line-height: 1.3; }
                        h3 { font-family: Arial, sans-serif; font-size: 18px; font-weight: 500; line-height: 1.4; }
                    </style>
                </head>
                <body>
                    <h1>Main Heading</h1>
                    <h2>Subheading</h2>
                    <h3>Section Heading</h3>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
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
            expect(result.stats.headingStyles).toBeGreaterThan(0);

            // Verify spec-compliant TypographyValue structure
            result.tokens.forEach(token => {
                expect(token.type).toBe('typography');
                expect(token.value).toHaveProperty('fontFamily');
                expect(token.value).toHaveProperty('fontSize');
                expect(token.value).toHaveProperty('fontWeight');
                expect(token.value).toHaveProperty('lineHeight');
            });

            await page.close();
        });

        it('should extract body text styles from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        p { font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.5; }
                        span { font-family: Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 1.4; }
                        a { font-family: Arial, sans-serif; font-size: 16px; font-weight: 500; line-height: 1.5; text-decoration: underline; }
                    </style>
                </head>
                <body>
                    <p>Paragraph text</p>
                    <span>Inline text</span>
                    <a href="#">Link text</a>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: false,
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
            expect(result.stats.bodyStyles).toBeGreaterThan(0);

            await page.close();
        });

        it('should extract special text styles from real HTML', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        code { font-family: monospace; font-size: 14px; font-weight: 400; line-height: 1.4; }
                        blockquote { font-family: Georgia, serif; font-size: 18px; font-weight: 400; line-height: 1.6; font-style: italic; }
                        strong { font-weight: 700; }
                    </style>
                </head>
                <body>
                    <code>const x = 42;</code>
                    <blockquote>Quote text</blockquote>
                    <strong>Bold text</strong>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: false,
                includeSpecialText: true,
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
            expect(result.stats.specialStyles).toBeGreaterThan(0);

            await page.close();
        });
    });

    describe('CSS Property Conversion', () => {
        it('should convert font properties to spec-compliant TypographyValue', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        h1 {
                            font-family: "Helvetica Neue", Arial, sans-serif;
                            font-size: 2rem;
                            font-weight: 700;
                            line-height: 1.2;
                            letter-spacing: -0.5px;
                        }
                    </style>
                </head>
                <body>
                    <h1>Test Heading</h1>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
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

            // Verify spec-compliant structure
            const h1Token = result.tokens.find(t => t.name === 'heading-h1');
            expect(h1Token).toBeDefined();
            expect(h1Token?.value).toHaveProperty('fontFamily');
            expect(h1Token?.value).toHaveProperty('fontSize');
            expect(h1Token?.value).toHaveProperty('fontWeight');
            expect(h1Token?.value).toHaveProperty('lineHeight');

            await page.close();
        });

        it('should handle various font-family formats', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .font1 { font-family: Arial, sans-serif; }
                        .font2 { font-family: "Times New Roman", Times, serif; }
                        .font3 { font-family: monospace; }
                    </style>
                </head>
                <body>
                    <p class="font1">Font 1</p>
                    <p class="font2">Font 2</p>
                    <code class="font3">Font 3</code>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: true,
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

            // All tokens should have valid fontFamily values
            result.tokens.forEach(token => {
                expect(token.value.fontFamily).toBeDefined();
            });

            await page.close();
        });

        it('should handle various font-size units', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .size1 { font-size: 16px; }
                        .size2 { font-size: 1.5rem; }
                        .size3 { font-size: 1.2em; }
                    </style>
                </head>
                <body>
                    <p class="size1">Size 1</p>
                    <p class="size2">Size 2</p>
                    <p class="size3">Size 3</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: false,
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

            // All tokens should have valid fontSize values with DimensionValue structure
            result.tokens.forEach(token => {
                expect(token.value.fontSize).toBeDefined();
            });

            await page.close();
        });

        it('should handle font-weight values', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .weight1 { font-weight: normal; }
                        .weight2 { font-weight: bold; }
                        .weight3 { font-weight: 700; }
                        .weight4 { font-weight: 300; }
                    </style>
                </head>
                <body>
                    <p class="weight1">Normal</p>
                    <p class="weight2">Bold</p>
                    <p class="weight3">700</p>
                    <p class="weight4">300</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: false,
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

            // All tokens should have valid fontWeight values
            result.tokens.forEach(token => {
                expect(token.value.fontWeight).toBeDefined();
            });

            await page.close();
        });
    });

    describe('Deduplication Across Multiple Pages', () => {
        it('should deduplicate same typography style across multiple pages', async () => {
            const sharedStyle = `
                h1 { font-family: Arial, sans-serif; font-size: 32px; font-weight: 700; line-height: 1.2; }
            `;

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <head><style>${sharedStyle}</style></head>
                <body><h1>Page 1</h1></body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <head><style>${sharedStyle}</style></head>
                <body><h1>Page 2</h1></body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
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

            // Find the shared style
            const h1Token = result.tokens.find(t => t.name === 'heading-h1');

            expect(h1Token).toBeDefined();
            expect(h1Token?.usageCount).toBeGreaterThan(1);
            expect(h1Token?.sourceUrls?.length).toBe(2);
        });

        it('should track usage count correctly across pages', async () => {
            const commonStyle = `
                p { font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.5; }
            `;

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <head><style>${commonStyle}</style></head>
                <body>
                    <p>Text 1</p>
                    <p>Text 2</p>
                </body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <head><style>${commonStyle}</style></head>
                <body><p>Text 3</p></body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: false,
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

            const pToken = result.tokens.find(t => t.name === 'body-text');

            expect(pToken).toBeDefined();
            expect(pToken?.usageCount).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Filtering by Minimum Occurrences', () => {
        it('should filter out styles below minimum occurrences threshold', async () => {
            // Note: usageCount tracks pages, not elements. To test filtering, we need
            // h1 to appear on 2 pages (usageCount=2) and h2 only on 1 page (usageCount=1)
            const sharedH1Style = `h1 { font-size: 32px; }`;
            const h2Style = `h2 { font-size: 24px; }`;

            const page1Html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        ${sharedH1Style}
                        ${h2Style}
                    </style>
                </head>
                <body>
                    <h1>Page 1 H1</h1>
                    <h2>Page 1 H2</h2>
                </body>
                </html>
            `;

            const page2Html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        ${sharedH1Style}
                    </style>
                </head>
                <body>
                    <h1>Page 2 H1</h1>
                </body>
                </html>
            `;

            const url1 = `data:text/html,${encodeURIComponent(page1Html)}`;
            const url2 = `data:text/html,${encodeURIComponent(page2Html)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
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

            // h1 should appear (usageCount=2 pages), h2 should not (usageCount=1 page)
            const h1Token = result.tokens.find(t => t.name === 'heading-h1');
            const h2Token = result.tokens.find(t => t.name === 'heading-h2');

            expect(h1Token).toBeDefined();
            expect(h1Token?.usageCount).toBe(2);
            expect(h2Token).toBeUndefined(); // h2 only appears on 1 page, below threshold
        });
    });

    describe('Error Handling', () => {
        it('should handle pages that fail to load', async () => {
            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: true,
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

        it('should handle malformed CSS gracefully', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        .invalid { font-size: not-a-size; }
                        .valid { font-size: 16px; }
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

            const extractor = new TypographyExtractor({
                includeHeadings: false,
                includeBodyText: true,
                includeSpecialText: false,
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

            // Valid style should be extracted (browser will fallback to default for invalid)
            expect(result.tokens.length).toBeGreaterThan(0);

            await page.close();
        });
    });

    describe('File Output Verification', () => {
        it('should save results to correct output location', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <body>
                    <h1>Test Heading</h1>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: false,
                includeSpecialText: false,
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
            const outputFile = path.join(testOutputDir, 'raw', 'typography-analysis.json');
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
                        h1 { font-family: Arial, sans-serif; font-size: 32px; font-weight: 700; line-height: 1.2; }
                        p { font-family: Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 1.5; }
                    </style>
                </head>
                <body>
                    <h1>Heading</h1>
                    <p>Paragraph</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: false,
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
            const outputFile = path.join(testOutputDir, 'raw', 'typography-analysis.json');
            const fileContent = fs.readFileSync(outputFile, 'utf-8');
            const parsedTokens = JSON.parse(fileContent);

            // Verify structure
            expect(Array.isArray(parsedTokens)).toBe(true);

            parsedTokens.forEach((token: any) => {
                expect(token).toHaveProperty('type', 'typography');
                expect(token).toHaveProperty('name');
                expect(token).toHaveProperty('value');
                expect(token.value).toHaveProperty('fontFamily');
                expect(token.value).toHaveProperty('fontSize');
                expect(token.value).toHaveProperty('fontWeight');
                expect(token.value).toHaveProperty('lineHeight');
            });

            await page.close();
        });

        it('should sort tokens by usage count in output file', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        h1 { font-size: 32px; }
                        h2 { font-size: 24px; }
                        p { font-size: 16px; }
                    </style>
                </head>
                <body>
                    <h1>H1 1</h1>
                    <h1>H1 2</h1>
                    <h1>H1 3</h1>
                    <h2>H2 1</h2>
                    <h2>H2 2</h2>
                    <p>P 1</p>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: false,
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
            const outputFile = path.join(testOutputDir, 'raw', 'typography-analysis.json');
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
        it('should generate accurate statistics for all typography categories', async () => {
            const page = await context.newPage();

            const testHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        h1 { font-size: 32px; }
                        p { font-size: 16px; }
                        code { font-family: monospace; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>Heading</h1>
                    <p>Paragraph</p>
                    <code>Code</code>
                </body>
                </html>
            `;

            await page.setContent(testHtml);
            const url = `data:text/html,${encodeURIComponent(testHtml)}`;

            const extractor = new TypographyExtractor({
                includeHeadings: true,
                includeBodyText: true,
                includeSpecialText: true,
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
            expect(result.stats.totalStyles).toBeGreaterThan(0);
            expect(result.stats.headingStyles).toBeGreaterThan(0);
            expect(result.stats.bodyStyles).toBeGreaterThan(0);
            expect(result.stats.specialStyles).toBeGreaterThan(0);

            await page.close();
        });
    });
});
