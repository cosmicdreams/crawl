// src/core/stages/crawler-stage.ts
// Using ESM syntax
import { Browser, chromium } from 'playwright';
import { PipelineStage } from '../pipeline.js';
import { CrawlConfig, CrawlResult, PageInfo } from '../types.js';
import fs from 'node:fs';
import path from 'node:path';

export class CrawlerStage implements PipelineStage<CrawlConfig, CrawlResult> {
    name = 'crawler';

    async process(config: CrawlConfig): Promise<CrawlResult> {
        console.log(`Starting crawler with base URL: ${config.baseUrl}`);

        // Create output directory if it doesn't exist
        const outputDir = config.outputDir || './results';
        const screenshotsDir = path.join(outputDir, 'screenshots');

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        if (config.screenshots && !fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        const browser = await chromium.launch();
        const crawledPages: PageInfo[] = [];

        try {
            const context = await browser.newContext();
            const page = await context.newPage();

            // Set a reasonable timeout
            page.setDefaultTimeout(config.timeout);

            // Start with the base URL
            const visitedUrls = new Set<string>();
            const urlsToVisit = [config.baseUrl];

            while (urlsToVisit.length > 0 && crawledPages.length < config.maxPages) {
                const url = urlsToVisit.shift()!;

                if (visitedUrls.has(url)) {
                    continue;
                }

                visitedUrls.add(url);

                try {
                    // Navigate to the page
                    await page.goto(url, { waitUntil: 'domcontentloaded' });

                    // Get page info
                    const title = await page.title();
                    const status = 200; // Simplified
                    const contentType = 'text/html'; // Simplified

                    // Take screenshot if enabled
                    let screenshotPath;
                    if (config.screenshots) {
                        const screenshotFilename = `screenshot-${crawledPages.length}.jpg`;
                        screenshotPath = path.join(screenshotsDir, screenshotFilename);
                        await page.screenshot({ path: screenshotPath, type: 'jpeg', quality: 80 });
                    }

                    // Add to crawled pages
                    crawledPages.push({
                        url,
                        title,
                        status,
                        contentType,
                        screenshot: screenshotPath ? path.relative(outputDir, screenshotPath) : undefined
                    });

                    // Find links on the page
                    const links = await page.evaluate(() => {
                        return Array.from(document.querySelectorAll('a'))
                            .map(a => a.href)
                            .filter(href => href && href.length > 0);
                    });

                    // Filter and add new links to visit
                    for (const link of links) {
                        try {
                            const linkUrl = new URL(link);

                            // Skip if different domain
                            if (linkUrl.origin !== new URL(config.baseUrl).origin) {
                                continue;
                            }

                            // Skip if matches ignore patterns
                            if (config.ignorePatterns.some(pattern => link.includes(pattern))) {
                                continue;
                            }

                            // Skip if matches ignore extensions
                            if (config.ignoreExtensions.some(ext => link.endsWith(ext))) {
                                continue;
                            }

                            // Add to queue if not visited
                            if (!visitedUrls.has(link) && !urlsToVisit.includes(link)) {
                                urlsToVisit.push(link);
                            }
                        } catch (e) {
                            // Skip invalid URLs
                            console.error(`Invalid URL: ${link}`, e);
                            continue;
                        }
                    }
                } catch (error) {
                    console.error(`Error crawling ${url}:`, error);
                    // Continue with next URL
                }
            }
        } finally {
            await browser.close();
        }

        // Save crawl results to file
        const rawOutputDir = path.join(outputDir, 'raw');
        if (!fs.existsSync(rawOutputDir)) {
            fs.mkdirSync(rawOutputDir, { recursive: true });
        }

        const result: CrawlResult = {
            baseUrl: config.baseUrl,
            crawledPages,
            timestamp: new Date().toISOString()
        };

        const outputFile = path.join(rawOutputDir, 'crawl-results.json');
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`Crawl completed. Found ${crawledPages.length} pages. Results saved to ${outputFile}`);

        return result;
    }
}