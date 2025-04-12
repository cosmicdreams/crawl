// src/runner/setup-directories.js
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';

import { ui } from '../utils/ui-utils.js';
import colors from '../utils/colors.js';

// Get the current directory (ESM equivalent of __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Set up necessary directories for the application
 * @param {object} config - Application configuration
 * @returns {object} - Directory paths object
 */
export default async function setupDirectories(config) {
  // Create output directories
  const rawDir = path.join(config.outputDir, 'raw');
  const cssDir = path.join(config.outputDir, 'css');
  const tokensDir = path.join(config.outputDir, 'tokens');
  const reportsDir = path.join(config.outputDir, 'reports');
  const screenshotsDir = path.join(config.outputDir, 'screenshots');

  // Create results directories
  await createResultsDirectories([rawDir, cssDir, tokensDir, reportsDir, screenshotsDir]);

  // Create AI directories and template files
  await createAIDirectories();

  // Display configuration
  displayConfiguration(config);

  return { rawDir, cssDir, tokensDir, reportsDir, screenshotsDir };
}

/**
 * Create results directories
 * @param {string[]} directories - Array of directory paths to create
 */
async function createResultsDirectories(directories) {
  const dirSpinner = ui.createSpinner('Creating output directories...');
  dirSpinner.start();

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  await dirSpinner.succeed('Output directories created successfully');
}

/**
 * Create AI directories and subdirectories
 */
async function createAIDirectories() {
  // Create AI directories at the root level (platform level concerns)
  const aiDir = path.join(dirname(dirname(__dirname)), 'ai');
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

  // Create template files
  await createTemplateFiles(aiDir);
}

/**
 * Create template files from templates
 * @param {string} aiDir - AI directory path
 */
async function createTemplateFiles(aiDir) {
  const templateSpinner = ui.createSpinner('Creating template files...');
  templateSpinner.start();

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
        const templatePath = path.join(dirname(dirname(__dirname)), 'src/templates', src);
        if (fs.existsSync(templatePath)) {
          const templateContent = fs.readFileSync(templatePath, 'utf8');
          fs.writeFileSync(dest, templateContent);
          templateSpinner.text = `Created template file: ${path.basename(dest)}`;
        }
      } catch (error) {
        ui.warning(`Could not create template file ${path.basename(dest)}: ${error.message}`);
      }
    }
  });

  templateSpinner.succeed('Template files created successfully');
}

/**
 * Display configuration box with key settings
 * @param {object} config - Application configuration
 */
function displayConfiguration(config) {
  ui.header('Configuration');
  ui.box(
    `Base URL: ${colors.cyan(config.baseUrl)}\n` +
    `Max Pages: ${colors.cyan(config.maxPages)}\n` +
    `Output Directory: ${colors.cyan(config.outputDir)}\n` +
    `Extractors: ${colors.cyan(config.extractorsToRun.join(', '))}`,
    { borderColor: 'cyan' }
  );
}