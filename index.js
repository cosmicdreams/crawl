/**
 * Site Crawler
 *
 * A phased approach to site crawling that:
 * 1. Crawls the site 1 level deep and creates an initial paths.json
 * 2. Uses that data to crawl deeper in phases
 * 3. Gathers metadata for each path (body classes, etc.)
 *
 * Run with: node site-crawler/index.js [command]
 *
 * Commands:
 * - initial: Run initial 1-level deep crawl
 * - deepen: Go one level deeper from current paths
 * - metadata: Scan existing paths for metadata (body classes)
 * - all: Run the complete process in sequence
 */

import fs from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { Command } from 'commander';
import { initialCrawl } from './phases/initial-crawl.js';
import { deepenCrawl } from './phases/deepen-crawl.js';
import { gatherMetadata } from './phases/metadata.js';
import { extractCss } from './phases/extract.js';
import { CONFIG } from './utils/config-utils.js';
import { SpinnerManager, createSummaryBox } from './utils/output-utils.js';
// Note: logger is TypeScript, compile first or use a JS logger for the main entry point
// For now, let's create a simple logger wrapper

const logger = {
  info: (message) => console.log(chalk.blue(`ℹ ${message}`)),
  success: (message) => console.log(chalk.green(`✅ ${message}`)),
  error: (message) => console.error(chalk.red(`❌ ${message}`)),
  warn: (message) => console.warn(chalk.yellow(`⚠️  ${message}`)),
};

// Get __dirname equivalent in ESM
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
  .name('site-crawler')
  .description('Crawl websites to extract design tokens and perform analysis')
  .version('1.0.0');

// Common options for validation
const commonOptions = [
  ['-u, --url <url>', 'Base URL to crawl (required)', CONFIG.base_url || ''],
  ['-o, --output <dir>', 'Output directory', CONFIG.output_dir || './output'],
  ['-d, --depth <number>', 'Maximum crawl depth', parseInt, CONFIG.crawl_settings?.max_depth || 3],
  ['-t, --timeout <ms>', 'Request timeout in milliseconds', parseInt, CONFIG.crawl_settings?.timeout || 45000],
  ['-r, --retries <number>', 'Maximum retry attempts', parseInt, CONFIG.crawl_settings?.max_retries || 2]
];

// Add common options to a command
function addCommonOptions(command) {
  commonOptions.forEach(([flags, description, ...rest]) => {
    command.option(flags, description, ...rest);
  });
  return command;
}

// Validation function
function validateOptions(options) {
  if (!options.url) {
    logger.error('URL is required. Use -u or --url flag.');
    process.exit(1);
  }

  try {
    new URL(options.url);
  } catch (e) {
    logger.error(`Invalid URL format: ${options.url}`);
    process.exit(1);
  }

  if (options.depth < 1 || options.depth > 10) {
    logger.error('Depth must be between 1 and 10');
    process.exit(1);
  }

  if (options.timeout < 1000 || options.timeout > 120000) {
    logger.error('Timeout must be between 1000ms and 120000ms');
    process.exit(1);
  }

  if (options.retries < 0 || options.retries > 10) {
    logger.error('Retries must be between 0 and 10');
    process.exit(1);
  }
}

// Create output directory if it doesn't exist
function ensureOutputDirectory(outputDir) {
  if (!fs.existsSync(outputDir)) {
    try {
      fs.mkdirSync(outputDir, { recursive: true });
      logger.info(`Created output directory: ${outputDir}`);
    } catch (error) {
      logger.error(`Failed to create output directory: ${error.message}`);
      process.exit(1);
    }
  }
}

// Initial crawl command
addCommonOptions(program.command('initial'))
  .description('Run initial shallow crawl to discover site structure')
  .action(async (options) => {
    validateOptions(options);
    ensureOutputDirectory(options.output);

    const spinner = SpinnerManager.createGlobalSpinner('initial',`Starting initial crawl of ${chalk.bold(options.url)}`, 'dots');

    try {
      await initialCrawl(options.url, spinner);
      logger.success('Initial crawl completed successfully');
    } catch (error) {
      spinner.fail(`Initial crawl failed: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
      process.exit(1);
    }
  });

// Deepen crawl command
addCommonOptions(program.command('deepen'))
  .description('Crawl deeper levels based on discovered paths')
  .action(async (options) => {
    validateOptions(options);
    ensureOutputDirectory(options.output);

    const spinner = SpinnerManager.createGlobalSpinner('deepen',`Deepening crawl of ${chalk.bold(options.url)}`, 'dots');

    try {
      await deepenCrawl(options.url, options.depth, spinner);
      logger.success('Deepen crawl completed successfully');
    } catch (error) {
      spinner.fail(`Deepen crawl failed: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
      process.exit(1);
    }
  });

// Metadata gathering command
addCommonOptions(program.command('metadata'))
  .description('Gather metadata from discovered paths')
  .action(async (options) => {
    validateOptions(options);
    ensureOutputDirectory(options.output);

    const spinner = SpinnerManager.createGlobalSpinner('metadata',`Gathering metadata from ${chalk.bold(options.url)}`, 'dots');

    try {
      await gatherMetadata(options.url, spinner);
      logger.success('Metadata gathering completed successfully');
    } catch (error) {
      spinner.fail(`Metadata gathering failed: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
      process.exit(1);
    }
  });

// CSS extraction command
addCommonOptions(program.command('extract'))
  .description('Extract CSS and design tokens from crawled pages')
  .action(async (options) => {
    validateOptions(options);
    ensureOutputDirectory(options.output);

    const spinner = SpinnerManager.createGlobalSpinner('extract',`Extracting CSS from ${chalk.bold(options.url)}`, 'dots');

    try {
      await extractCss(options.url, spinner);
      logger.success('CSS extraction completed successfully');
    } catch (error) {
      spinner.fail(`CSS extraction failed: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
      process.exit(1);
    }
  });

// Complete pipeline command
addCommonOptions(program.command('all'))
  .description('Run complete crawl pipeline (initial -> deepen -> metadata -> extract)')
  .action(async (options) => {
    validateOptions(options);
    ensureOutputDirectory(options.output);

    const startTime = Date.now();

    logger.info(`Starting complete pipeline for ${chalk.bold(options.url)}`);

    try {
      // Phase 1: Initial crawl
      logger.info('Phase 1/4: Initial crawl');
      const spinner1 = SpinnerManager.createGlobalSpinner('phase1', `Initial crawl of ${chalk.bold(options.url)}`, 'dots');
      await initialCrawl(options.url, spinner1);

      // Phase 2: Deepen crawl
      logger.info('Phase 2/4: Deepen crawl');
      const spinner2 = SpinnerManager.createGlobalSpinner('phase2', `Deepening crawl of ${chalk.bold(options.url)}`, 'dots');
      await deepenCrawl(options.url, options.depth, spinner2);

      // Phase 3: Metadata gathering
      logger.info('Phase 3/4: Metadata gathering');
      const spinner3 = SpinnerManager.createGlobalSpinner('phase3',`Gathering metadata from ${chalk.bold(options.url)}`, 'dots');
      await gatherMetadata(options.url, spinner3);

      // Phase 4: CSS extraction
      logger.info('Phase 4/4: CSS extraction');
      const spinner4 = SpinnerManager.createGlobalSpinner('phase4',`Extracting CSS from ${chalk.bold(options.url)}`, 'dots');
      await extractCss(options.url, spinner4);

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      logger.success(`Complete pipeline finished in ${duration}s`);

      // Create summary
      const summary = createSummaryBox('Pipeline Complete', [
        `URL: ${options.url}`,
        `Duration: ${duration}s`,
        `Output: ${options.output}`,
      ]);

      console.log('\n' + summary);

    } catch (error) {
      logger.error(`Pipeline failed: ${error.message}`);
      logger.error(`Full error: ${error.stack}`);
      process.exit(1);
    }
  });

// Help command (default action when no command provided)
program
  .action(() => {
    console.log(chalk.bold.blue('🔍 Site Crawler'));
    console.log('A tool for crawling websites and extracting design tokens\n');
    program.help();
  });

// Handle unknown commands
program.on('command:*', () => {
  logger.error(`Unknown command: ${program.args.join(' ')}`);
  console.log('Available commands:');
  program.help();
  process.exit(1);
});

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error(`Uncaught Exception: ${error.message}`);
  logger.error(`Stack: ${error.stack}`);
  process.exit(1);
});

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.action(() => {
    console.log(chalk.bold.blue('🔍 Site Crawler'));
    console.log('A tool for crawling websites and extracting design tokens\n');
    program.help();
  });
  program.parse(process.argv);
}
