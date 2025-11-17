// src/core/stages/crawler-stage.ts
// Using ESM syntax
import { Browser, chromium } from 'playwright';
import { PipelineStage } from '../pipeline.js';
import { CrawlConfig, CrawlResult, PageInfo } from '../types.js';
import { logger } from '../../utils/logger.js';
import fs from 'node:fs';
import path from 'node:path';

export class CrawlerStage implements PipelineStage<CrawlConfig, CrawlResult> {
    name = 'crawler';

    async process(config: CrawlConfig): Promise<CrawlResult> {
        logger.info('Starting crawler', { baseUrl: config.baseUrl });

        // Create output directory if it doesn't exist
        const outputDir = config.outputDir || './results';
        const screenshotsDir = path.join(outputDir, 'screenshots');

        await fs.promises.mkdir(outputDir, { recursive: true });

        if (config.screenshots) {
            await fs.promises.mkdir(screenshotsDir, { recursive: true });
        }

        const browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--memory-pressure-off',
                '--max-old-space-size=4096'
            ]
        });
        const crawledPages: PageInfo[] = [];

        let context: any = null;
        let page: any = null;
        
        try {
            context = await browser.newContext({
                viewport: { width: 1920, height: 1080 },
                userAgent: 'Mozilla/5.0 (compatible; Design-Token-Crawler/1.0)'
            });
            
            page = await context.newPage();

            // Set a reasonable timeout
            page.setDefaultTimeout(config.timeout);
            
            // Optimize resource loading
            await page.route('**/*', (route: any) => {
                const resourceType = route.request().resourceType();
                // Block unnecessary resources to improve performance
                if (['font', 'image', 'media'].includes(resourceType) && !config.screenshots) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

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

                    // Periodic memory cleanup every 10 pages
                    if (crawledPages.length % 10 === 0) {
                        try {
                            await page.evaluate(() => {
                                if (typeof window !== 'undefined' && window.performance) {
                                    window.performance.clearResourceTimings();
                                }
                                if (typeof window !== 'undefined' && (window as any).gc) {
                                    (window as any).gc();
                                }
                            });
                            logger.debug('Performed periodic memory cleanup', { pagesCrawled: crawledPages.length });
                        } catch (cleanupError) {
                            // Ignore cleanup errors
                        }
                    }

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
                            logger.error(`Invalid URL: ${link}`, { error: e instanceof Error ? e.message : String(e), url });
                            continue;
                        }
                    }
                } catch (error) {
                    logger.error('Error crawling page', { url, error: error instanceof Error ? error.message : String(error) });
                    // Clear page resources and continue
                    try {
                        await page.evaluate(() => {
                            // Clear page cache and resources
                            if (typeof window !== 'undefined' && window.performance) {
                                window.performance.clearResourceTimings();
                            }
                        });
                    } catch (cleanupError) {
                        // Ignore cleanup errors
                    }
                }
            }
        } finally {
            // Ensure proper cleanup of resources
            try {
                if (page) {
                    await page.close();
                }
                if (context) {
                    await context.close();
                }
            } catch (cleanupError) {
                logger.warn('Error during page/context cleanup', { error: cleanupError });
            } finally {
                await browser.close();
            }
        }

        // Save crawl results to file
        const rawOutputDir = path.join(outputDir, 'raw');
        await fs.promises.mkdir(rawOutputDir, { recursive: true });

        const result: CrawlResult = {
            baseUrl: config.baseUrl,
            crawledPages,
            timestamp: new Date().toISOString()
        };

        const outputFile = path.join(rawOutputDir, 'crawl-results.json');
        await fs.promises.writeFile(outputFile, JSON.stringify(result, null, 2));
        logger.info('Crawl completed', { pagesFound: crawledPages.length, outputFile });

        return result;
    }
}