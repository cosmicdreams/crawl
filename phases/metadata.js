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

  if (spinner) {
    spinner.text = 'Grouping body classes';
  }

  // Add to group_body_class if we have valid body classes
  metadata.paths_with_metadata.forEach(path => {
    if (path.body_classes && path.body_classes.length > 0) {
      // Sort body classes to create consistent key
      const sortedClasses = [...path.body_classes].sort();
      const key = sortedClasses.join(' ');
      
      if (!enhanced.group_body_class[key]) {
        enhanced.group_body_class[key] = {
          body_classes: sortedClasses,
          paths: [],
          count: 0,
        };
      }
      
      enhanced.group_body_class[key].paths.push(path.url);
      enhanced.group_body_class[key].count++;
    }
  });

  if (spinner) {
    spinner.text = 'Grouping paragraph templates';
  }

  // Group by paragraph patterns
  metadata.paths_with_metadata.forEach(path => {
    if (path.paragraph_templates && path.paragraph_templates.length > 0) {
      path.paragraph_templates.forEach(template => {
        const pattern = template.pattern || 'unknown';
        if (!enhanced.group_paragraphs[pattern]) {
          enhanced.group_paragraphs[pattern] = {
            pattern,
            paths: [],
            count: 0,
            examples: [],
          };
        }
        
        enhanced.group_paragraphs[pattern].paths.push(path.url);
        enhanced.group_paragraphs[pattern].count++;
        
        // Add example if not already present
        if (template.example && !enhanced.group_paragraphs[pattern].examples.includes(template.example)) {
          enhanced.group_paragraphs[pattern].examples.push(template.example);
        }
      });
    }
  });

  if (spinner) {
    spinner.text = 'Grouping components';
  }

  // Group by component patterns
  metadata.paths_with_metadata.forEach(path => {
    if (path.components && path.components.length > 0) {
      path.components.forEach(component => {
        const type = component.type || 'unknown';
        if (!enhanced.group_components[type]) {
          enhanced.group_components[type] = {
            type,
            paths: [],
            count: 0,
            variants: new Set(),
          };
        }
        
        enhanced.group_components[type].paths.push(path.url);
        enhanced.group_components[type].count++;
        
        // Track variants
        if (component.classes) {
          enhanced.group_components[type].variants.add(component.classes.join(' '));
        }
      });
    }
  });

  // Convert Set to Array for JSON serialization
  Object.keys(enhanced.group_components).forEach(key => {
    enhanced.group_components[key].variants = Array.from(enhanced.group_components[key].variants);
  });

  if (spinner) {
    spinner.text = 'Identifying unique paths';
  }

  // Identify paths with unique features (only appear in one place)
  const allBodyClasses = new Map();
  const allParagraphPatterns = new Map();
  const allComponentTypes = new Map();

  // Count occurrences
  metadata.paths_with_metadata.forEach(path => {
    // Count body class combinations
    if (path.body_classes && path.body_classes.length > 0) {
      const key = [...path.body_classes].sort().join(' ');
      allBodyClasses.set(key, (allBodyClasses.get(key) || 0) + 1);
    }
    
    // Count paragraph patterns
    if (path.paragraph_templates) {
      path.paragraph_templates.forEach(template => {
        const pattern = template.pattern || 'unknown';
        allParagraphPatterns.set(pattern, (allParagraphPatterns.get(pattern) || 0) + 1);
      });
    }
    
    // Count component types
    if (path.components) {
      path.components.forEach(component => {
        const type = component.type || 'unknown';
        allComponentTypes.set(type, (allComponentTypes.get(type) || 0) + 1);
      });
    }
  });

  // Find paths with unique features
  metadata.paths_with_metadata.forEach(path => {
    let hasUniqueFeature = false;
    const uniqueFeatures = [];
    
    // Check for unique body class combinations
    if (path.body_classes && path.body_classes.length > 0) {
      const key = [...path.body_classes].sort().join(' ');
      if (allBodyClasses.get(key) === 1) {
        hasUniqueFeature = true;
        uniqueFeatures.push(`Unique body classes: ${key}`);
      }
    }
    
    // Check for unique paragraph patterns
    if (path.paragraph_templates) {
      path.paragraph_templates.forEach(template => {
        const pattern = template.pattern || 'unknown';
        if (allParagraphPatterns.get(pattern) === 1) {
          hasUniqueFeature = true;
          uniqueFeatures.push(`Unique paragraph pattern: ${pattern}`);
        }
      });
    }
    
    // Check for unique component types
    if (path.components) {
      path.components.forEach(component => {
        const type = component.type || 'unknown';
        if (allComponentTypes.get(type) === 1) {
          hasUniqueFeature = true;
          uniqueFeatures.push(`Unique component type: ${type}`);
        }
      });
    }
    
    if (hasUniqueFeature) {
      enhanced.unique_paths.push({
        url: path.url,
        unique_features: uniqueFeatures,
      });
    }
  });

  return enhanced;
}

/**
 * Run the metadata gathering phase
 * @param {string} baseUrl - Base URL to crawl
 * @param {Object} spinner - A spinner instance
 */
async function gatherMetadata(baseUrl = CONFIG.base_url, spinner = null) {
  // Defensive check for spinner
  if (!spinner) {
    spinner = {
      text: '',
      fail: (message) => console.error('Error:', message),
      color: DEFAULT_COLOR,
      stopAndPersist: () => {},
    };
  }

  // Start with the initial spinner
  spinner.text = `Starting metadata gathering for ${chalk.bold(CONFIG.name)} from ${chalk.bold(baseUrl)}`;

  // Check if paths.json exists
  if (!fs.existsSync(PATHS_FILE)) {
    spinner.fail(`Error: ${PATHS_FILE} not found. Run initial crawl first.`);
    return;
  }

  // Load existing paths data
  let pathsData;
  try {
    spinner.text = chalk.blue('Loading existing paths data...');
    pathsData = JSON.parse(fs.readFileSync(PATHS_FILE, 'utf8'));
  } catch (error) {
    spinner.fail(`Error reading paths file: ${error.message}`);
    return;
  }

  // Initialize metadata - defensive programming for missing or invalid data
  const metadata = {
    base_url: baseUrl,
    scan_type: 'metadata',
    scan_time: new Date().toISOString(),
    total_pages: 0,
    processed_pages: 0,
    failed_pages: 0,
    paths_with_metadata: [],
    problem_paths: [],
  };

  // Defensive check for pathsData structure
  if (!pathsData || !Array.isArray(pathsData.all_paths)) {
    spinner.fail('Invalid paths data structure found in paths.json');
    return;
  }

  const paths = pathsData.all_paths.filter(Boolean); // Filter out null/undefined entries
  metadata.total_pages = paths.length;

  if (paths.length === 0) {
    spinner.fail('No valid paths found to process');
    return;
  }

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
      try {
        await page.close().catch(() => {}); // Attempt to close gracefully, ignore errors
      } catch (e) {
        // Ignore close errors
      }
      page = await browser.newPage();
      page.setDefaultTimeout(CONFIG.crawl_settings?.timeout || 45000);
    }
    return page;
  }

  try {
    let processedCount = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process each path
    for (const pathItem of paths) {
      // Defensive check for pathItem
      if (!pathItem || !pathItem.url) {
        console.warn('Skipping invalid path item:', pathItem);
        continue;
      }

      processedCount++;
      const percentComplete = Math.round((processedCount / paths.length) * 100);

      // Update the spinner with new text
      spinner.color = 'blue';
      spinner.text = `[${processedCount}/${paths.length} - ${percentComplete}%] Processing: ${chalk.yellow(pathItem.url)}`;

      // Ensure we have a valid page
      page = await ensureValidPage();

      let retryCount = 0;
      let success = false;

      while (retryCount <= MAX_RETRIES && !success) {
        try {
          // Visit the URL
          await page.goto(pathItem.url, {
            waitUntil: 'domcontentloaded',
            timeout: CONFIG.crawl_settings?.timeout || 45000,
          });

          // Extract metadata
          const pageTitle = await extractPageTitle(page).catch(() => 'Unknown');
          const metaDescription = await extractMetaDescription(page).catch(() => '');
          const bodyClasses = await extractBodyClasses(page).catch(() => []);
          const components = await extractComponents(page).catch(() => []);
          const paragraphTemplates = await extractParagraphTemplates(page).catch(() => []);

          // Create metadata entry
          const pathMetadata = {
            url: pathItem.url,
            title: pageTitle,
            meta_description: metaDescription,
            body_classes: bodyClasses,
            components: components,
            paragraph_templates: paragraphTemplates,
            depth: pathItem.depth || 0,
            source: pathItem.source || 'unknown',
          };

          metadata.paths_with_metadata.push(pathMetadata);

          // Mark success
          success = true;
          successCount++;

        } catch (error) {
          retryCount++;

          if (retryCount <= MAX_RETRIES) {
            console.log(`  Retry ${retryCount}/${MAX_RETRIES} for ${pathItem.url}: ${error.message}`);
            // Ensure we have a fresh page for the next try
            page = await ensureValidPage();
          } else {
            console.error(`Failed to process ${pathItem.url} after ${MAX_RETRIES} retries: ${error.message}`);

            // Record the problem
            metadata.problem_paths.push({
              url: pathItem.url,
              error_type: error.name || 'Unknown',
              error_message: error.message || 'No details available',
              severity: 'high',
              retries: retryCount,
            });
            errorCount++;
          }
        }
      }
    }

    // Update final counts
    metadata.processed_pages = successCount;
    metadata.failed_pages = errorCount;

    // Organize the metadata into more useful groupings
    spinner.text = 'Organizing metadata into groups...';
    const organizedMetadata = await organizeMetadata(metadata, spinner);

    // Write metadata to files
    spinner.text = 'Writing metadata files...';
    
    // Write main metadata file
    fs.writeFileSync(METADATA_FILE, JSON.stringify(organizedMetadata, null, 2));

    // Generate a report
    await generateTemplateReport(organizedMetadata, spinner);

    // Show success summary
    const summaryBox = [
      `${chalk.bold('Metadata Collected:')} ${chalk.green(successCount)} pages`,
      `${chalk.bold('Failed:')} ${chalk.red(errorCount)} pages`,
      `${chalk.bold('Body Class Groups:')} ${chalk.green(Object.keys(organizedMetadata.group_body_class).length)}`,
      `${chalk.bold('Component Types:')} ${chalk.green(Object.keys(organizedMetadata.group_components).length)}`,
      `${chalk.bold('Unique Pages:')} ${chalk.green(organizedMetadata.unique_paths.length)}`,
      `${chalk.bold('Results:')} Saved to ${chalk.cyan(METADATA_FILE)}`,
      chalk.bold('───────────────────────────────────'),
      chalk.bold.green('✅ Phase 4'),
      chalk.bold('───────────────────────────────────'),
    ];

    spinner.color = 'green';
    spinner.text = summaryBox.join('\n');
    spinner.stopAndPersist();

  } catch (error) {
    // Use the passed spinner for error reporting
    spinner.fail(`Error during metadata gathering: ${error.message}`);
  } finally {
    await browser.close();
  }
}

/**
 * Generate a template analysis report
 * @param {Object} metadata - The organized metadata
 * @param {Object} spinner - A spinner instance
 */
async function generateTemplateReport(metadata, spinner = null) {
  if (spinner) {
    spinner.text = 'Generating template analysis report...';
  }

  const reportLines = [];
  
  reportLines.push('# Template Analysis Report');
  reportLines.push('');
  reportLines.push(`Generated: ${new Date().toISOString()}`);
  reportLines.push(`Base URL: ${metadata.base_url}`);
  reportLines.push(`Total Pages: ${metadata.total_pages}`);
  reportLines.push(`Processed: ${metadata.processed_pages}`);
  reportLines.push('');

  // Body Class Groups
  reportLines.push('## Body Class Groups');
  reportLines.push('');
  const bodyClassGroups = Object.entries(metadata.group_body_class)
    .sort(([,a], [,b]) => b.count - a.count);
    
  if (bodyClassGroups.length === 0) {
    reportLines.push('No body class patterns found.');
  } else {
    bodyClassGroups.forEach(([key, group]) => {
      reportLines.push(`### ${key} (${group.count} pages)`);
      reportLines.push('');
      reportLines.push('**Body Classes:**');
      group.body_classes.forEach(cls => reportLines.push(`- ${cls}`));
      reportLines.push('');
      reportLines.push('**Pages:**');
      group.paths.slice(0, 5).forEach(path => reportLines.push(`- ${path}`));
      if (group.paths.length > 5) {
        reportLines.push(`- ... and ${group.paths.length - 5} more`);
      }
      reportLines.push('');
    });
  }

  // Component Types
  reportLines.push('## Component Types');
  reportLines.push('');
  const componentGroups = Object.entries(metadata.group_components)
    .sort(([,a], [,b]) => b.count - a.count);
    
  if (componentGroups.length === 0) {
    reportLines.push('No component patterns found.');
  } else {
    componentGroups.forEach(([type, group]) => {
      reportLines.push(`### ${type} (${group.count} occurrences)`);
      reportLines.push('');
      if (group.variants.length > 0) {
        reportLines.push('**Variants:**');
        group.variants.slice(0, 3).forEach(variant => reportLines.push(`- ${variant}`));
        if (group.variants.length > 3) {
          reportLines.push(`- ... and ${group.variants.length - 3} more`);
        }
        reportLines.push('');
      }
      reportLines.push('**Found on:**');
      [...new Set(group.paths)].slice(0, 3).forEach(path => reportLines.push(`- ${path}`));
      if ([...new Set(group.paths)].length > 3) {
        reportLines.push(`- ... and ${[...new Set(group.paths)].length - 3} more pages`);
      }
      reportLines.push('');
    });
  }

  // Unique Paths
  reportLines.push('## Unique Paths');
  reportLines.push('');
  if (metadata.unique_paths.length === 0) {
    reportLines.push('No unique paths found.');
  } else {
    metadata.unique_paths.forEach(item => {
      reportLines.push(`### ${item.url}`);
      reportLines.push('');
      reportLines.push('**Unique Features:**');
      item.unique_features.forEach(feature => reportLines.push(`- ${feature}`));
      reportLines.push('');
    });
  }

  // Problem Paths
  if (metadata.problem_paths.length > 0) {
    reportLines.push('## Problem Paths');
    reportLines.push('');
    metadata.problem_paths.forEach(problem => {
      reportLines.push(`### ${problem.url}`);
      reportLines.push(`- **Error:** ${problem.error_type}: ${problem.error_message}`);
      reportLines.push(`- **Retries:** ${problem.retries}`);
      reportLines.push('');
    });
  }

  // Write the report
  fs.writeFileSync(TEMPLATE_REPORT_FILE, reportLines.join('\n'));
}

export { gatherMetadata };