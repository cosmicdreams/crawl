/**
 * Crawl Optimizer - Production-Ready Concurrency Management
 * 
 * Provides adaptive optimization strategies based on site size and complexity.
 * Consolidates optimization patterns from multiple phases into a unified system.
 */

import { OptimizedBrowserManager } from './optimized-browser-manager.js';
import { AsyncFileManager } from './async-file-ops.js';

/**
 * Site size classification for adaptive optimization
 */
export const SITE_CATEGORIES = {
  SMALL: { maxPages: 15, label: 'Small Site' },
  MEDIUM: { maxPages: 50, label: 'Medium Site' },
  LARGE: { maxPages: Infinity, label: 'Large Site' }
};

/**
 * Optimization configurations by site category
 */
export const OPTIMIZATION_CONFIGS = {
  SMALL: {
    useSequential: true,
    concurrency: { metadata: 2, extract: 2, deepen: 3 },
    browserPools: { metadata: 1, extract: 1, deepen: 1 },
    interPhaseParallel: false,
    description: 'Sequential processing for optimal resource usage'
  },
  MEDIUM: {
    useSequential: false,
    concurrency: { metadata: 4, extract: 3, deepen: 6 },
    browserPools: { metadata: 2, extract: 1, deepen: 2 },
    interPhaseParallel: true,
    description: 'Moderate concurrency with parallel phases'
  },
  LARGE: {
    useSequential: false,
    concurrency: { metadata: 8, extract: 6, deepen: 12 },
    browserPools: { metadata: 4, extract: 2, deepen: 4 },
    interPhaseParallel: true,
    description: 'Maximum optimization for large-scale crawling'
  }
};

/**
 * Default retry and timeout configurations
 */
export const DEFAULT_CONFIG = {
  timeout: 45000,
  retries: 2,
  resourceBlocking: ['image', 'font', 'media', 'manifest', 'other'],
  viewport: { width: 1920, height: 1080 }
};

/**
 * Crawl Optimizer - Adaptive optimization based on site characteristics
 */
export class CrawlOptimizer {
  static logger = console;
  
  /**
   * Set logger instance
   */
  static setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Analyze site to determine optimal configuration
   */
  static async analyzeSite(pathsFilePath) {
    try {
      if (!(await AsyncFileManager.fileExists(pathsFilePath))) {
        return {
          category: 'SMALL',
          pageCount: 0,
          confidence: 'low',
          reason: 'No paths file found, assuming small site'
        };
      }

      const pathsData = await AsyncFileManager.readJsonFile(pathsFilePath);
      const pageCount = pathsData.all_paths?.length || 0;
      
      let category = 'LARGE';
      let confidence = 'high';
      
      if (pageCount <= SITE_CATEGORIES.SMALL.maxPages) {
        category = 'SMALL';
      } else if (pageCount <= SITE_CATEGORIES.MEDIUM.maxPages) {
        category = 'MEDIUM';
      }
      
      return {
        category,
        pageCount,
        confidence,
        reason: `${pageCount} pages detected`
      };
    } catch (error) {
      this.logger.warn('Site analysis failed, defaulting to small site optimization:', error.message);
      return {
        category: 'SMALL',
        pageCount: 0,
        confidence: 'low',
        reason: 'Analysis failed, using conservative settings'
      };
    }
  }

  /**
   * Get optimization configuration for a site category
   */
  static getOptimizationConfig(category, overrides = {}) {
    const baseConfig = OPTIMIZATION_CONFIGS[category] || OPTIMIZATION_CONFIGS.SMALL;
    
    return {
      ...baseConfig,
      ...overrides,
      // Deep merge concurrency settings
      concurrency: {
        ...baseConfig.concurrency,
        ...(overrides.concurrency || {})
      },
      browserPools: {
        ...baseConfig.browserPools,
        ...(overrides.browserPools || {})
      }
    };
  }

  /**
   * Create optimized page processor function with standardized configuration
   */
  static createPageProcessor(extractorFunction, config = {}) {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    
    return async (url, page, index) => {
      try {
        // Standard page configuration
        if (!page._configured) {
          await page.setViewportSize(finalConfig.viewport);
          
          // Resource blocking for performance
          await page.route('**/*', (route) => {
            const resourceType = route.request().resourceType();
            if (finalConfig.resourceBlocking.includes(resourceType)) {
              route.abort();
            } else {
              route.continue();
            }
          });
          
          page._configured = true;
        }

        // Navigate with timeout
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: finalConfig.timeout
        });

        // Execute the extractor function
        return await extractorFunction(url, page, index);
      } catch (error) {
        return {
          success: false,
          url,
          error: {
            type: error.name || 'Unknown',
            message: error.message || 'No details available',
            severity: 'high'
          }
        };
      }
    };
  }

  /**
   * Execute optimized URL processing with adaptive concurrency
   */
  static async processUrls(browser, urls, extractorFunction, phaseName, optimizationConfig, quiet = false) {
    const processor = this.createPageProcessor(extractorFunction);
    const concurrency = optimizationConfig.concurrency[phaseName.toLowerCase()] || 3;
    
    if (!quiet) {
      this.logger.info(`Processing ${urls.length} URLs for ${phaseName} with concurrency: ${concurrency}`);
    }
    
    return await OptimizedBrowserManager.processUrlsConcurrently(
      browser,
      urls,
      processor,
      concurrency
    );
  }

  /**
   * Generate optimization report
   */
  static generateOptimizationReport(siteAnalysis, config, performance = {}) {
    return {
      site: {
        category: siteAnalysis.category,
        pageCount: siteAnalysis.pageCount,
        confidence: siteAnalysis.confidence,
        reason: siteAnalysis.reason
      },
      optimization: {
        strategy: config.useSequential ? 'sequential' : 'parallel',
        description: config.description,
        concurrency: config.concurrency,
        browserPools: config.browserPools,
        interPhaseParallel: config.interPhaseParallel
      },
      performance: {
        duration: performance.duration || 'N/A',
        improvement: performance.improvement || 'N/A',
        throughput: performance.throughput || 'N/A'
      }
    };
  }

  /**
   * Validate optimization configuration
   */
  static validateConfig(config) {
    const errors = [];
    
    // Validate concurrency values
    for (const [phase, value] of Object.entries(config.concurrency || {})) {
      if (typeof value !== 'number' || value < 1 || value > 20) {
        errors.push(`Invalid concurrency for ${phase}: ${value} (must be 1-20)`);
      }
    }
    
    // Validate browser pool sizes
    for (const [phase, value] of Object.entries(config.browserPools || {})) {
      if (typeof value !== 'number' || value < 1 || value > 8) {
        errors.push(`Invalid browser pool size for ${phase}: ${value} (must be 1-8)`);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }
    
    return true;
  }
}

/**
 * Standardized error handling for crawler operations
 */
export class CrawlerError extends Error {
  constructor(message, phase, url, originalError) {
    super(message);
    this.name = 'CrawlerError';
    this.phase = phase;
    this.url = url;
    this.originalError = originalError;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      phase: this.phase,
      url: this.url,
      timestamp: this.timestamp,
      originalError: this.originalError?.message
    };
  }
}

/**
 * Result aggregator for consistent result handling across phases
 */
export class ResultAggregator {
  constructor(phaseName) {
    this.phaseName = phaseName;
    this.successResults = [];
    this.errorResults = [];
    this.startTime = Date.now();
  }

  addResult(result) {
    if (result.success) {
      this.successResults.push(result);
    } else {
      this.errorResults.push(result);
    }
  }

  getSummary() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    const total = this.successResults.length + this.errorResults.length;
    
    return {
      phase: this.phaseName,
      total,
      successful: this.successResults.length,
      failed: this.errorResults.length,
      successRate: total > 0 ? ((this.successResults.length / total) * 100).toFixed(1) : 0,
      duration: duration.toFixed(2),
      throughput: total > 0 ? (total / duration).toFixed(2) : 0
    };
  }

  getResults() {
    return {
      successful: this.successResults,
      failed: this.errorResults,
      summary: this.getSummary()
    };
  }
}
