/**
 * Metadata Gathering Phase
 * - Uses existing paths.json and gathers metadata for each path
 * - Updates paths.json with metadata (body classes, etc.)
 */
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { chromium } from 'playwright';
import { isFileUrl } from '../utils/url-utils.js';
import { CONFIG } from '../utils/config-utils.js';
import {
  extractBodyClasses, extractComponents,
  extractMetaDescription,
  extractPageTitle, extractParagraphTemplates, isPageInvalid,
} from '../utils/page-utils.js';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'output');
const PATHS_FILE = path.join(OUTPUT_DIR, 'paths.json');
const METADATA_FILE = path.join(OUTPUT_DIR, 'metadata.json');
const TEMPLATE_REPORT_FILE = path.join(OUTPUT_DIR, 'template-analysis.md');
const MAX_RETRIES = CONFIG.crawl_settings?.max_retries || 2;
const DEFAULT_COLOR = 'magenta';

/**
 * Reorganize metadata after collection
 * @param {Object} metadata - The original metadata object
 * @param {Object} spinner - A spinner instance
 * @returns {Object} - Enhanced metadata with new groupings
 */
async function organizeMetadata(metadata, spinner = null) {
  const enhanced = {
    ...metadata,
    // Create group_body_class from grouped_paths
    group_body_class: {},
    // Create new groupings
    group_paragraphs: {},
    group_components: {},
    unique_paths: [], // Will hold paths with unique features
  };

  spinner.text = 'Grouping body classes';

  // Add to group_body_class if we have valid body classes
  metadata.paths_with_metadata.forEach(path => {
    if (path.body_classes && !path.error) {
      const bodyClasses = path.body_classes;

      // Initialize group if it doesn't exist
      if (!enhanced.group_body_class[bodyClasses]) {
        enhanced.group_body_class[bodyClasses] = [];
      }

      // Add to the appropriate group
      enhanced.group_body_class[bodyClasses].push({
        url: path.url,
        title: path.title,
        depth: path.depth,
      });
    }
  });

  spinner.text = 'Grouping paragraphs';
  // Group by paragraphs
  metadata.paths_with_metadata.forEach(path => {
    if (path.paragraphs && Array.isArray(path.paragraphs) && path.paragraphs.length > 0) {
      path.paragraphs.forEach(paragraph => {
        if (!enhanced.group_paragraphs[paragraph]) {
          enhanced.group_paragraphs[paragraph] = [];
        }
        enhanced.group_paragraphs[paragraph].push({
          url: path.url,
          title: path.title,
          depth: path.depth,
          body_classes: path.body_classes
        });
      });
    }
  });

  spinner.text = 'Components';
  // Group by components
  metadata.paths_with_metadata.forEach(path => {
    if (path.components && Array.isArray(path.components) && path.components.length > 0) {
      path.components.forEach(component => {
        if (!enhanced.group_components[component]) {
          enhanced.group_components[component] = [];
        }
        enhanced.group_components[component].push({
          url: path.url,
          title: path.title,
          depth: path.depth,
          body_classes: path.body_classes
        });
      });
    }
  });

  spinner.text = 'Grouping unique paths';
  // Create a Set to track unique paths we've already included
  const uniquePathsSet = new Set();

  // Build unique_paths collection
  // First, include one path from each body class group
  Object.entries(enhanced.group_body_class).forEach(([bodyClass, paths]) => {
    if (paths.length > 0) {
      const path = paths[0];
      if (!uniquePathsSet.has(path.url)) {
        uniquePathsSet.add(path.url);
        // Find full path metadata
        const fullPathData = metadata.paths_with_metadata.find(p => p.url === path.url);
        if (fullPathData) {
          enhanced.unique_paths.push({
            url: path.url,
            title: path.title || fullPathData.title,
            depth: path.depth,
            body_classes: fullPathData.body_classes,
            reason: 'unique_body_class',
            paragraphs: fullPathData.paragraphs || [],
            components: fullPathData.components || []
          });
        }
      }
    }
  });

  // Then, include one path for each unique paragraph type
  Object.entries(enhanced.group_paragraphs).forEach(([paragraph, paths]) => {
    if (paths.length > 0) {
      // Find the path with the fewest other paragraphs to get cleaner examples
      const bestPath = paths.reduce((best, current) => {
        const bestData = metadata.paths_with_metadata.find(p => p.url === best.url);
        const currentData = metadata.paths_with_metadata.find(p => p.url === current.url);

        if (!bestData || !currentData) return current;

        const bestParaCount = (bestData.paragraphs || []).length;
        const currentParaCount = (currentData.paragraphs || []).length;

        return currentParaCount < bestParaCount ? current : best;
      }, paths[0]);

      if (!uniquePathsSet.has(bestPath.url)) {
        uniquePathsSet.add(bestPath.url);
        // Find full path metadata
        const fullPathData = metadata.paths_with_metadata.find(p => p.url === bestPath.url);
        if (fullPathData) {
          enhanced.unique_paths.push({
            url: bestPath.url,
            title: bestPath.title || fullPathData.title,
            depth: bestPath.depth,
            body_classes: fullPathData.body_classes,
            reason: 'unique_paragraph',
            paragraphs: fullPathData.paragraphs || [],
            components: fullPathData.components || []
          });
        }
      }
    }
  });

  // Finally, include one path for each unique component
  Object.entries(enhanced.group_components).forEach(([component, paths]) => {
    if (paths.length > 0) {
      // Find the path with the fewest other components to get cleaner examples
      const bestPath = paths.reduce((best, current) => {
        const bestData = metadata.paths_with_metadata.find(p => p.url === best.url);
        const currentData = metadata.paths_with_metadata.find(p => p.url === current.url);

        if (!bestData || !currentData) return current;

        const bestCompCount = (bestData.components || []).length;
        const currentCompCount = (currentData.components || []).length;

        return currentCompCount < bestCompCount ? current : best;
      }, paths[0]);

      if (!uniquePathsSet.has(bestPath.url)) {
        uniquePathsSet.add(bestPath.url);
        // Find full path metadata
        const fullPathData = metadata.paths_with_metadata.find(p => p.url === bestPath.url);
        if (fullPathData) {
          enhanced.unique_paths.push({
            url: bestPath.url,
            title: bestPath.title || fullPathData.title,
            depth: bestPath.depth,
            body_classes: fullPathData.body_classes,
            reason: 'unique_component',
            paragraphs: fullPathData.paragraphs || [],
            components: fullPathData.components || []
          });
        }
      }
    }
  });

  // Sort unique_paths by URL for consistency
  enhanced.unique_paths.sort((a, b) => a.url.localeCompare(b.url));

  spinner.text = 'Grouping complete';

  return enhanced;
}

/**
 * Generate template analysis report
 * @param {Object} metadata - Metadata object
 */
function generateTemplateAnalysis(metadata) {
  // Use the group_body_class or grouped_paths for backward compatibility
  const classGroups = metadata.group_body_class || {};

  // Generate report markdown
  let report = `# ${CONFIG.name} Template Analysis\n\n`;

  // Add summary statistics
  report += '## Summary\n\n';
  report += `- **Total Paths Analyzed**: ${metadata.paths_with_metadata.length}\n`;
  report += `- **Unique Template Patterns**: ${Object.keys(classGroups).length}\n`;
  report += `- **Unique Paragraph Templates**: ${metadata.paragraphs.length}\n`;
  report += `- **Unique Components**: ${metadata.components.length}\n`;
  report += `- **Unique Paths for Testing**: ${metadata.unique_paths ? metadata.unique_paths.length : 'N/A'}\n`;
  report += `- **Base URL**: ${metadata.baseUrl}\n`;
  report += `- **Analysis Date**: ${metadata.scan_time}\n\n`;

  // Add paragraph templates section
  if (metadata.paragraphs.length > 0) {
    report += '## Paragraph Templates\n\n';
    metadata.paragraphs.forEach(template => {
      report += `- \`${template}\`\n`;
    });
    report += '\n';
  }

  // Add a components section
  if (metadata.components.length > 0) {
    report += '## Single Directory Components\n\n';
    metadata.components.forEach(component => {
      report += `- \`${component}\`\n`;
    });
    report += '\n';
  }

  // Add problem paths section
  const problemPaths = metadata.paths_with_metadata.filter(item => item.error);
  if (problemPaths.length > 0) {
    report += `## Problem Pages (${problemPaths.length})\n\n`;
    report += 'The following pages encountered errors during analysis:\n\n';

    problemPaths.forEach(item => {
      report += `- [${item.url}](${item.url}): ${item.error.error_message}\n`;
    });
    report += '\n';
  }

  // Add unique paths section if available
  if (metadata.unique_paths && metadata.unique_paths.length > 0) {
    report += '## Unique Testing Paths\n\n';
    report += 'These paths represent the minimum set needed to test all unique patterns:\n\n';

    metadata.unique_paths.forEach(path => {
      report += `### [${path.title || path.url}](${path.url})\n\n`;
      report += `- **URL**: ${path.url}\n`;
      report += `- **Depth**: ${path.depth}\n`;
      report += `- **Reason**: ${path.reason.replace('_', ' ')}\n`;

      if (path.paragraphs && path.paragraphs.length > 0) {
        report += `- **Paragraphs**: ${path.paragraphs.length}\n`;
        path.paragraphs.forEach(para => {
          report += `  - \`${para}\`\n`;
        });
      }

      if (path.components && path.components.length > 0) {
        report += `- **Components**: ${path.components.length}\n`;
        path.components.forEach(comp => {
          report += `  - \`${comp}\`\n`;
        });
      }

      report += '\n';
    });
  }

  // Add a template patterns section
  report += '## Template Types by Body Classes\n\n';

  // Sort groups by number of pages (most common first)
  const sortedGroups = Object.entries(classGroups)
    .sort((a, b) => b[1].length - a[1].length);

  sortedGroups.forEach(([classes, urls], index) => {
    // Clean up class names for display
    const cleanClasses = classes.trim().replace(/\s+/g, ' ');

    // Analyze the body classes to extract Drupal-specific information
    const drupalInfo = analyzeDrupalBodyClasses(cleanClasses);

    report += `### Pattern ${index + 1}: ${urls.length} pages\n\n`;
    report += `**Body Classes**: \`${cleanClasses}\`\n\n`;

    // Add Drupal-specific information if available
    if (drupalInfo.contentType) {
      report += `**Content Type**: \`${drupalInfo.contentType}\`\n\n`;
    }

    if (drupalInfo.pageType) {
      report += `**Page Type**: \`${drupalInfo.pageType}\`\n\n`;
    }

    if (drupalInfo.otherInfo.length > 0) {
      report += `**Other Information**:\n`;
      drupalInfo.otherInfo.forEach(info => {
        report += `- ${info}\n`;
      });
      report += '\n';
    }

    report += '**Pages**:\n';

    urls.forEach(item => {
      report += `- [${item.title || item.url}](${item.url}) (Depth: ${item.depth})\n`;
    });

    report += '\n';
  });

  // Write to file
  fs.writeFileSync(TEMPLATE_REPORT_FILE, report);
}

/**
 * Analyze Drupal body classes to extract useful information
 * @param {string} bodyClasses - Body classes string
 * @returns {Object} - Extracted information
 */
function analyzeDrupalBodyClasses(bodyClasses) {
  const result = {
    contentType: '',
    pageType: '',
    otherInfo: [],
  };

  const classes = bodyClasses.split(' ');

  // Extract content type
  const contentTypeMatch = classes.find(cls => cls.startsWith('page-node-type-'));
  if (contentTypeMatch) {
    result.contentType = contentTypeMatch.replace('page-node-type-', '');
  }

  // Extract page type
  if (classes.includes('path-frontpage')) {
    result.pageType = 'Front Page';
  } else if (classes.includes('path-taxonomy')) {
    result.pageType = 'Taxonomy Term Page';
  } else if (classes.includes('path-node') && classes.includes('node--view-mode-full')) {
    result.pageType = 'Full Node Page';
  } else if (classes.includes('path-user')) {
    result.pageType = 'User Page';
  } else if (classes.includes('path-search')) {
    result.pageType = 'Search Page';
  }

  // Extract other useful information
  if (classes.includes('user-logged-in')) {
    result.otherInfo.push('Logged-in view');
  }

  if (classes.includes('toolbar-fixed')) {
    result.otherInfo.push('Admin toolbar present');
  }

  // Check for language information
  const langMatch = classes.find(cls => cls.startsWith('lang-'));
  if (langMatch) {
    result.otherInfo.push(`Language: ${langMatch.replace('lang-', '')}`);
  }

  // Write to a file
  // fs.writeFileSync(TEMPLATE_REPORT_FILE, report);

  return result;
}

/**
 * Run the metadata gathering phase
 * @param {string} baseUrl - Base URL to crawl
 * @param {number} batchSize - How many paths to process in each batch
 * @param {Object} spinner
 */
async function gatherMetadata(baseUrl = CONFIG.base_url, batchSize = CONFIG.crawl_settings?.batch_size || 20, spinner = null) {
  spinner.color = DEFAULT_COLOR;

  // Start with the initial spinner
  spinner.text = `Starting metadata gathering for ${chalk.bold(CONFIG.name)} from ${chalk.bold(baseUrl)}`;

  // Check if paths.json exists
  if (!fs.existsSync(PATHS_FILE)) {
    spinner.fail(`Error: ${PATHS_FILE} not found. Run initial crawl first.`); // Ensure spinner_id is not here
    return;
  }

  // Load existing paths data
  let pathsData;
  try {
    spinner.text = chalk.blue('Loading existing paths data...');
    pathsData = JSON.parse(fs.readFileSync(PATHS_FILE, 'utf8'));
  } catch (error) {
    spinner.fail(`Error reading paths file: ${error.message}`); // spinner_id removed
    return;
  }

  // Initialize metadata
  const metadata = {
    baseUrl,
    scan_time: new Date().toISOString(),
    paths_with_metadata: [],
    paragraphs: [], // Will contain unique paragraph templates
    components: [], // Will contain unique SDC components
  };

  // Get all internal paths (exclude files)
  const pathsToProcess = pathsData.all_paths
    .filter(item => !isFileUrl(item.url))
    .map(item => ({
      ...item,
      metadata_processed: false,
    }));

  spinner.text = chalk.magentaBright(`Found ${chalk.bold(pathsToProcess.length)} paths to gather metadata for`); // Uncommented

  // Launch browser
  const browser = await chromium.launch();
  let page = await browser.newPage();

  // Set timeout from config
  page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);

  /**
   * Creates a new page if the current one is invalid
   * @returns {Promise<import('playwright').Page>} - A valid page instance
   */
  async function ensureValidPage() {
    if (await isPageInvalid(page)) {
      // Use the same consistent spinner ID
      spinner.color = 'yellow';
      spinner.text = 'Creating a new page instance after failure...';

      try {
        await page.close().catch(() => {}); // Attempt to close gracefully, ignore errors
      } catch (e) {
        // Ignore close errors
      }
      page = await browser.newPage();
      page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);
    }
    spinner.color = DEFAULT_COLOR;
    return page;
  }

  try {
    // Calculate the number of batches
    const totalBatches = Math.ceil(pathsToProcess.length / batchSize);

    // Process in batches
    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
      const batchStart = batchNum * batchSize;
      const batchEnd = Math.min((batchNum + 1) * batchSize, pathsToProcess.length);
      const currentBatch = pathsToProcess.slice(batchStart, batchEnd);

      spinner.text = `Processing batch ${chalk.bold(`${batchNum + 1}/${totalBatches}`)} (paths ${batchStart + 1} to ${batchEnd})`;

      // Track batch stats
      let batchSuccessCount = 0;
      let batchErrorCount = 0;
      let batchParagraphCount = 0;
      let batchComponentCount = 0;

      // Process each path in the batch
      for (let i = 0; i < currentBatch.length; i++) {
        const pathItem = currentBatch[i];
        const overallProgress = `${batchStart + i + 1}/${pathsToProcess.length}`;

        spinner.text = chalk.magentaBright(`Processing ${chalk.bold(overallProgress)} of ${pathsToProcess.length} - ${chalk.yellow(pathItem.url)}`);

        // Ensure we have a valid page
        page = await ensureValidPage();

        let retryCount = 0;
        let success = false;
        let pathMetadata = {
          url: pathItem.url,
          depth: pathItem.depth,
          body_classes: '',
          title: '',
          meta_description: '',
          error: null,
        };

        while (retryCount <= MAX_RETRIES && !success) {
          try {
            // Visit the URL
            await page.goto(pathItem.url, {
              waitUntil: 'domcontentloaded',
              timeout: CONFIG.crawl_settings?.timeout || 45000,
            });

            // Extract metadata
            pathMetadata.body_classes = await extractBodyClasses(page);
            pathMetadata.title = await extractPageTitle(page);
            pathMetadata.meta_description = await extractMetaDescription(page);
            pathMetadata.paragraphs = await extractParagraphTemplates(page, ['paragraph']);
            pathMetadata.components = await extractComponents(page);

            // Mark success
            success = true;

          } catch (error) {
            retryCount++;

            if (retryCount <= MAX_RETRIES) {
              // Use update instead of changing ID
              spinner.text = chalk.yellow(`Retry ${retryCount}/${MAX_RETRIES} for ${pathItem.url}: ${error.message}`);
              // Ensure we have a fresh page for the next try
              page = await ensureValidPage();
            } else {
              // Use update instead of changing ID
              spinner.text = chalk.red(`Failed to process ${pathItem.url} after ${MAX_RETRIES} retries: ${error.message}`);

              // Record the error
              pathMetadata.error = {
                error_type: error.name || 'Unknown',
                error_message: error.message || 'No details available',
                retries: retryCount,
              };
              pathMetadata.body_classes = 'ERROR-PAGE-LOAD-FAILED';
              batchErrorCount++;
            }
          }
        }

        // Add to paths_with_metadata
        metadata.paths_with_metadata.push(pathMetadata);

        // Track statistics
        if (!pathMetadata.error) {
          batchSuccessCount++;
          if (pathMetadata.paragraphs && pathMetadata.paragraphs.length) {
            batchParagraphCount += pathMetadata.paragraphs.length;
          }
          if (pathMetadata.components && pathMetadata.components.length) {
            batchComponentCount += pathMetadata.components.length;
          }
        }



        // Save progress after each item (allows for resuming if interrupted)
        fs.writeFileSync(METADATA_FILE, JSON.stringify(metadata, null, 2));
      }

      // Update with batch completion info
      spinner.text = chalk.green(`Batch ${batchNum + 1}/${totalBatches} completed: `) +
        chalk.green(`${batchSuccessCount} successful, `) +
        chalk.red(`${batchErrorCount} failed, `) +
        chalk.blue(`${batchParagraphCount} paragraphs, `) +
        chalk.magenta(`${batchComponentCount} components`);

      // Brief pause between batches
      if (batchNum < totalBatches - 1) {
        spinner.text = 'Pausing briefly before next batch...';
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Collect unique paragraphs and components
    spinner.text = 'Collecting unique paragraphs and components...';

    const uniqueParagraphs = new Set();
    const uniqueComponents = new Set();

    // Process each path to extract unique paragraphs and components
    metadata.paths_with_metadata.forEach(pathData => {
      if (pathData.paragraphs && Array.isArray(pathData.paragraphs)) {
        pathData.paragraphs.forEach(paragraph => uniqueParagraphs.add(paragraph));
      }

      if (pathData.components && Array.isArray(pathData.components)) {
        pathData.components.forEach(component => uniqueComponents.add(component));
      }
    });

    // Convert Sets to sorted Arrays and store in metadata
    metadata.paragraphs = [...uniqueParagraphs].sort();
    metadata.components = [...uniqueComponents].sort();

    spinner.text = `Found ${chalk.bold(metadata.paragraphs.length)} unique paragraph templates and ${chalk.bold(metadata.components.length)} unique components`;

    // Organize metadata with new grouping structure
    spinner.text = 'Organizing metadata into grouped collections...';
    const organizedMetadata = await organizeMetadata(metadata, spinner); // Pass spinner
    spinner.text = `Created ${chalk.bold(organizedMetadata.unique_paths.length)} unique testing paths`;

    // Generate template analysis
    spinner.text = 'Generating template analysis...';
    generateTemplateAnalysis(organizedMetadata);
    spinner.text = 'Template analysis report generated';

    // Save the complete metadata with paragraphs and components to metadata.json
    spinner.text = 'Saving complete metadata...';
    try {
      fs.writeFileSync(METADATA_FILE, JSON.stringify(organizedMetadata, null, 2));
      spinner.text = `Complete metadata saved to ${METADATA_FILE}`;
    } catch (error) {
      spinner.fail(`Error saving metadata: ${error.message}`);
    }

    // Calculate some statistics
    const uniqueTemplates = Object.keys(organizedMetadata.group_body_class || {}).length;
    const uniqueParagraphGroups = Object.keys(organizedMetadata.group_paragraphs || {}).length;
    const uniqueComponentGroups = Object.keys(organizedMetadata.group_components || {}).length;
    const processedCount = organizedMetadata.paths_with_metadata.length;
    const errorCount = organizedMetadata.paths_with_metadata.filter(p => p.error).length;
    const successCount = processedCount - errorCount;
    const uniqueTestingPaths = organizedMetadata.unique_paths?.length || 0;

    // Final summary
    spinner.text = 'Preparing final summary...';
    // Create a visually appealing summary box
    const summaryBox = [
      `${chalk.bold('Processed:')} ${chalk.green(processedCount)} paths (${chalk.green(successCount)} successful, ${chalk.red(errorCount)} failed)`,
      `${chalk.bold('Templates:')} ${chalk.blue(uniqueTemplates)} unique body classes`,
      `${chalk.bold('Paragraphs:')} ${chalk.yellow(organizedMetadata.paragraphs.length)} unique templates in ${chalk.yellow(uniqueParagraphGroups)} groups`,
      `${chalk.bold('Components:')} ${chalk.magenta(organizedMetadata.components.length)} unique components in ${chalk.magenta(uniqueComponentGroups)} groups`,
      `${chalk.bold('Testing:')} ${chalk.cyan(uniqueTestingPaths)} unique representative paths`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green('✅ Metadata Gathering Complete!'),
      chalk.bold('───────────────────────────────────'),
    ];

    // Show success before summary so the final line appears complete.
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();
  } catch (error) {
    spinner.fail(`Error during metadata gathering: ${error.message}`);
  } finally {
    // Left intentionally blank
  }
}

export { gatherMetadata, organizeMetadata };
