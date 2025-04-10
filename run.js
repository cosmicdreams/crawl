// @ts-check
const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const { chromium } = require('@playwright/test');

// Import modules
const siteCrawler = require('./src/crawler/site-crawler');
const extractTypography = require('./src/extractors/extract-typography');
const extractColors = require('./src/extractors/extract-colors');
const extractSpacing = require('./src/extractors/extract-spacing');
const extractBorders = require('./src/extractors/extract-borders');
const extractAnimations = require('./src/extractors/extract-animations');
const generateTokens = require('./src/generators/generate-tokens');
const generateReportsModule = require('./src/generators/generate-reports');
const cacheManager = require('./src/utils/cache-manager');
const configManager = require('./src/utils/config-manager');
const nukeModule = require('./nuke');

// Get the functions from the modules
const { crawlSite } = siteCrawler;
const { extractTypographyFromCrawledPages } = extractTypography;
const { extractColorsFromCrawledPages } = extractColors;
const { extractSpacingFromCrawledPages } = extractSpacing;
const { extractBordersFromCrawledPages } = extractBorders;
const { extractAnimationsFromCrawledPages } = extractAnimations;
const { generateDesignTokens } = generateTokens;
const { generateReports } = generateReportsModule;
const { nuke } = nukeModule;

// Define available extractors
const extractors = {
  typography: {
    name: 'typography',
    description: 'Extracts typography-related styles including font families, sizes, weights, line heights, and letter spacing.',
    run: extractTypographyFromCrawledPages
  },
  colors: {
    name: 'colors',
    description: 'Extracts color values from text, backgrounds, borders, and other elements. Identifies primary, secondary, and accent colors.',
    run: extractColorsFromCrawledPages
  },
  spacing: {
    name: 'spacing',
    description: 'Extracts spacing patterns including margins, padding, and gaps. Creates a consistent spacing scale.',
    run: extractSpacingFromCrawledPages
  },
  borders: {
    name: 'borders',
    description: 'Extracts border styles, widths, and radii. Also captures box shadow styles.',
    run: extractBordersFromCrawledPages
  },
  animations: {
    name: 'animations',
    description: 'Extracts animation and transition properties including durations, timing functions, and delay patterns.',
    run: extractAnimationsFromCrawledPages
  }
};

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

// If --list is specified, show available extractors and exit
if (options.list) {
  console.log('Available Extractors:\n');

  Object.values(extractors).forEach(extractor => {
    console.log(`  ${extractor.name.padEnd(12)} ${extractor.description}\n`);
  });

  console.log('Component Identification (Coming Soon):');
  console.log('  When enabled with --with-components, the system will identify and extract');
  console.log('  repeating UI patterns as components, including their HTML structure and');
  console.log('  associated styles.');

  process.exit(0);
}

// If --nuke is specified, run the nuke process and exit
if (options.nuke) {
  nuke();
  return; // The nuke process will handle exiting the process
}

// Initialize configuration asynchronously in the run function
let config = {};

// These options will be set in the run function after loading config
const extractorsToRunOption = options.only ? options.only.split(',') : Object.keys(extractors);
const formatOption = options.format || 'css';
const withComponentsOption = options.withComponents || false;

// We'll create output directories after loading the config in the run function
let rawDir, cssDir, tokensDir, reportsDir, screenshotsDir;

/**
 * Generate a markdown report of the design tokens
 * @param {Object} tokens - Design tokens
 */
async function generateMarkdownReport(tokens) {
  console.log('Generating markdown report...');

  // Create a browser instance for taking screenshots
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 800 }
  });

  // Create screenshots directory if it doesn't exist
  const screenshotsDir = path.join(config.outputDir, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  let markdown = `# Design Tokens

This document provides an overview of the design tokens extracted from the website.

## Contents

- [Typography](#typography)
- [Colors](#colors)
- [Spacing](#spacing)
- [Borders & Shadows](#borders--shadows)
- [Animations](#animations)

`;

  // Typography section
  markdown += `## Typography

Typography tokens define the font families, sizes, weights, line heights, and letter spacing used throughout the site.

### Font Families

`;

  if (Object.keys(tokens.typography.fontFamily).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.typography.fontFamily).forEach(([name, value]) => {
      markdown += `| \`--font-family-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No font families found._\n';
  }

  markdown += `
### Font Sizes

`;

  if (Object.keys(tokens.typography.fontSize).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.typography.fontSize).forEach(([name, value]) => {
      markdown += `| \`--font-size-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No font sizes found._\n';
  }

  markdown += `
### Font Weights

`;

  if (Object.keys(tokens.typography.fontWeight).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.typography.fontWeight).forEach(([name, value]) => {
      markdown += `| \`--font-weight-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No font weights found._\n';
  }

  markdown += `
### Line Heights

`;

  if (Object.keys(tokens.typography.lineHeight).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.typography.lineHeight).forEach(([name, value]) => {
      markdown += `| \`--line-height-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No line heights found._\n';
  }

  markdown += `
### Letter Spacing

`;

  if (Object.keys(tokens.typography.letterSpacing).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.typography.letterSpacing).forEach(([name, value]) => {
      markdown += `| \`--letter-spacing-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No letter spacing values found._\n';
  }

  // Colors section
  markdown += `
## Colors

Color tokens define the color palette used throughout the site.

### Primary Colors

`;

  // Generate a color swatch HTML for taking a screenshot
  if (Object.keys(tokens.colors.primary).length > 0) {
    // Create HTML for color swatches
    let swatchesHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Color Swatches</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .swatch-container { display: flex; flex-wrap: wrap; gap: 10px; }
          .swatch {
            width: 100px;
            height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .color-value {
            background: rgba(255,255,255,0.8);
            padding: 5px;
            font-size: 10px;
            width: 100%;
            text-align: center;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="swatch-container">
    `;

    Object.entries(tokens.colors.primary).forEach(([name, value]) => {
      swatchesHtml += `
        <div class="swatch" style="background-color: ${value}">
          <div class="color-value">${name}</div>
        </div>
      `;
    });

    swatchesHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(swatchesHtml);

    // Take a screenshot of the swatches
    const screenshotPath = path.join(screenshotsDir, 'primary-colors.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Primary Colors](screenshots/primary-colors.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.colors.primary).forEach(([name, value]) => {
      markdown += `| \`--color-primary-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No primary colors found._\n';
  }

  markdown += `
### Secondary Colors

`;

  if (Object.keys(tokens.colors.secondary).length > 0) {
    // Create HTML for color swatches
    let swatchesHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Color Swatches</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .swatch-container { display: flex; flex-wrap: wrap; gap: 10px; }
          .swatch {
            width: 100px;
            height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .color-value {
            background: rgba(255,255,255,0.8);
            padding: 5px;
            font-size: 10px;
            width: 100%;
            text-align: center;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="swatch-container">
    `;

    Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
      swatchesHtml += `
        <div class="swatch" style="background-color: ${value}">
          <div class="color-value">${name}</div>
        </div>
      `;
    });

    swatchesHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(swatchesHtml);

    // Take a screenshot of the swatches
    const screenshotPath = path.join(screenshotsDir, 'secondary-colors.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Secondary Colors](screenshots/secondary-colors.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.colors.secondary).forEach(([name, value]) => {
      markdown += `| \`--color-secondary-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No secondary colors found._\n';
  }

  markdown += `
### Neutral Colors

`;

  if (Object.keys(tokens.colors.neutral).length > 0) {
    // Create HTML for color swatches
    let swatchesHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Color Swatches</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .swatch-container { display: flex; flex-wrap: wrap; gap: 10px; }
          .swatch {
            width: 100px;
            height: 100px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .color-value {
            background: rgba(255,255,255,0.8);
            padding: 5px;
            font-size: 10px;
            width: 100%;
            text-align: center;
            word-break: break-all;
          }
        </style>
      </head>
      <body>
        <div class="swatch-container">
    `;

    Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
      swatchesHtml += `
        <div class="swatch" style="background-color: ${value}">
          <div class="color-value">${name}</div>
        </div>
      `;
    });

    swatchesHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(swatchesHtml);

    // Take a screenshot of the swatches
    const screenshotPath = path.join(screenshotsDir, 'neutral-colors.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Neutral Colors](screenshots/neutral-colors.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.colors.neutral).forEach(([name, value]) => {
      markdown += `| \`--color-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No neutral colors found._\n';
  }

  // Spacing section
  markdown += `
## Spacing

Spacing tokens define the spacing scale used throughout the site.

### Spacing Scale

`;

  if (Object.keys(tokens.spacing.scale).length > 0) {
    // Create HTML for spacing visualization
    let spacingHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Spacing Visualization</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .spacing-container { display: flex; flex-direction: column; gap: 20px; }
          .spacing-item {
            display: flex;
            align-items: center;
            margin-bottom: 10px;
          }
          .spacing-value {
            width: 100px;
            font-family: monospace;
          }
          .spacing-visual {
            height: 20px;
            background-color: #6200ee;
          }
          .spacing-label {
            margin-left: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="spacing-container">
    `;

    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      const pixels = parseFloat(value);
      spacingHtml += `
        <div class="spacing-item">
          <div class="spacing-value">${name}</div>
          <div class="spacing-visual" style="width: ${pixels}px"></div>
          <div class="spacing-label">${value}</div>
        </div>
      `;
    });

    spacingHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(spacingHtml);

    // Take a screenshot of the spacing visualization
    const screenshotPath = path.join(screenshotsDir, 'spacing-scale.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Spacing Scale](screenshots/spacing-scale.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.spacing.scale).forEach(([name, value]) => {
      markdown += `| \`--spacing-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No spacing scale found._\n';
  }

  // Borders section
  markdown += `
## Borders & Shadows

Border tokens define the border widths, radii, and shadows used throughout the site.

### Border Widths

`;

  if (Object.keys(tokens.borders.width).length > 0) {
    // Create HTML for border width visualization
    let borderWidthHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Border Width Visualization</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .border-container { display: flex; flex-wrap: wrap; gap: 20px; }
          .border-item {
            width: 100px;
            height: 100px;
            background-color: #f0f0f0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: solid #6200ee;
          }
          .border-label {
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="border-container">
    `;

    Object.entries(tokens.borders.width).forEach(([name, value]) => {
      borderWidthHtml += `
        <div>
          <div class="border-item" style="border-width: ${value};">
            ${name}
          </div>
          <div class="border-label">${value}</div>
        </div>
      `;
    });

    borderWidthHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(borderWidthHtml);

    // Take a screenshot of the border width visualization
    const screenshotPath = path.join(screenshotsDir, 'border-widths.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Border Widths](screenshots/border-widths.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.borders.width).forEach(([name, value]) => {
      markdown += `| \`--border-width-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No border widths found._\n';
  }

  markdown += `
### Border Radii

`;

  if (Object.keys(tokens.borders.radius).length > 0) {
    // Create HTML for border radius visualization
    let borderRadiusHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Border Radius Visualization</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .radius-container { display: flex; flex-wrap: wrap; gap: 20px; }
          .radius-item {
            width: 100px;
            height: 100px;
            background-color: #6200ee;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
          }
          .radius-label {
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="radius-container">
    `;

    Object.entries(tokens.borders.radius).forEach(([name, value]) => {
      borderRadiusHtml += `
        <div>
          <div class="radius-item" style="border-radius: ${value};">
            ${name}
          </div>
          <div class="radius-label">${value}</div>
        </div>
      `;
    });

    borderRadiusHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(borderRadiusHtml);

    // Take a screenshot of the border radius visualization
    const screenshotPath = path.join(screenshotsDir, 'border-radii.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Border Radii](screenshots/border-radii.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.borders.radius).forEach(([name, value]) => {
      markdown += `| \`--border-radius-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No border radii found._\n';
  }

  markdown += `
### Shadows

`;

  if (Object.keys(tokens.borders.shadow).length > 0) {
    // Create HTML for shadow visualization
    let shadowHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Shadow Visualization</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          .shadow-container { display: flex; flex-wrap: wrap; gap: 20px; }
          .shadow-item {
            width: 100px;
            height: 100px;
            background-color: white;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .shadow-label {
            text-align: center;
            margin-top: 10px;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="shadow-container">
    `;

    Object.entries(tokens.borders.shadow).forEach(([name, value]) => {
      shadowHtml += `
        <div>
          <div class="shadow-item" style="box-shadow: ${value};">
            ${name}
          </div>
          <div class="shadow-label">${name}</div>
        </div>
      `;
    });

    shadowHtml += `
        </div>
      </body>
      </html>
    `;

    // Navigate to the HTML content
    await page.setContent(shadowHtml);

    // Take a screenshot of the shadow visualization
    const screenshotPath = path.join(screenshotsDir, 'shadows.png');
    await page.screenshot({
      path: screenshotPath,
      fullPage: true
    });

    // Add the screenshot to the markdown
    markdown += `![Shadows](screenshots/shadows.png)\n\n`;

    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.borders.shadow).forEach(([name, value]) => {
      markdown += `| \`--shadow-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No shadows found._\n';
  }

  // Animations section
  markdown += `
## Animations

Animation tokens define the durations, timing functions, and keyframes used throughout the site.

### Durations

`;

  if (Object.keys(tokens.animations.duration).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.animations.duration).forEach(([name, value]) => {
      markdown += `| \`--duration-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No durations found._\n';
  }

  markdown += `
### Timing Functions

`;

  if (Object.keys(tokens.animations.timingFunction).length > 0) {
    markdown += '| Token | Value |\n';
    markdown += '| ----- | ----- |\n';

    Object.entries(tokens.animations.timingFunction).forEach(([name, value]) => {
      markdown += `| \`--ease-${name}\` | \`${value}\` |\n`;
    });
  } else {
    markdown += '_No timing functions found._\n';
  }

  // Close the browser
  await browser.close();

  // Write the markdown file
  fs.writeFileSync(path.join(config.outputDir, 'DesignTokens.md'), markdown);
  console.log(`Generated ${path.join(config.outputDir, 'DesignTokens.md')}`);
}

/**
 * Check if paths.json exists
 * @returns {boolean} True if paths.json exists, false otherwise
 */
function pathsFileExists() {
  const pathsFile = path.join(__dirname, 'results/paths.json');
  return fs.existsSync(pathsFile);
}

/**
 * Prompt the user to continue after reviewing paths.json
 * @returns {Promise<void>}
 */
async function promptToContinue() {
  const pathsFile = path.join(__dirname, 'results/paths.json');
  console.log('\n=== IMPORTANT: PATHS FILE REVIEW ===');
  console.log(`A new paths file has been generated at: ${pathsFile}`);
  console.log('\nThis file contains the URLs that will be analyzed during the extraction process.');
  console.log('\nReview instructions:');
  console.log('1. Open the file in a text editor');
  console.log('2. Review the "paths" array and remove any paths you don\'t want to include');
  console.log('3. Add any important paths that might have been missed');
  console.log('4. The paths have been deduplicated, but you may want to further reduce them');
  console.log('5. Paths with numeric IDs or UUIDs have been consolidated to reduce duplication');
  console.log('\nTIP: Focus on keeping paths that represent different page templates or components');
  console.log('     rather than many variations of the same page type.');

  // Try to display the number of paths in the file
  try {
    const pathsData = JSON.parse(fs.readFileSync(pathsFile, 'utf8'));
    if (pathsData.paths && Array.isArray(pathsData.paths)) {
      console.log(`\nThe file currently contains ${pathsData.paths.length} paths.`);

      // Group paths by their first segment to help the user understand the structure
      const segments = {};
      pathsData.paths.forEach(p => {
        const firstSegment = p === '/' ? '/' : p.split('/').filter(s => s)[0] || 'other';
        segments[firstSegment] = (segments[firstSegment] || 0) + 1;
      });

      console.log('\nPath distribution by section:');
      Object.entries(segments).forEach(([segment, count]) => {
        console.log(`  ${segment}: ${count} paths`);
      });
    }
  } catch (e) {
    console.log('\nCould not read path statistics from the file.');
  }

  console.log('\nWhen you\'re ready to continue, press Enter...');

  // Create a readline interface
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // Return a promise that resolves when the user presses Enter
  return new Promise(resolve => {
    readline.question('', () => {
      readline.close();
      resolve();
    });
  });
}

/**
 * Main function to run the design token extraction process
 */
async function run() {
  // Initialize configuration
  const fileConfig = await configManager.initConfig();
  config = configManager.mergeWithOptions(fileConfig, options);

  // Set additional config options
  config.extractorsToRun = extractorsToRunOption;
  config.format = formatOption;
  config.withComponents = withComponentsOption;

  // Create output directories
  rawDir = path.join(config.outputDir, 'raw');
  cssDir = path.join(config.outputDir, 'css');
  tokensDir = path.join(config.outputDir, 'tokens');
  reportsDir = path.join(config.outputDir, 'reports');
  screenshotsDir = path.join(config.outputDir, 'screenshots');

  // Create results directories
  [rawDir, cssDir, tokensDir, reportsDir, screenshotsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create AI directories at the root level (platform level concerns)
  const aiDir = path.join(__dirname, 'ai');
  const aiSubDirs = [
    path.join(aiDir, 'prompts'),
    path.join(aiDir, 'issues/open'),
    path.join(aiDir, 'issues/resolved'),
    path.join(aiDir, 'insights')
  ];

  // Create AI directories
  aiSubDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Create template files if they don't exist
  const templateFiles = [
    { src: 'issue.template.md', dest: path.join(aiDir, 'issues/issue.template.md') },
    { src: 'component-analysis.md', dest: path.join(aiDir, 'prompts/component-analysis.md') },
    { src: 'design-system-review.md', dest: path.join(aiDir, 'prompts/design-system-review.md') },
    { src: 'accessibility-check.md', dest: path.join(aiDir, 'prompts/accessibility-check.md') },
    { src: 'patterns.json', dest: path.join(aiDir, 'insights/patterns.json') },
    { src: 'recommendations.md', dest: path.join(aiDir, 'insights/recommendations.md') }
  ];

  templateFiles.forEach(({ src, dest }) => {
    if (!fs.existsSync(dest)) {
      try {
        const templatePath = path.join(__dirname, 'src/templates', src);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          fs.writeFileSync(dest, templateContent);
          console.log(`Created template file: ${dest}`);
        }
      } catch (error) {
        console.warn(`Could not create template file ${dest}: ${error.message}`);
      }
    }
  });

  console.log(`Starting design token extraction for ${config.baseUrl}`);
  console.log(`Max pages: ${config.maxPages}`);
  console.log(`Output directory: ${config.outputDir}`);
  console.log(`Extractors: ${config.extractorsToRun.join(', ')}`);

  // Check if paths.json exists
  const hasPathsFile = pathsFileExists();

  // Determine which steps to run based on cache and user input
  let stepsToRun = {};
  let runAll = options.force;

  if (!options.force && !options.yes) {
    // Analyze what steps need to run
    const stepAnalysis = cacheManager.analyzeStepsToRun(config);

    // If paths.json was just created, prompt the user to review it before analyzing cache
    if (!hasPathsFile && pathsFileExists()) {
      await promptToContinue();
      console.log('Continuing with extraction process...');
    }

    // Prompt user for what to run
    const userChoice = await cacheManager.promptUser(stepAnalysis, config);
    runAll = userChoice.runAll;
    stepsToRun = userChoice.steps;
  } else if (options.yes) {
    // Skip cache prompt but still respect cache
    const stepAnalysis = cacheManager.analyzeStepsToRun(config);
    Object.entries(stepAnalysis).forEach(([step, analysis]) => {
      if (analysis.needsRun) {
        stepsToRun[step] = true;
      }
    });
  }

  // Step 1: Crawl the site
  let crawlResults;
  if (runAll || stepsToRun.crawl) {
    console.log('\n=== Step 1: Crawling the site ===');
    // Pass the baseUrl and maxPages to the crawler
    crawlResults = await crawlSite(config.baseUrl, config.maxPages);

    // If paths.json was just created, prompt the user to review it
    // Always prompt for paths.json review, even in non-interactive mode
    if (!hasPathsFile && pathsFileExists()) {
      await promptToContinue();
      console.log('Continuing with extraction process...');
    }

    // Save crawl results if they exist
    if (crawlResults) {
      fs.writeFileSync(path.join(rawDir, 'crawl-results.json'), JSON.stringify(crawlResults, null, 2));
      console.log(`Crawl results saved to: ${path.join(rawDir, 'crawl-results.json')}`);

      // Update cache
      cacheManager.updateCacheForStep('crawl', config);
    }
  } else {
    console.log('\n=== Step 1: Crawling the site [SKIPPED] ===');
    console.log('Using existing crawl results.');
  }

  // Step 2: Run extractors
  console.log('\n=== Step 2: Running extractors ===');

  for (const extractorName of config.extractorsToRun) {
    if (extractors[extractorName]) {
      if (runAll || stepsToRun[extractorName]) {
        console.log(`\nRunning ${extractorName} extractor...`);
        try {
          // Call the extractor function directly
          if (extractorName === 'typography') {
            await extractTypographyFromCrawledPages();
          } else if (extractorName === 'colors') {
            await extractColorsFromCrawledPages();
          } else if (extractorName === 'spacing') {
            await extractSpacingFromCrawledPages();
          } else if (extractorName === 'borders') {
            await extractBordersFromCrawledPages();
          } else if (extractorName === 'animations') {
            await extractAnimationsFromCrawledPages();
          }
          console.log(`${extractorName} extraction completed successfully.`);

          // Update cache
          cacheManager.updateCacheForStep(extractorName, config);
        } catch (error) {
          console.error(`Error running ${extractorName} extractor:`, error.message);
        }
      } else {
        console.log(`\n${extractorName.charAt(0).toUpperCase() + extractorName.slice(1)} extraction [SKIPPED]`);
        console.log(`Using existing ${extractorName} analysis.`);
      }
    } else {
      console.warn(`Warning: Extractor "${extractorName}" not found. Skipping.`);
    }
  }

  // Step 3: Generate design tokens
  let tokens;
  if (runAll || stepsToRun.tokens) {
    console.log('\n=== Step 3: Generating design tokens ===');
    try {
      tokens = await generateDesignTokens();
      console.log('Design tokens generated successfully.');

      // Update cache
      cacheManager.updateCacheForStep('tokens', config);
    } catch (error) {
      console.error('Error generating design tokens:', error.message);
      // Create an empty tokens object to avoid errors in subsequent steps
      tokens = {
        typography: {},
        colors: {},
        spacing: {},
        borders: {},
        animations: {}
      };
    }
  } else {
    console.log('\n=== Step 3: Generating design tokens [SKIPPED] ===');
    console.log('Using existing design tokens.');

    // Load existing tokens
    try {
      const tokensFile = path.join(config.outputDir, 'tokens/tokens.json');
      if (fs.existsSync(tokensFile)) {
        tokens = JSON.parse(fs.readFileSync(tokensFile, 'utf8'));
      } else {
        tokens = {
          typography: {},
          colors: {},
          spacing: {},
          borders: {},
          animations: {}
        };
      }
    } catch (error) {
      console.error('Error loading existing tokens:', error.message);
      tokens = {
        typography: {},
        colors: {},
        spacing: {},
        borders: {},
        animations: {}
      };
    }
  }

  // Step 4: Generate markdown report
  if (runAll || stepsToRun.reports) {
    console.log('\n=== Step 4: Generating markdown report ===');
    try {
      if (tokens && Object.keys(tokens).length > 0) {
        // Make sure tokens has the expected structure
        const validTokens = {
          typography: tokens.typography || {},
          colors: tokens.colors || {},
          spacing: tokens.spacing || {},
          borders: tokens.borders || {},
          animations: tokens.animations || {}
        };
        await generateMarkdownReport(validTokens);
        console.log('Markdown report generated successfully.');
      } else {
        console.log('Skipping markdown report generation because no tokens were generated.');
      }
    } catch (error) {
      console.error('Error generating markdown report:', error.message);
    }
  } else {
    console.log('\n=== Step 4: Generating markdown report [SKIPPED] ===');
    console.log('Using existing markdown report.');
  }

  // Step 5: Generate HTML reports
  if (runAll || stepsToRun.reports) {
    console.log('\n=== Step 5: Generating HTML reports ===');
    try {
      await generateReports();
      console.log('HTML reports generated successfully.');

      // Update cache
      cacheManager.updateCacheForStep('reports', config);
    } catch (error) {
      console.error('Error generating HTML reports:', error.message);
    }
  } else {
    console.log('\n=== Step 5: Generating HTML reports [SKIPPED] ===');
    console.log('Using existing HTML reports.');
  }

  // Step 6: Component identification (if enabled)
  if (config.withComponents) {
    console.log('\n=== Step 6: Component identification ===');
    console.log('Component identification is not yet implemented.');
    console.log('This feature will be available in a future version.');
  }

  console.log('\nDesign token extraction completed!');
  console.log(`Results saved to: ${config.outputDir}`);
}

// Run the process
run().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}).finally(() => {
  // Ensure the process exits cleanly
  console.log('Process complete. Exiting...');
  process.exit(0);
});
