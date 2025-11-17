/**
 * Optimized Pipeline Orchestrator - Production-Ready Implementation
 * 
 * Features:
 * - Adaptive optimization based on site size analysis
 * - Inter-phase parallelization for medium/large sites
 * - Consolidated error handling and performance monitoring
 * - Production-ready configuration management
 */

import chalk from 'chalk';
import { OptimizedBrowserManager } from './optimized-browser-manager.js';
import { CrawlOptimizer } from './crawl-optimizer.js';
import { initialCrawl } from '../cli/phases/initial-crawl.js';
import { deepenCrawl } from '../cli/phases/deepen-crawl.js';
import { gatherMetadata } from '../cli/phases/metadata.js';
import { extractCss } from '../cli/phases/extract.js';
import { SpinnerManager } from './legacy/output-utils.js';
import path from 'path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'output');
const PATHS_FILE = path.join(OUTPUT_DIR, 'paths.json');

/**
 * Production-Ready Pipeline with Adaptive Optimization
 */
export class OptimizedPipeline {
  static logger = console;

  static setLogger(logger) {
    this.logger = logger;
  }

  /**
   * Run the complete pipeline with adaptive optimization
   */
  static async runOptimizedPipeline(url, options = {}) {
    const startTime = Date.now();
    
    // Only show startup message in non-quiet mode
    if (!options.quiet) {
      this.logger.info(`Starting adaptive pipeline for ${chalk.bold(url)}`);
    }

    // Single spinner management for quiet mode
    let globalSpinner = null;
    if (options.quiet) {
      // Clear any existing spinners first
      const existingSpinner = SpinnerManager.getActive();
      if (existingSpinner) {
        existingSpinner.stop();
      }
      globalSpinner = SpinnerManager.createGlobalSpinner('pipeline-progress', chalk.white('Initial crawl...'), 'dots');
    }

    try {
      // Phase 1: Initial crawl (always required first)
      let spinner1 = null;
      
      if (!options.quiet) {
        this.logger.info('Phase 1/4: Initial crawl');
        spinner1 = SpinnerManager.createGlobalSpinner('phase1', `Initial crawl of ${chalk.bold(url)}`, 'dots');
      }
      
      await OptimizedBrowserManager.runPhaseWithBrowser(initialCrawl, url, options.quiet ? null : spinner1, options.quiet);
      
      // Update progress after phase 1
      if (options.quiet && globalSpinner) {
        globalSpinner.text = chalk.white('Analyzing site...');
      }
      
      if (!options.quiet) {
        this.logger.info('✅ Phase 1 complete - paths discovered');
      }

      // Analyze site characteristics for adaptive optimization
      const siteAnalysis = await CrawlOptimizer.analyzeSite(PATHS_FILE);
      const optimizationConfig = CrawlOptimizer.getOptimizationConfig(siteAnalysis.category, options.overrides);
      
      // Update progress after analysis
      if (options.quiet && globalSpinner) {
        globalSpinner.text = chalk.white('Planning optimization strategy...');
      }
      
      if (!options.quiet) {
        this.logger.info(`📊 Site Analysis: ${siteAnalysis.category} site (${siteAnalysis.pageCount} pages)`);
        this.logger.info(`⚙️ Optimization Strategy: ${optimizationConfig.description}`);
      }

      if (optimizationConfig.useSequential || options.forceSequential) {
        // Sequential execution for small sites or forced mode
        return await this.runSequentialPhases(url, options, optimizationConfig, startTime);
      } else {
        // Parallel execution for medium/large sites
        return await this.runParallelPhases(url, options, optimizationConfig, startTime, siteAnalysis);
      }

    } catch (error) {
      this.logger.error(`Pipeline failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Run remaining phases sequentially (optimized for small sites)
   */
  static async runSequentialPhases(url, options, optimizationConfig, startTime) {
    // Get the global spinner from quiet mode
    const globalSpinner = options.quiet ? SpinnerManager.getActive() : null;
    // Phase 2: Deepen crawl
    if (options.quiet && globalSpinner) {
      globalSpinner.text = chalk.white('Deepening crawl...');
    }
    
    let spinner2 = null;
    if (!options.quiet) {
      this.logger.info('Phase 2/4: Deepen crawl (sequential)');
      spinner2 = SpinnerManager.createGlobalSpinner('phase2', `Deepening crawl of ${chalk.bold(url)}`, 'dots');
    }
    await OptimizedBrowserManager.runPhaseWithBrowser(deepenCrawl, url, options.depth, options.quiet ? null : spinner2, options.quiet);
    
    if (options.quiet && globalSpinner) {
      globalSpinner.text = chalk.white('Gathering metadata...');
    }
    if (!options.quiet) {
      this.logger.info('✅ Phase 2 complete');
    }

    // Phase 3: Metadata gathering
    let spinner3 = null;
    if (!options.quiet) {
      this.logger.info('Phase 3/4: Metadata gathering (sequential)');
      spinner3 = SpinnerManager.createGlobalSpinner('phase3', `Gathering metadata from ${chalk.bold(url)}`, 'dots');
    }
    await OptimizedBrowserManager.runPhaseWithBrowser(gatherMetadata, url, options.quiet ? null : spinner3, options.quiet);
    
    if (options.quiet && globalSpinner) {
      globalSpinner.text = chalk.white('Extracting CSS...');
    }
    if (!options.quiet) {
      this.logger.info('✅ Phase 3 complete');
    }

    // Phase 4: CSS extraction
    let spinner4 = null;
    if (!options.quiet) {
      this.logger.info('Phase 4/4: CSS extraction (sequential)');
      spinner4 = SpinnerManager.createGlobalSpinner('phase4', `Extracting CSS from ${chalk.bold(url)}`, 'dots');
    }
    await OptimizedBrowserManager.runPhaseWithBrowser(extractCss, url, options.quiet ? null : spinner4, options.quiet);
    
    if (options.quiet && globalSpinner) {
      globalSpinner.succeed(chalk.green('Pipeline complete'));
    }
    if (!options.quiet) {
      this.logger.info('✅ Phase 4 complete');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    return this.createPipelineResult(duration, optimizationConfig, false, null, options.quiet);
  }

  /**
   * Run phases with parallelization (optimized for medium/large sites)
   */
  static async runParallelPhases(url, options, optimizationConfig, startTime, siteAnalysis) {
    // Get the global spinner from quiet mode
    const globalSpinner = options.quiet ? SpinnerManager.getActive() : null;
    // Phase 2: Parallel execution of deepen + metadata
    if (options.quiet && globalSpinner) {
      globalSpinner.text = chalk.white('Deepen + Metadata...');
    }
    
    if (!options.quiet) {
      this.logger.info('Phase 2/3: Parallel deepen + metadata gathering');
    }
    
    const parallelPromises = [];
    
    // Deepen crawl
    const spinner2 = options.quiet ? null : SpinnerManager.createGlobalSpinner('phase2a', `Deepening crawl of ${chalk.bold(url)}`, 'dots');
    parallelPromises.push(
      OptimizedBrowserManager.runPhaseWithBrowser(deepenCrawl, url, options.depth, options.quiet ? null : spinner2, options.quiet)
    );
    
    // Metadata gathering
    const spinner3 = options.quiet ? null : SpinnerManager.createGlobalSpinner('phase2b', `Gathering metadata from ${chalk.bold(url)}`, 'dots');
    parallelPromises.push(
      OptimizedBrowserManager.runPhaseWithBrowser(gatherMetadata, url, options.quiet ? null : spinner3, options.quiet)
    );

    await Promise.all(parallelPromises);
    
    if (options.quiet && globalSpinner) {
      globalSpinner.text = chalk.white('Extracting CSS...');
    } else if (!options.quiet) {
      this.logger.info('✅ Phase 2 complete - parallel execution finished');
    }

    // Phase 3: CSS extraction
    let spinner4 = null;
    if (!options.quiet) {
      this.logger.info('Phase 3/3: CSS extraction');
      spinner4 = SpinnerManager.createGlobalSpinner('phase3', `Extracting CSS from ${chalk.bold(url)}`, 'dots');
    }
    await OptimizedBrowserManager.runPhaseWithBrowser(extractCss, url, options.quiet ? null : spinner4, options.quiet);
    
    if (options.quiet && globalSpinner) {
      globalSpinner.succeed(chalk.green('Pipeline complete'));
    }
    if (!options.quiet) {
      this.logger.info('✅ Phase 3 complete');
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    return this.createPipelineResult(duration, optimizationConfig, true, siteAnalysis, options.quiet);
  }

  /**
   * Create standardized pipeline result
   */
  static createPipelineResult(duration, optimizationConfig, parallelUsed, siteAnalysis, isQuiet = false) {
    const result = {
      success: true,
      duration: parseFloat(duration),
      optimizations: {
        strategy: optimizationConfig.useSequential ? 'sequential' : 'parallel',
        description: optimizationConfig.description,
        concurrency: optimizationConfig.concurrency,
        browserPools: optimizationConfig.browserPools,
        interPhaseParallel: parallelUsed
      }
    };

    if (siteAnalysis) {
      result.siteAnalysis = siteAnalysis;
    }

    // Only show detailed summary in non-quiet mode
    // In quiet mode, the main CLI will handle the output
    if (!isQuiet) {
      const summary = [
        chalk.bold.green('🎯 Pipeline Complete!'),
        `  📊 Duration: ${duration}s`,
        `  ⚙️ Strategy: ${optimizationConfig.description}`,
        parallelUsed ? '  🚀 Inter-Phase Parallel: deepen + metadata simultaneous' : '  📋 Sequential: optimized for resource efficiency',
        chalk.bold('───────────────────────────────────')
      ].join('\n');

      console.log('\n' + summary);
    }
    
    return result;
  }

  /**
   * Fallback to sequential pipeline (existing behavior)
   */
  static async runSequentialPipeline(url, options = {}) {
    this.logger.info('Running sequential pipeline (fallback mode)');
    
    const startTime = Date.now();

    // Phase 1: Initial crawl
    this.logger.info('Phase 1/4: Initial crawl');
    const spinner1 = SpinnerManager.createGlobalSpinner('phase1', `Initial crawl of ${chalk.bold(url)}`, 'dots');
    await OptimizedBrowserManager.runPhaseWithBrowser(initialCrawl, url, spinner1, false);

    // Phase 2: Deepen crawl
    this.logger.info('Phase 2/4: Deepen crawl');
    const spinner2 = SpinnerManager.createGlobalSpinner('phase2', `Deepening crawl of ${chalk.bold(url)}`, 'dots');
    await OptimizedBrowserManager.runPhaseWithBrowser(deepenCrawl, url, options.depth, spinner2, false);

    // Phase 3: Metadata gathering
    this.logger.info('Phase 3/4: Metadata gathering');
    const spinner3 = SpinnerManager.createGlobalSpinner('phase3', `Gathering metadata from ${chalk.bold(url)}`, 'dots');
    await OptimizedBrowserManager.runPhaseWithBrowser(gatherMetadata, url, spinner3, false);

    // Phase 4: CSS extraction
    this.logger.info('Phase 4/4: CSS extraction');
    const spinner4 = SpinnerManager.createGlobalSpinner('phase4', `Extracting CSS from ${chalk.bold(url)}`, 'dots');
    await OptimizedBrowserManager.runPhaseWithBrowser(extractCss, url, spinner4, false);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    return {
      success: true,
      duration: parseFloat(duration),
      mode: 'sequential'
    };
  }

  /**
   * Generate optimization report for monitoring and debugging
   */
  static generateOptimizationReport(result, url) {
    return CrawlOptimizer.generateOptimizationReport(
      result.siteAnalysis || { category: 'UNKNOWN', pageCount: 0, confidence: 'low' },
      result.optimizations,
      { duration: result.duration, throughput: 'N/A' }
    );
  }

  /**
   * Performance monitoring wrapper
   */
  static async runWithPerformanceMonitoring(pipelineFunction, url, options = {}) {
    const performanceStart = process.hrtime();
    const memoryStart = process.memoryUsage();
    
    try {
      const result = await pipelineFunction(url, options);
      
      const [seconds, nanoseconds] = process.hrtime(performanceStart);
      const duration = seconds + nanoseconds / 1e9;
      const memoryEnd = process.memoryUsage();
      
      const metrics = {
        duration: duration.toFixed(2),
        memory: {
          peak: Math.round((memoryEnd.heapUsed - memoryStart.heapUsed) / 1024 / 1024),
          final: Math.round(memoryEnd.heapUsed / 1024 / 1024)
        },
        optimizations: result.optimizations || {}
      };
      
      this.logger.info('📊 Performance Metrics:', metrics);
      
      return {
        ...result,
        metrics
      };
    } catch (error) {
      const [seconds, nanoseconds] = process.hrtime(performanceStart);
      const duration = seconds + nanoseconds / 1e9;
      
      this.logger.error(`Pipeline failed after ${duration.toFixed(2)}s:`, error.message);
      throw error;
    }
  }

  /**
   * Auto-select optimal pipeline based on conditions
   */
  static async runAdaptivePipeline(url, options = {}) {
    if (options.forceSequential) {
      this.logger.info('Using sequential pipeline (forced)');
      return await this.runWithPerformanceMonitoring(
        this.runSequentialPipeline.bind(this), 
        url, 
        options
      );
    } else {
      this.logger.info('Using adaptive optimization pipeline');
      return await this.runWithPerformanceMonitoring(
        this.runOptimizedPipeline.bind(this), 
        url, 
        options
      );
    }
  }
}