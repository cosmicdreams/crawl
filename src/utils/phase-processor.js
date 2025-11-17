/**
 * Phase Processor - Consolidated processing logic for all crawler phases
 * 
 * Eliminates code duplication across metadata.js, extract.js, and deepen-crawl.js
 * while providing consistent error handling and result aggregation.
 */

import path from 'path';
import chalk from 'chalk';
import { AsyncFileManager } from './async-file-ops.js';
import { CrawlOptimizer, ResultAggregator, CrawlerError } from './crawl-optimizer.js';
import { CONFIG } from './legacy/config-utils.js';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
const PATHS_FILE = path.join(OUTPUT_DIR, 'paths.json');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');

/**
 * Standardized phase processor for all crawler phases
 */
export class PhaseProcessor {
  static logger = console;
  
  static setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Execute a phase with adaptive optimization and consistent error handling
   */
  static async executePhase(config) {
    const {
      phaseName,
      browser,
      baseUrl,
      spinner,
      extractorFunction,
      inputFile = PATHS_FILE,
      outputProcessor,
      urlFilter,
      validation,
      quiet = false
    } = config;

    const aggregator = new ResultAggregator(phaseName);
    
    try {
      // Validate inputs
      if (validation) {
        await validation(inputFile);
      }

      // Load input data
      const inputData = await AsyncFileManager.readJsonFile(inputFile);
      
      // Extract URLs based on phase requirements
      let urls = [];
      if (urlFilter) {
        urls = urlFilter(inputData);
      } else {
        urls = inputData.all_paths?.map(p => p.url) || [];
      }

      if (urls.length === 0) {
        throw new CrawlerError(`No URLs found for processing in ${phaseName}`, phaseName);
      }

      // Analyze site for adaptive optimization
      const siteAnalysis = await CrawlOptimizer.analyzeSite(PATHS_FILE);
      const optimizationConfig = CrawlOptimizer.getOptimizationConfig(siteAnalysis.category);
      
      if (spinner) {
        spinner.text = `${phaseName}: Processing ${urls.length} URLs (${siteAnalysis.category.toLowerCase()} site optimization)`;
      }
      if (!quiet) {
        this.logger.info(`Phase ${phaseName} using ${optimizationConfig.description}`);
      }

      // Process URLs with adaptive optimization
      const results = await CrawlOptimizer.processUrls(
        browser,
        urls,
        (url, page, index) => this.createProgressTrackingProcessor(
          extractorFunction, 
          spinner, 
          urls.length, 
          index
        )(url, page, index),
        phaseName,
        optimizationConfig,
        quiet
      );

      // Aggregate results
      results.forEach(result => aggregator.addResult(result));
      const summary = aggregator.getSummary();

      // Process output
      const outputData = outputProcessor ? 
        await outputProcessor(aggregator.getResults(), inputData) :
        aggregator.getResults();

      // Update spinner with results
      if (spinner) {
        const successMessage = this.createSuccessMessage(phaseName, summary, optimizationConfig);
        spinner.color = 'green';
        spinner.text = successMessage;
        spinner.stopAndPersist();
      }

      return {
        success: true,
        summary,
        optimizationConfig,
        siteAnalysis,
        outputData
      };

    } catch (error) {
      const crawlerError = error instanceof CrawlerError ? 
        error : 
        new CrawlerError(`Phase ${phaseName} failed: ${error.message}`, phaseName, null, error);
      
      if (spinner) {
        spinner.fail(crawlerError.message);
      }
      this.logger.error('Phase execution failed:', crawlerError.toJSON());
      
      throw crawlerError;
    }
  }

  /**
   * Create progress tracking processor wrapper
   */
  static createProgressTrackingProcessor(extractorFunction, spinner, totalUrls, baseIndex) {
    return async (url, page, index) => {
      const actualIndex = baseIndex + index;
      
      // Update progress every 5 items
      if (actualIndex % 5 === 0 && spinner) {
        const percentComplete = Math.round(((actualIndex + 1) / totalUrls) * 100);
        spinner.text = `[${actualIndex + 1}/${totalUrls} - ${percentComplete}%] Processing: ${chalk.yellow(url)}`;
      }

      return await extractorFunction(url, page, index);
    };
  }

  /**
   * Create standardized success message
   */
  static createSuccessMessage(phaseName, summary, optimizationConfig) {
    const lines = [
      `${chalk.bold(`${phaseName} Complete:`)} ${chalk.green(summary.successful)} successful, ${chalk.red(summary.failed)} failed`,
      `${chalk.bold('Duration:')} ${summary.duration}s (${summary.throughput} URLs/s)`,
      `${chalk.bold('Optimization:')} ${optimizationConfig.description}`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green(`✅ ${phaseName} Phase`),
      chalk.bold('───────────────────────────────────')
    ];
    
    return lines.join('\n');
  }

  /**
   * Standard validation for paths file dependency
   */
  static async validatePathsFile(pathsFile = PATHS_FILE) {
    if (!(await AsyncFileManager.fileExists(pathsFile))) {
      throw new CrawlerError(`Required file not found: ${pathsFile}. Run previous phase first.`);
    }
    
    const data = await AsyncFileManager.readJsonFile(pathsFile);
    if (!data.all_paths || !Array.isArray(data.all_paths) || data.all_paths.length === 0) {
      throw new CrawlerError('Invalid paths data: no valid paths found');
    }
  }

  /**
   * Standard validation for metadata file dependency
   */
  static async validateMetadataFile(metadataFile = METADATA_FILE) {
    if (!(await AsyncFileManager.fileExists(metadataFile))) {
      throw new CrawlerError(`Required file not found: ${metadataFile}. Run metadata phase first.`);
    }

    const data = await AsyncFileManager.readJsonFile(metadataFile);
    // Prefer unique_paths, but fall back to paths_with_metadata for simple sites
    const hasUniquePaths = data.unique_paths && Array.isArray(data.unique_paths) && data.unique_paths.length > 0;
    const hasPathsWithMetadata = data.paths_with_metadata && Array.isArray(data.paths_with_metadata) && data.paths_with_metadata.length > 0;

    if (!hasUniquePaths && !hasPathsWithMetadata) {
      throw new CrawlerError('Invalid metadata: no paths found for extraction');
    }
  }

  /**
   * URL filter for deepen crawl phase
   */
  static deepenUrlFilter(pathsData) {
    if (!pathsData.all_paths || !Array.isArray(pathsData.all_paths)) {
      return [];
    }
    
    // Find current max depth
    const depths = pathsData.all_paths
      .filter(item => item && typeof item.depth === 'number')
      .map(item => item.depth);
    
    const currentMaxDepth = depths.length > 0 ? Math.max(...depths) : 0;
    
    // Return URLs at current max depth
    return pathsData.all_paths
      .filter(item => item && item.depth === currentMaxDepth && typeof item.url === 'string')
      .map(item => item.url);
  }

  /**
   * URL filter for metadata phase
   */
  static metadataUrlFilter(pathsData) {
    if (!pathsData.all_paths || !Array.isArray(pathsData.all_paths)) {
      return [];
    }
    
    return pathsData.all_paths
      .filter(item => item && typeof item.url === 'string')
      .map(item => item.url);
  }

  /**
   * URL filter for extract phase (unique paths only)
   */
  static extractUrlFilter(metadataData) {
    // Prefer unique_paths, but fall back to paths_with_metadata for simple sites
    let paths = [];

    if (metadataData.unique_paths && Array.isArray(metadataData.unique_paths) && metadataData.unique_paths.length > 0) {
      paths = metadataData.unique_paths;
    } else if (metadataData.paths_with_metadata && Array.isArray(metadataData.paths_with_metadata) && metadataData.paths_with_metadata.length > 0) {
      paths = metadataData.paths_with_metadata;
    } else {
      return [];
    }

    return paths
      .filter(item => item && typeof item.url === 'string')
      .map(item => item.url);
  }
}

/**
 * Common extractor function patterns
 */
export class ExtractorPatterns {
  /**
   * Standard metadata extractor pattern
   */
  static async extractMetadata(url, page, index) {
    try {
      // Import functions dynamically to avoid circular dependencies
      const { extractPageTitle, extractMetaDescription, extractBodyClasses, 
              extractComponents, extractParagraphTemplates } = 
        await import('./legacy/page-utils.js');
      
      const pageTitle = await extractPageTitle(page).catch(() => 'Unknown');
      const metaDescription = await extractMetaDescription(page).catch(() => '');
      const bodyClasses = await extractBodyClasses(page).catch(() => []);
      const components = await extractComponents(page).catch(() => []);
      const paragraphTemplates = await extractParagraphTemplates(page).catch(() => []);

      return {
        success: true,
        url,
        title: pageTitle,
        meta_description: metaDescription,
        body_classes: bodyClasses,
        components,
        paragraph_templates: paragraphTemplates,
        depth: 0, // Will be updated from original path data
        source: 'metadata_phase'
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: {
          type: error.name || 'Unknown',
          message: error.message || 'Metadata extraction failed',
          severity: 'high'
        }
      };
    }
  }

  /**
   * Standard link extraction pattern for deepen crawl
   */
  static async extractLinks(url, page, index) {
    try {
      const { extractLinks: extractPageLinks } = await import('./legacy/page-utils.js');
      const { isInternalUrl, isFileUrl, normalizeUrl } = await import('./legacy/url-utils.js');
      
      const links = await extractPageLinks(page);
      const baseUrl = CONFIG.base_url;
      
      const discoveredUrls = [];
      const discoveredExternal = [];
      const discoveredFiles = [];

      if (Array.isArray(links)) {
        for (const link of links) {
          if (typeof link !== 'string') continue;

          if (isInternalUrl(link, baseUrl)) {
            if (isFileUrl(link)) {
              discoveredFiles.push(link);
            } else {
              const normalizedUrl = normalizeUrl(link);
              if (typeof normalizedUrl === 'string') {
                discoveredUrls.push(normalizedUrl);
              }
            }
          } else {
            discoveredExternal.push(link);
          }
        }
      }

      return {
        success: true,
        url,
        linksFound: links?.length || 0,
        discoveredUrls,
        discoveredExternal,
        discoveredFiles
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: {
          type: error.name || 'Unknown',
          message: error.message || 'Link extraction failed',
          severity: 'high'
        }
      };
    }
  }
}
