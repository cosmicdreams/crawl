// run.js - Main entry point for Design Token Crawler
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { program } from 'commander';

// Get the current file's directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define command-line options
program
  .name('Design Token Extractor')
  .description('Extract design tokens from a website')
  .version('1.0.0')
  .option('--url <url>', 'URL to crawl (default: site in config)')
  .option('--max-pages <number>', 'Maximum number of pages to crawl (default: 20)', parseInt)
  .option('--output <directory>', 'Output directory (default: ./results)')
  .option('--with-components', 'Enable component identification (coming soon)')
  .option('--only <extractors>', 'Run only specific extractors (e.g., "colors,typography")')
  .option('--format <format>', 'Output format for tokens (default: css)')
  .option('--list', 'Output a list of available extractors and their descriptions')
  .option('--force', 'Force run all steps, ignoring cache')
  .option('-y, --yes', 'Non-interactive mode: automatically answer yes to all prompts except paths.json review')
  .option('--nuke', 'Clean up the environment: delete results folder, reset config, and clear cache')
  .parse(process.argv);

// Get options
const options = program.opts();

// Handle early exit conditions first
if (options.list) {
  // Define the available extractors without importing the actual code
  const availableExtractors = {
    typography: {
      name: 'typography',
      description: 'Extracts typography-related styles including font families, sizes, weights, line heights, and letter spacing.'
    },
    colors: {
      name: 'colors',
      description: 'Extracts color values from text, backgrounds, borders, and other elements. Identifies primary, secondary, and accent colors.'
    },
    spacing: {
      name: 'spacing',
      description: 'Extracts spacing patterns including margins, padding, and gaps. Creates a consistent spacing scale.'
    },
    borders: {
      name: 'borders',
      description: 'Extracts border styles including widths, colors, and radius values.'
    },
    animations: {
      name: 'animations',
      description: 'Extracts animation properties including durations, timing functions, and keyframes.'
    }
  };

  console.log('Available Extractors:\n');

  Object.values(availableExtractors).forEach(extractor => {
    console.log(`  ${extractor.name.padEnd(12)} ${extractor.description}\n`);
  });

  console.log('Component Identification (Coming Soon):');
  console.log('  When enabled with --with-components, the system will identify and extract');
  console.log('  repeating UI patterns as components, including their HTML structure and');
  console.log('  associated styles.');

  process.exit(0);
}

// If --nuke is specified, load and run the nuke module
if (options.nuke) {
  import('./nuke.js').then(nukeModule => {
    const { nuke } = nukeModule;
    // Run nuke with force=true to skip confirmation prompt
    nuke(true);
    process.exit(0);
  });
} else {
  // For normal operation, import and run the application
  import('./src/runner/index.js').then(module => {
    const { run } = module;
    run(options).catch(error => {
      console.error('Error:', error);
      process.exitCode = 1;
    }).finally(() => {
      // Ensure the process completes cleanly
      console.log('Process complete.');
    });
  });
}