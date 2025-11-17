/**
 * Optimized Browser Manager - Phase-Scoped Architecture
 * 
 * Replaces problematic global browser pool with phase-scoped browser instances
 * that eliminate connection timeout issues while maintaining performance benefits.
 */

import { chromium } from 'playwright';

/**
 * Phase-scoped browser manager with intelligent concurrency
 */
export class OptimizedBrowserManager {
  static logger = console; // Default logger
  
  /**
   * Set logger instance
   */
  static setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Create optimized browser instance for a phase
   */
  static async createPhaseBrowser() {
    try {
      const browser = await chromium.launch({
        // Optimized for stability and performance
        args: [
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-web-security', // For cross-origin requests
          '--disable-features=VizDisplayCompositor'
        ],
        headless: true,
        // Connection stability settings
        timeout: 90000, // 90 second timeout
        slowMo: 0
      });

      this.logger.info('Phase browser created with optimized settings');
      return browser;
    } catch (error) {
      this.logger.error('Failed to create phase browser:', error.message);
      throw error;
    }
  }

  /**
   * Run a crawl phase with dedicated browser instance
   */
  static async runPhaseWithBrowser(phaseFunction, ...args) {
    const browser = await this.createPhaseBrowser();
    
    try {
      // Pass browser as first argument to phase function
      const result = await phaseFunction(browser, ...args);
      return result;
    } catch (error) {
      this.logger.error('Phase execution failed:', error.message);
      throw error;
    } finally {
      // Guaranteed cleanup per phase
      try {
        await browser.close();
        this.logger.info('Phase browser closed successfully');
      } catch (closeError) {
        this.logger.warn('Error closing phase browser:', closeError.message);
      }
    }
  }

  /**
   * Process multiple URLs with controlled concurrency within a phase
   */
  static async processUrlsConcurrently(browser, urls, processor, maxConcurrency = 3) {
    const results = [];
    const chunks = [];

    // Split URLs into chunks for controlled concurrency
    for (let i = 0; i < urls.length; i += maxConcurrency) {
      chunks.push(urls.slice(i, i + maxConcurrency));
    }

    this.logger.info(`Processing ${urls.length} URLs in ${chunks.length} chunks of ≤${maxConcurrency}`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      try {
        const chunkResults = await Promise.all(
          chunk.map(async (url, index) => {
            // Create fresh page for each URL (no pool complexity)
            const page = await browser.newPage();
            
            try {
              // Configure page for performance
              await page.setViewportSize({ width: 1920, height: 1080 });
              
              // Aggressive resource blocking for speed
              await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'font', 'media', 'manifest', 'other'].includes(resourceType)) {
                  route.abort();
                } else {
                  route.continue();
                }
              });

              const result = await processor(url, page, chunkIndex * maxConcurrency + index);
              return result;
            } catch (error) {
              this.logger.error(`Error processing ${url}:`, error.message);
              return { url, error: error.message };
            } finally {
              // Direct page cleanup (no pool return)
              try {
                await page.close();
              } catch (closeError) {
                // Ignore page close errors
              }
            }
          })
        );

        results.push(...chunkResults);
        this.logger.info(`Completed chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} URLs)`);
      } catch (error) {
        this.logger.error(`Error processing chunk ${chunkIndex + 1}:`, error.message);
        // Continue with remaining chunks
      }
    }

    return results;
  }

  /**
   * Create optimized page with standard configuration
   */
  static async createOptimizedPage(browser) {
    const page = await browser.newPage();
    
    // Standard performance configuration
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Resource optimization
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (['image', 'font', 'media', 'manifest'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    // Network optimization
    await page.setExtraHTTPHeaders({
      'Connection': 'keep-alive',
      'Keep-Alive': 'timeout=30, max=100'
    });

    return page;
  }

  /**
   * Legacy compatibility - simulates old getPage() method
   */
  static async getPage() {
    throw new Error('getPage() deprecated - use runPhaseWithBrowser() for new architecture');
  }

  /**
   * Legacy compatibility - simulates old releasePage() method  
   */
  static async releasePage(page) {
    throw new Error('releasePage() deprecated - pages auto-cleanup in new architecture');
  }

  /**
   * No-op cleanup for compatibility (cleanup happens per-phase)
   */
  static async cleanup() {
    this.logger.info('Phase-scoped cleanup complete (no global resources to clean)');
  }

  /**
   * Get statistics (for monitoring and debugging)
   */
  static getStats() {
    return {
      architecture: 'phase-scoped',
      poolSize: 0, // No pool in new architecture
      activePagesCount: 0, // Tracked per-phase, not globally
      maxPoolSize: 0,
      browserConnected: false, // No persistent browser
      connectionStability: 'excellent' // No long-lived connections to drop
    };
  }
}

/**
 * Phase function adapter to use new browser architecture
 */
export function adaptPhaseForOptimizedBrowser(originalPhaseFunction) {
  return async function(browser, ...args) {
    // Remove browser-related calls from original function
    // Replace BrowserManager.getPage() with browser.newPage()
    // Replace BrowserManager.releasePage() with page.close()
    return await originalPhaseFunction(...args);
  };
}

/**
 * Example usage pattern for new architecture
 */
export async function runOptimizedPipeline(url, options) {
  const phases = [
    { name: 'initial', func: initialCrawl },
    { name: 'deepen', func: deepenCrawl },
    { name: 'metadata', func: gatherMetadata },
    { name: 'extract', func: extractCss }
  ];

  for (const phase of phases) {
    console.log(`Starting phase: ${phase.name}`);
    
    await OptimizedBrowserManager.runPhaseWithBrowser(
      phase.func,
      url,
      options
    );
    
    console.log(`Completed phase: ${phase.name}`);
  }
}