// src/cli/run.ts
// Using ESM syntax
import { Command } from 'commander';
import { Pipeline } from '../core/pipeline.js';
import { CrawlerStage } from '../core/stages/crawler-stage.js';
import { ColorExtractorStage } from '../core/stages/color-extractor-stage.js';
import { TypographyExtractorStage } from '../core/stages/typography-extractor-stage.js';
import { SpacingExtractorStage } from '../core/stages/spacing-extractor-stage.js';
import { BorderExtractorStage } from '../core/stages/border-extractor-stage.js';
import { TokenGeneratorStage } from '../core/stages/token-generator-stage.js';
import { CrawlConfig, DesignToken } from '../core/types.js';
import { ConfigManager } from '../utils/config-manager.js';
import fs from 'node:fs';
import path from 'node:path';

// Create a config manager with default configuration
const configManager = new ConfigManager();

// Create a new command
const program = new Command();

program
  .name('design-token-crawler')
  .description('A visual ETL pipeline for extracting design tokens from websites')
  .version('2.0.0');

program
  .command('crawl')
  .description('Crawl a website and extract design tokens')
  .option('-u, --url <url>', 'URL to crawl')
  .option('-m, --max-pages <number>', 'Maximum number of pages to crawl', parseInt)
  .option('-t, --timeout <number>', 'Timeout in milliseconds', parseInt)
  .option('-o, --output <directory>', 'Output directory')
  .option('-s, --screenshots', 'Enable screenshots', true)
  .option('--extractors <extractors>', 'Comma-separated list of extractors to run (colors,typography,spacing,borders,all)')
  .option('--generate-tokens', 'Generate design tokens from extracted data')
  .option('-c, --config <file>', 'Path to config file')
  .option('-p, --profile <name>', 'Configuration profile to use (e.g., default, local)')
  .option('--save-config <file>', 'Save current configuration to file')
  .action(async (options) => {
    try {
      // Determine config path
      let configPath: string | undefined;

      if (options.config) {
        // Use explicit config file if provided
        configPath = path.resolve(options.config);
      } else if (options.profile) {
        // Use profile from config directory
        configPath = path.join(process.cwd(), 'config', `${options.profile}.json`);
        if (!fs.existsSync(configPath)) {
          console.warn(`Profile ${options.profile} not found at ${configPath}, using default config`);
          configPath = undefined;
        }
      }

      // Create config manager with the determined path
      const configManager = new ConfigManager(configPath);

      // Override config with command line options
      const cliOptions: Partial<CrawlConfig> = {};
      if (options.url) cliOptions.baseUrl = options.url;
      if (options.maxPages) cliOptions.maxPages = options.maxPages;
      if (options.timeout) cliOptions.timeout = options.timeout;
      if (options.output) cliOptions.outputDir = options.output;
      if (options.screenshots !== undefined) cliOptions.screenshots = options.screenshots;

      configManager.mergeCommandLineOptions(cliOptions);

      // Save config if requested
      if (options.saveConfig) {
        configManager.saveConfig(options.saveConfig);
      }

      const config = configManager.getConfig();
      console.log('Running crawler with configuration:');
      console.log(JSON.stringify(config, null, 2));

      // Create and run the pipeline
      const pipeline = new Pipeline();

      // Always add the crawler stage
      pipeline.addStage(new CrawlerStage());

      // Add extractors based on options
      const extractors = options.extractors ? options.extractors.split(',') : ['all'];
      const runAll = extractors.includes('all');

      if (runAll || extractors.includes('colors')) {
        pipeline.addStage(new ColorExtractorStage({
          includeTextColors: config.extractors?.colors?.includeTextColors ?? true,
          includeBackgroundColors: config.extractors?.colors?.includeBackgroundColors ?? true,
          includeBorderColors: config.extractors?.colors?.includeBorderColors ?? true,
          minimumOccurrences: config.extractors?.colors?.minimumOccurrences ?? 2,
          outputDir: config.outputDir
        }));
      }

      if (runAll || extractors.includes('typography')) {
        pipeline.addStage(new TypographyExtractorStage({
          includeHeadings: config.extractors?.typography?.includeHeadings ?? true,
          includeBodyText: config.extractors?.typography?.includeBodyText ?? true,
          includeSpecialText: config.extractors?.typography?.includeSpecialText ?? true,
          outputDir: config.outputDir,
          minOccurrences: config.extractors?.typography?.minOccurrences ?? 2
        }));
      }

      if (runAll || extractors.includes('spacing')) {
        pipeline.addStage(new SpacingExtractorStage({
          includeMargins: config.extractors?.spacing?.includeMargins ?? true,
          includePadding: config.extractors?.spacing?.includePadding ?? true,
          includeGap: config.extractors?.spacing?.includeGap ?? true,
          outputDir: config.outputDir,
          minOccurrences: config.extractors?.spacing?.minOccurrences ?? 2
        }));
      }

      if (runAll || extractors.includes('borders')) {
        pipeline.addStage(new BorderExtractorStage({
          includeBorderWidth: config.extractors?.borders?.includeBorderWidth ?? true,
          includeBorderStyle: config.extractors?.borders?.includeBorderStyle ?? true,
          includeBorderRadius: config.extractors?.borders?.includeBorderRadius ?? true,
          includeShadows: config.extractors?.borders?.includeShadows ?? true,
          outputDir: config.outputDir,
          minOccurrences: config.extractors?.borders?.minOccurrences ?? 2
        }));
      }

      // Run the pipeline
      const result = await pipeline.run(config);

      console.log('Pipeline completed successfully!');

      // If the result has crawledPages (from the crawler stage), log the count
      if (result && typeof result === 'object' && 'crawledPages' in result && Array.isArray(result.crawledPages)) {
        console.log(`Crawled ${result.crawledPages.length} pages from ${result.baseUrl}`);
      }

      // Generate tokens if requested
      if (options.generateTokens) {
        // Collect all tokens from the extractors
        const allTokens: DesignToken[] = [];

        // Get tokens from each extractor
        const colorTokens = pipeline.getState()['color-extractor']?.tokens || [];
        const typographyTokens = pipeline.getState()['typography-extractor']?.tokens || [];
        const spacingTokens = pipeline.getState()['spacing-extractor']?.tokens || [];
        const borderTokens = pipeline.getState()['border-extractor']?.tokens || [];

        console.log(`Found ${colorTokens.length} color tokens`);
        console.log(`Found ${typographyTokens.length} typography tokens`);
        console.log(`Found ${spacingTokens.length} spacing tokens`);
        console.log(`Found ${borderTokens.length} border tokens`);

        allTokens.push(...colorTokens, ...typographyTokens, ...spacingTokens, ...borderTokens);

        // Create a new token generator
        const tokenGenerator = new TokenGeneratorStage({
          outputFormats: (config.tokens?.outputFormats as ('css' | 'json' | 'figma')[]) ?? ['css', 'json', 'figma'],
          outputDir: path.join(config.outputDir || './results', 'tokens'),
          prefix: config.tokens?.prefix ?? 'dt'
        });

        // Run the token generator with all collected tokens
        console.log(`Generating tokens from ${allTokens.length} collected tokens`);
        console.log('Token types:', [...new Set(allTokens.map(t => t.type))]);
        await tokenGenerator.process({ tokens: allTokens });
      }



    } catch (error) {
      console.error('Error running pipeline:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

// If no command is provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
