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
import { gatherMetadata, organizeMetadata } from './phases/metadata.js';
import { extractCss } from './phases/extract.js';
import { CONFIG } from './utils/config-utils.js';
import { SpinnerManager, createSummaryBox } from './utils/output-utils.js';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure output directories exist
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Ensure extract directory exists
const EXTRACT_DIR = path.join(OUTPUT_DIR, 'extract');
if (!fs.existsSync(EXTRACT_DIR)) {
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
}

// Use base URL from config, with override from a file if it exists
let baseUrl = CONFIG.base_url;
const baseUrlFile = path.join(__dirname, '..', 'base_url.md');
if (fs.existsSync(baseUrlFile)) {
  const fileContent = fs.readFileSync(baseUrlFile, 'utf8');
  const trimmedUrl = fileContent.trim();
  if (trimmedUrl && trimmedUrl.startsWith('http')) {
    // If the file exists, it overrides the config
    baseUrl = trimmedUrl;
    console.log(`Using base URL from file: ${baseUrl}`);
  }
} else {
  console.log(`Using base URL from config: ${baseUrl}`);
}

// Set up the command line interface
const program = new Command();

program
  .name('site-crawler')
  .description('PNCB Site Crawler with phased approach')
  .version('1.0.0');

program
  .command('initial')
  .description('Run initial crawl (1 level deep)')
  .option('-u, --url <url>', 'Base URL to crawl', baseUrl)
  .action(async (options) => {
    // Create a spinner just for this command
    let spinner = ora('🔍 Starting initial crawl (1 level deep)...').start();
    await initialCrawl(options.url, spinner);
    console.log('npm run initial complete.')
    process.exit(1);
  });

program
  .command('deepen')
  .description('Deepen crawl by one more level')
  .option('-u, --url <url>', 'Base URL to crawl', baseUrl)
  .option('-c, --count <number>', 'How many deepening phases to run', '1')
  .action(async (options) => {
    // Create a spinner for the entire deepening process
    let spinner = ora(`🔍 Deepening crawl by ${options.count} levels...`).start();

    for (let i = 0; i < parseInt(options.count); i++) {
      spinner.info(`📊 Phase ${i + 1} of ${options.count}`);
      await deepenCrawl(options.url, undefined, spinner);
    }
    console.log('npm run deepen complete.')
    process.exit(1);
  });

program
  .command('metadata')
  .description('Gather metadata for existing paths')
  .option('-u, --url <url>', 'Base URL to crawl', baseUrl)
  .option('-b, --batch <number>', 'Batch size for processing', '20')
  .action(async (options) => {
    // Create a spinner for the metadata gathering process
    let spinner = ora('🔍 Gathering metadata for existing paths...').start();
    await gatherMetadata(options.url, parseInt(options.batch), spinner);
    console.log('npm run metadata complete.')
    process.exit(1);
  });

program
  .command('organize')
  .description('Transform metadata for different uses')
  .action(async (options) => {
    // Create a spinner for the metadata gathering process
    let spinner = ora('🔍 Gathering metadata for existing paths...').start();
    let metadata = fs.existsSync(path.join(OUTPUT_DIR, 'metadata.json')) ?
      JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'metadata.json'), 'utf8')) : {};
    await organizeMetadata(metadata, spinner);
    console.log('npm run organize complete.')
    process.exit(1);
  });

program
  .command('extract')
  .description('Extract CSS information from unique paths identified in metadata')
  .option('-u, --url <url>', 'Base URL to crawl', baseUrl)
  .action(async (options) => {
    // Create a spinner for the CSS extraction process
    let spinner = ora('🎨 Extracting CSS information from unique paths...').start();
    await extractCss(options.url, spinner);
    console.log('npm run extract complete.')
    process.exit(1);
  });

program
  .command('all')
  .description('Run complete crawl process (initial, deepen, metadata, extract)')
  .option('-u, --url <url>', 'Base URL to crawl', baseUrl)
  .action(async (options) => {
    console.log(chalk.blue('Starting complete crawl process...'));

    try {
      let spinner = ora('Phase 1: Initial Crawl (1 level deep)').start();
      await initialCrawl(options.url, spinner);

      let announce = [
        '',
        chalk.bold('───────────────────────────────'),
        chalk.bold.blue('🚀 Phase 2 Begins: Level 2 Crawl'),
        chalk.bold('───────────────────────────────'),
      ];
      console.log(announce.join('\n'));
      spinner = ora('Phase 2: Deepening Crawl (first pass)').start();
      await deepenCrawl(options.url, undefined, spinner);

      announce = [
        '',
        chalk.bold('───────────────────────────────'),
        chalk.bold.blue('🚀 Phase 3 Begins: Level 3 Crawl'),
        chalk.bold('───────────────────────────────'),
      ];
      console.log(announce.join('\n'));
      spinner = ora('Phase 3: Deepening Crawl (second pass)').start();
      await deepenCrawl(options.url, undefined, spinner);

      announce = [
        '',
        chalk.bold('───────────────────────────────'),
        chalk.bold.magentaBright('🚀 Data Transformation Begins'),
        chalk.bold('───────────────────────────────'),
      ];
      console.log(announce.join('\n'));
      spinner = ora('Phase 4: Gathering Metadata').start();
      await gatherMetadata(options.url, 20, spinner);

      announce = [
        '',
        chalk.bold('───────────────────────────────'),
        chalk.bold.magentaBright('🎨 CSS Extraction Begins'),
        chalk.bold('───────────────────────────────'),
      ];
      console.log(announce.join('\n'));
      spinner = ora('Phase 5: Extracting CSS Information').start();
      await extractCss(options.url, spinner);

      // Finalizing doesn't strictly need a spinner unless it takes time
      console.log(chalk.blue('Finalizing results...'));
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log(chalk.green.bold('✅ All operations completed successfully!'));
      // Final completion message with styling
      const completionBox = createSummaryBox(
        'All operations completed successfully!',
        [
          '',
          chalk.bold.green('✅ Complete Crawl Process Finished!'),
          chalk.bold('═════════════════════════════════════'),
          chalk.blue('All phases have been successfully completed:'),
          chalk.yellow('  • Initial crawl'),
          chalk.yellow('  • Two deepening passes'),
          chalk.yellow('  • Metadata gathering'),
          chalk.yellow('  • CSS extraction'),
          '',
          chalk.green('Results are available in: ') + chalk.bold.white('./output/'),
          '',
        ]);

      console.log(completionBox);
      console.log('npm run all complete.')
      process.exit(1);
    } catch (error) {
      console.error(chalk.red(`\n❌ Operation failed: ${error.message}`));
      console.error(error); // Log full error details
      process.exit(1);
    }
  });

// Default command if none provided
if (process.argv.length <= 2) {
  program.help();
}

program.parse();
