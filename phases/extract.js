/**
 * CSS Extraction Phase
 * - Uses the unique paths from metadata.json to extract CSS information
 * - Creates categorized JSON files in the output/extract directory
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { chromium } from 'playwright';
import { CONFIG } from '../utils/config-utils.js';
import { fileURLToPath } from 'node:url';
import { extractTypography } from '../extractors/typography-extractor.js';
import { extractColors } from '../extractors/colors-extractor.js';
import { extractSpacing } from '../extractors/spacing-extractor.js';
import { extractBorders } from '../extractors/borders-extractor.js';
import { extractAnimations } from '../extractors/animations-extractor.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const EXTRACT_DIR = path.join(OUTPUT_DIR, 'extract');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');
const MAX_RETRIES = CONFIG.crawl_settings?.max_retries || 2;
const DEFAULT_COLOR = 'cyan';

// Map of extractors for easier iteration
const extractors = {
  typography: {
    fn: extractTypography,
    file: 'typography.json',
    description: 'Typography (fonts, sizes, etc.)'
  },
  colors: {
    fn: extractColors,
    file: 'colors.json',
    description: 'Colors (backgrounds, text, borders)'
  },
  spacing: {
    fn: extractSpacing,
    file: 'spacing.json',
    description: 'Spacing (margins, paddings, gaps)'
  },
  borders: {
    fn: extractBorders,
    file: 'borders.json',
    description: 'Borders (widths, styles, radiuses)'
  },
  animations: {
    fn: extractAnimations,
    file: 'animations.json',
    description: 'Animations (transitions, keyframes)'
  }
};

/**
 * Run CSS extraction for unique paths
 * @param {string} baseUrl - Base URL to crawl
 * @param {Object} spinner - Spinner instance for status updates
 */
async function extractCss(baseUrl = CONFIG.base_url, spinner = null) {
  spinner.color = DEFAULT_COLOR;

  // Start with the initial spinner
  spinner.text = `Starting CSS extraction for ${chalk.bold(CONFIG.name)} from ${chalk.bold(baseUrl)}`;

  // Ensure output directory exists
  if (!fs.existsSync(EXTRACT_DIR)) {
    fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    spinner.text = `Created extract directory at ${EXTRACT_DIR}`;
  }

  // Check if metadata.json exists with unique_paths
  if (!fs.existsSync(METADATA_FILE)) {
    spinner.fail(`Error: ${METADATA_FILE} not found. Run metadata phase first.`);
    return;
  }

  // Load metadata
  let metadata;
  try {
    spinner.text = chalk.blue('Loading metadata...');
    metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  } catch (error) {
    spinner.fail(`Error reading metadata file: ${error.message}`);
    return;
  }

  // Check if we have unique_paths
  if (!metadata.unique_paths || !Array.isArray(metadata.unique_paths) || metadata.unique_paths.length === 0) {
    spinner.fail(`Error: No unique paths found in metadata. Run metadata phase with organize.`);
    return;
  }

  spinner.text = `Found ${chalk.bold(metadata.unique_paths.length)} unique paths to extract CSS from`;

  // Initialize extraction results
  const extractionResults = {
    baseUrl,
    extract_time: new Date().toISOString(),
    typography: {},
    colors: {},
    spacing: {},
    borders: {},
    animations: {},
    // Results per path will be used to track which unique path contributed what
    path_results: []
  };

  // Launch browser
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set timeout from config
  page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);

  try {
    // Process each unique path
    for (let i = 0; i < metadata.unique_paths.length; i++) {
      const pathItem = metadata.unique_paths[i];
      spinner.text = chalk.cyan(`Processing ${chalk.bold(`${i + 1}/${metadata.unique_paths.length}`)} - ${chalk.yellow(pathItem.url)}`);

      // Path-specific extraction results
      const pathResults = {
        url: pathItem.url,
        title: pathItem.title || '',
        reason: pathItem.reason,
        extracted: {},
        error: null
      };

      try {
        // Visit the page
        await page.goto(pathItem.url, {
          waitUntil: 'domcontentloaded',
          timeout: CONFIG.crawl_settings?.timeout || 45000
        });

        // Wait a bit for styles to fully load
        await page.waitForTimeout(1000);

        // Run each extractor
        for (const [extractorName, extractor] of Object.entries(extractors)) {
          spinner.text = chalk.cyan(`Extracting ${extractor.description} from ${chalk.yellow(pathItem.url)}`);

          try {
            const result = await extractor.fn(page);
            // Store in path results
            pathResults.extracted[extractorName] = true;

            // Merge with global results
            mergeExtractorResults(extractionResults[extractorName], result);
          } catch (extractError) {
            spinner.text = chalk.yellow(`Warning: Failed to extract ${extractorName} from ${pathItem.url}: ${extractError.message}`);
            pathResults.extracted[extractorName] = false;
          }
        }

        // Add this path's results to the complete collection
        extractionResults.path_results.push(pathResults);

        spinner.text = chalk.green(`Completed extraction for ${pathItem.url}`);
      } catch (pageError) {
        spinner.text = chalk.red(`Error visiting ${pathItem.url}: ${pageError.message}`);
        pathResults.error = {
          message: pageError.message,
          type: pageError.name || 'Unknown Error'
        };
        extractionResults.path_results.push(pathResults);
      }
    }

    // Save each category of extraction to its own file
    spinner.text = 'Saving extraction results...';

    // Save each extractor's results
    for (const [extractorName, extractor] of Object.entries(extractors)) {
      const filePath = path.join(EXTRACT_DIR, extractor.file);
      fs.writeFileSync(filePath, JSON.stringify(extractionResults[extractorName], null, 2));
      spinner.text = `Saved ${extractorName} data to ${extractor.file}`;
    }

    // Save the overall summary
    const summaryPath = path.join(EXTRACT_DIR, 'summary.json');
    const summary = {
      baseUrl,
      extract_time: extractionResults.extract_time,
      paths_processed: extractionResults.path_results.length,
      successful_extractions: extractionResults.path_results.filter(p => !p.error).length,
      failed_extractions: extractionResults.path_results.filter(p => p.error).length,
      extraction_categories: Object.keys(extractors).map(name => ({
        name,
        description: extractors[name].description,
        file: extractors[name].file
      })),
      path_results: extractionResults.path_results
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    spinner.text = `Saved extraction summary to summary.json`;

    // Calculate statistics for the final report
    const successfulPaths = summary.successful_extractions;
    const failedPaths = summary.failed_extractions;

    // Create extraction statistics per category
    const extractionStats = {};
    for (const [extractorName, extractor] of Object.entries(extractors)) {
      const categoryData = extractionResults[extractorName];
      let count = 0;

      // Count items based on the structure of each extractor's data
      switch (extractorName) {
        case 'typography':
          count = categoryData.fontFamilies?.length || 0;
          break;
        case 'colors':
          count = categoryData.all?.length || 0;
          break;
        case 'spacing':
          count = (categoryData.margins?.length || 0) +
                 (categoryData.paddings?.length || 0);
          break;
        case 'borders':
          count = categoryData.widths?.length || 0;
          break;
        case 'animations':
          count = categoryData.transitions?.complete?.length || 0;
          break;
      }

      extractionStats[extractorName] = count;
    }

    // Create summary box for output
    const summaryBox = [
      '',
      `${chalk.bold('Processed:')} ${chalk.green(successfulPaths)} paths successfully, ${chalk.red(failedPaths)} failed`,
      `${chalk.bold('Typography:')} ${chalk.blue(extractionStats.typography)} font variations`,
      `${chalk.bold('Colors:')} ${chalk.magenta(extractionStats.colors)} unique colors`,
      `${chalk.bold('Spacing:')} ${chalk.yellow(extractionStats.spacing)} spacing values`,
      `${chalk.bold('Borders:')} ${chalk.green(extractionStats.borders)} border definitions`,
      `${chalk.bold('Animations:')} ${chalk.cyan(extractionStats.animations)} transition/animation definitions`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green('✅ CSS Extraction Complete!'),
      chalk.bold('───────────────────────────────────'),
    ];

    // Show final summary
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();
  } catch (error) {
    spinner.fail(`Error during CSS extraction: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Merge extractor-specific results into the global results
 * This handles each extractor's unique data structure
 * @param {Object} target - The target object to merge into
 * @param {Object} source - The source object with new data
 */
function mergeExtractorResults(target, source) {
  // First time initialization
  if (Object.keys(target).length === 0) {
    Object.assign(target, source);
    return;
  }

  // Merge arrays
  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      if (!target[key]) {
        target[key] = [];
      }

      // Add new unique values
      value.forEach(item => {
        if (!target[key].includes(item)) {
          target[key].push(item);
        }
      });

      // Sort if possible
      if (target[key].every(item => !isNaN(parseFloat(item)))) {
        target[key].sort((a, b) => parseFloat(a) - parseFloat(b));
      } else {
        target[key].sort();
      }
    }
    // Handle nested objects (like in animations or typography)
    else if (typeof value === 'object' && value !== null) {
      if (!target[key]) {
        target[key] = {};
      }
      mergeExtractorResults(target[key], value);
    }
    // For primitive values, only overwrite if not present
    else if (target[key] === undefined) {
      target[key] = value;
    }
  }
}

export { extractCss };
