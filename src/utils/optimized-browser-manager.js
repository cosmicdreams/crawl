/**
 * Production-Ready Browser Manager
 * 
 * Features:
 * - Phase-scoped browser lifecycle for connection stability
 * - Adaptive concurrency based on optimization configuration
 * - Standardized page configuration and resource blocking
 * - Comprehensive error handling and cleanup
 */

import { chromium } from 'playwright';

/**
 * Production browser manager with adaptive optimization support
 */
export class OptimizedBrowserManager {
  static logger = console;
  
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
   * Run a crawl phase with dedicated browser instance (single browser mode)
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
   * Process multiple URLs with adaptive concurrency (production-ready)
   */
  static async processUrlsConcurrently(browser, urls, processor, maxConcurrency = 3) {
    const results = [];
    const chunks = [];

    // Split URLs into chunks for controlled concurrency
    for (let i = 0; i < urls.length; i += maxConcurrency) {
      chunks.push(urls.slice(i, i + maxConcurrency));
    }

    this.logger.info(`Processing ${urls.length} URLs in ${chunks.length} chunks with concurrency: ${maxConcurrency}`);

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      try {
        const chunkResults = await Promise.all(
          chunk.map(async (url, index) => {
            const page = await browser.newPage();
            
            try {
              // Standard page configuration
              await page.setViewportSize({ width: 1920, height: 1080 });
              
              // Production-optimized resource blocking
              await page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                if (['image', 'font', 'media', 'manifest', 'other'].includes(resourceType)) {
                  route.abort();
                } else {
                  route.continue();
                }
              });

              return await processor(url, page, chunkIndex * maxConcurrency + index);
            } catch (error) {
              this.logger.error(`Error processing ${url}:`, error.message);
              return { 
                success: false, 
                url, 
                error: { 
                  type: error.name || 'ProcessingError', 
                  message: error.message,
                  severity: 'high'
                }
              };
            } finally {
              try {
                await page.close();
              } catch (closeError) {
                // Ignore page close errors - common during cleanup
              }
            }
          })
        );

        results.push(...chunkResults);
        this.logger.info(`Completed chunk ${chunkIndex + 1}/${chunks.length} (${chunk.length} URLs)`);
      } catch (error) {
        this.logger.error(`Error processing chunk ${chunkIndex + 1}:`, error.message);
        // Continue with remaining chunks for resilience
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
   * Legacy compatibility methods
   */
  static async getPage() {
    throw new Error('getPage() deprecated - use runPhaseWithBrowser() for new architecture');
  }

  static async releasePage(page) {
    throw new Error('releasePage() deprecated - pages auto-cleanup in new architecture');
  }

  static async cleanup() {
    this.logger.info('Phase-scoped cleanup complete (no global resources to clean)');
  }

  /**
   * Get statistics (for monitoring and debugging)
   */
  static getStats() {
    return {
      architecture: 'phase-scoped-production',
      browserModel: 'single-browser-per-phase',
      connectionStability: 'excellent',
      resourceManagement: 'automatic-cleanup'
    };
  }
}

/**
 * Legacy adapter functions for backward compatibility
 */
export function adaptPhaseForOptimizedBrowser(originalPhaseFunction) {
  return async function(browser, ...args) {
    return await originalPhaseFunction(...args);
  };
}