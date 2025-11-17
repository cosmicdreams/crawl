/**
 * Browser Instance Pool for Performance Optimization
 * 
 * Provides shared browser management across all crawling phases to eliminate
 * the 12-20 second overhead of browser startup/teardown per phase.
 */

import { chromium } from 'playwright';
import { logger as defaultLogger } from '../../dist/utils/logger.js';

/**
 * High-performance browser instance manager with page pooling
 */
export class BrowserManager {
  static browser = null;
  static logger = defaultLogger;
  static pagePool = [];
  
  /**
   * Set logger instance (used by CLI to provide strategy logger)
   */
  static setLogger(logger) {
    this.logger = logger;
  }
  static isInitialized = false;
  static maxPoolSize = 5;
  static currentPages = 0;

  /**
   * Get shared browser instance (lazy initialization)
   */
  static async getBrowser() {
    if (!this.browser) {
      try {
        this.browser = await chromium.launch({
          // Performance-optimized launch options
          args: [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
          ],
          headless: true
        });

        // Handle browser disconnect
        this.browser.on('disconnected', () => {
          this.browser = null;
          this.pagePool = [];
          this.isInitialized = false;
          this.logger.warn('Browser disconnected, pool reset');
        });

        this.isInitialized = true;
        this.logger.info('Browser instance initialized for shared use');
      } catch (error) {
        this.logger.error('Failed to initialize browser:', error.message);
        throw error;
      }
    }
    return this.browser;
  }

  /**
   * Get a page from the pool or create a new one
   */
  static async getPage() {
    const browser = await this.getBrowser();

    // Return pooled page if available
    if (this.pagePool.length > 0) {
      const page = this.pagePool.pop();
      this.currentPages++;
      return page;
    }

    // Create new page if under limit
    try {
      const page = await browser.newPage();
      this.currentPages++;
      
      // Configure page for performance
      await page.setViewportSize({ width: 1920, height: 1080 });
      
      // Disable unnecessary resources for speed
      await page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        if (['image', 'font', 'media'].includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });

      return page;
    } catch (error) {
      this.logger.error('Failed to create page:', error.message);
      throw error;
    }
  }

  /**
   * Return page to pool for reuse
   */
  static async releasePage(page) {
    try {
      if (!page || page.isClosed()) {
        this.currentPages = Math.max(0, this.currentPages - 1);
        return;
      }

      // Reset page state for reuse
      await Promise.all([
        page.goto('about:blank').catch(() => {}),
        page.evaluate(() => {
          // Clear any global state
          if (typeof window !== 'undefined') {
            window.localStorage?.clear();
            window.sessionStorage?.clear();
          }
        }).catch(() => {})
      ]);

      // Return to pool if under max size
      if (this.pagePool.length < this.maxPoolSize) {
        this.pagePool.push(page);
      } else {
        await page.close().catch(() => {});
      }
      
      this.currentPages = Math.max(0, this.currentPages - 1);
    } catch (error) {
      this.logger.warn('Error releasing page:', error.message);
      this.currentPages = Math.max(0, this.currentPages - 1);
    }
  }

  /**
   * Process multiple URLs in parallel with controlled concurrency
   */
  static async processUrlsConcurrently(urls, processor, maxConcurrency = 3) {
    const results = [];
    const chunks = [];

    // Split URLs into chunks for controlled concurrency
    for (let i = 0; i < urls.length; i += maxConcurrency) {
      chunks.push(urls.slice(i, i + maxConcurrency));
    }

    this.logger.info(`Processing ${urls.length} URLs in chunks of ${maxConcurrency}`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      try {
        const chunkResults = await Promise.all(
          chunk.map(async (url, index) => {
            const page = await this.getPage();
            
            try {
              const result = await processor(url, page, chunkIndex * maxConcurrency + index);
              return result;
            } catch (error) {
              this.logger.error(`Error processing ${url}:`, error.message);
              return { url, error: error.message };
            } finally {
              await this.releasePage(page);
            }
          })
        );

        results.push(...chunkResults);
        this.logger.info(`Completed chunk ${chunkIndex + 1}/${chunks.length}`);
      } catch (error) {
        this.logger.error(`Error processing chunk ${chunkIndex + 1}:`, error.message);
        // Continue with remaining chunks
      }
    }

    return results;
  }

  /**
   * Get browser and page pool statistics
   */
  static getStats() {
    return {
      isInitialized: this.isInitialized,
      poolSize: this.pagePool.length,
      activePagesCount: this.currentPages,
      maxPoolSize: this.maxPoolSize,
      browserConnected: !!this.browser
    };
  }

  /**
   * Graceful shutdown of browser and cleanup
   */
  static async cleanup() {
    try {
      this.logger.info('Cleaning up browser manager...');
      
      // Close all pooled pages
      const closePromises = this.pagePool.map(page => 
        page.close().catch(err => logger.warn('Error closing pooled page:', err.message))
      );
      await Promise.all(closePromises);

      // Close browser
      if (this.browser) {
        await this.browser.close();
        this.logger.info('Browser closed successfully');
      }

      // Reset state
      this.browser = null;
      this.pagePool = [];
      this.currentPages = 0;
      this.isInitialized = false;
    } catch (error) {
      this.logger.error('Error during browser cleanup:', error.message);
    }
  }

  /**
   * Force cleanup on process termination
   */
  static setupGracefulShutdown() {
    const cleanup = () => {
      this.cleanup().finally(() => process.exit(0));
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    process.on('beforeExit', cleanup);
  }
}

// Initialize graceful shutdown
BrowserManager.setupGracefulShutdown();