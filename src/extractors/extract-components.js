/**
 * Component Extractor Module
 *
 * Identifies and extracts components from HTML pages for analysis and documentation.
 * Designed to work with the site crawler to build a component library.
 */

import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import telemetryManager from '../utils/telemetry-manager.js';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Component selectors to look for
const COMPONENT_SELECTORS = [
  // Common component selectors
  '[data-component]',
  '[data-block]',
  '[data-module]',
  '[data-element]',

  // Drupal/Cohesion specific
  '.coh-container',
  '.coh-component',
  '.coh-row',
  '.coh-column',
  '.coh-wysiwyg',

  // Bootstrap components
  '.card',
  '.alert',
  '.navbar',
  '.modal',
  '.carousel',
  '.accordion',
  '.dropdown',
  '.btn-group',
  '.jumbotron',
  '.nav',
  '.pagination',
  '.progress',
  '.list-group',

  // Foundation components
  '.callout',
  '.top-bar',
  '.orbit',
  '.reveal',
  '.dropdown-pane',
  '.accordion-menu',
  '.tabs'
];

// List of machine names that are highly likely to be considered components
const prospectiveComponentMachineNames = [
  'button',
  'card',
  'modal',
  'accordion',
  'tabs',
  'form',
  'hero',
  'banner',
  'navigation',
  'menu',
  'slider',
  'carousel',
  'gallery',
  'testimonial',
  'footer',
  'header',
  'sidebar',
  'pagination',
  'alert',
  'notification',
  'tooltip',
  'popover',
  'dropdown',
  'breadcrumb'
];

// Default configuration
const defaultConfig = {
  // Base URL of the site
  baseUrl: process.env.SITE_DOMAIN,

  // Input file with crawl results
  inputFile: path.join(__dirname, '../../results/raw/crawl-results.json'),

  // Output file for the component analysis
  outputFile: path.join(__dirname, '../../config/components.json'),

  // Report file for the component library
  reportFile: path.join(__dirname, '../../results/reports/component-library.html'),
  
  // Filtered component list (when set, only extract components that match these machine names)
  FilteredComponentList: [],

  // Maximum number of pages to analyze (set to -1 for all pages)
  maxPages: 20,

  // Screenshots directory
  screenshotsDir: path.join(__dirname, '../../results/screenshots/components'),

  // Whether to write results to file
  writeToFile: true,

  // Whether to generate visualizations
  generateVisualizations: true,

  // Twig debug mode
  twigDebugMode: false,

  // Telemetry options
  telemetry: {
    // Whether to use telemetry
    enabled: true,

    // Directory to store telemetry reports
    outputDir: path.join(__dirname, '../../results/telemetry/components'),

    // Whether to log telemetry data to console
    logToConsole: true,

    // Whether to write telemetry data to file
    writeToFile: true,

    // Minimum duration (in ms) to log for operations
    minDuration: 5,

    // Whether to include timestamps in telemetry data
    includeTimestamps: true,

    // Whether to include memory usage in telemetry data
    includeMemoryUsage: true
  }
};

/**
 * Extract components from a page
 * @param {import('playwright').Page} page - Playwright page object
 * @param {Object} config - Configuration object
 * @returns {Promise<Array>} - Array of components
 */
async function extractComponents(page, config) {
  const filterList = config.FilteredComponentList || [];
  const useFilter = Array.isArray(filterList) && filterList.length > 0;

  return await page.evaluate((params) => {
    const { selectors, prospectiveNames, useFilter, filterList } = params;
    const components = [];
    const processedElements = new Set();

    // Helper function to get computed style for an element
    function getComputedStyleForElement(element) {
      const computedStyle = window.getComputedStyle(element);
      const styles = {};

      // Get all computed styles
      for (let i = 0; i < computedStyle.length; i++) {
        const prop = computedStyle[i];
        styles[prop] = computedStyle.getPropertyValue(prop);
      }

      return styles;
    }

    // Helper function to get scripts associated with an element
    function getScriptsForElement(element) {
      const scripts = [];
      const scriptElements = document.querySelectorAll('script');

      // This is a simple heuristic and won't catch all scripts related to a component
      for (const script of scriptElements) {
        if (script.id && element.id && script.id.includes(element.id)) {
          scripts.push({
            id: script.id,
            src: script.src || null,
            content: script.innerHTML || null
          });
        }
      }

      return scripts;
    }

    // Helper function to check if an element matches the filtered component list
    function matchesFilteredList(element, type, filterList) {
      if (!useFilter) return true;
      
      // Check type against filter list
      if (filterList.some(filter => type.toLowerCase().includes(filter.toLowerCase()))) {
        return true;
      }
      
      // Check class names against filter list
      if (element.classList && Array.from(element.classList).some(cls => 
        filterList.some(filter => cls.toLowerCase().includes(filter.toLowerCase()))
      )) {
        return true;
      }
      
      // Check comments around the element for component identifiers
      const prevNode = element.previousSibling;
      const nextNode = element.nextSibling;
      
      // Check if previous node is a comment containing filter terms
      if (prevNode && prevNode.nodeType === 8) { // 8 is comment node
        const commentText = prevNode.textContent || '';
        if (filterList.some(filter => commentText.toLowerCase().includes(filter.toLowerCase()))) {
          return true;
        }
      }
      
      // Check if next node is a comment containing filter terms
      if (nextNode && nextNode.nodeType === 8) {
        const commentText = nextNode.textContent || '';
        if (filterList.some(filter => commentText.toLowerCase().includes(filter.toLowerCase()))) {
          return true;
        }
      }
      
      // Check data attributes for filter terms
      for (const attr of element.attributes) {
        if (attr.name.startsWith('data-') && 
            filterList.some(filter => attr.value.toLowerCase().includes(filter.toLowerCase()))) {
          return true;
        }
      }
      
      return false;
    }

    // Process each selector
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);

        for (const element of elements) {
          // Skip if we've already processed this element
          if (processedElements.has(element)) continue;
          processedElements.add(element);

          // Get component type from selector or data attribute
          let type = selector.replace(/[.#[\]='"\s]/g, '');
          if (element.dataset.component) {
            type = element.dataset.component;
          } else if (element.dataset.block) {
            type = element.dataset.block;
          } else if (element.dataset.module) {
            type = element.dataset.module;
          } else if (element.dataset.element) {
            type = element.dataset.element;
          }

          // Check if this component matches our filtered list if filtering is enabled
          if (useFilter && !matchesFilteredList(element, type, filterList)) {
            continue;
          }

          // Get component attributes
          const attributes = {};
          for (const attr of element.attributes) {
            attributes[attr.name] = attr.value;
          }

          // Get component styles
          const styles = getComputedStyleForElement(element);

          // Get scripts associated with the component
          const scripts = getScriptsForElement(element);

          // Create component object
          const component = {
            type,
            id: element.id || null,
            classes: Array.from(element.classList),
            attributes,
            styles,
            scripts,
            html: element.outerHTML,
            children: element.children.length,
            textContent: element.textContent.trim().substring(0, 100) + (element.textContent.length > 100 ? '...' : '')
          };

          components.push(component);
        }
      } catch (e) {
        // Skip invalid selectors
        // This is in browser context, so cannot use logger
        console.error(`Error processing selector ${selector}: ${e.message}`);
      }
    }

    return components;
  }, { 
    selectors: COMPONENT_SELECTORS, 
    prospectiveNames: prospectiveComponentMachineNames,
    useFilter,
    filterList
  });
}

/**
 * Extract components from a single page
 * @param {import('@playwright/test').Page} page - Playwright page object
 * @param {string} [url] - URL of the page
 * @param {Object} [config] - Configuration options
 * @returns {Promise<Object>} Extracted components
 */
export async function extractComponentsFromPage(page, url = null, config = defaultConfig) {
  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
  }

  try {
    if (url) {
      // Record navigation in telemetry if enabled
      let navigationTimerId;
      if (telemetry) {
        navigationTimerId = telemetry.startTimer('navigation', { url });
      }

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Stop navigation timer if started
      if (telemetry && navigationTimerId) {
        telemetry.stopTimer(navigationTimerId);
      }
    }

    // Extract components
    try {
      // Record extraction in telemetry if enabled
      let extractionTimerId;
      if (telemetry) {
        extractionTimerId = telemetry.startTimer('extract-components', { url });
      }

      const components = await extractComponents(page, config);

      // Stop extraction timer if started
      if (telemetry && extractionTimerId) {
        telemetry.stopTimer(extractionTimerId, {
          componentsCount: components.length
        });
      }

      return {
        success: true,
        data: components,
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    } catch (evalError) {
      // Use logger if available or fall back to console
      (logger || console).error(`Error extracting components from page: ${evalError.message}`);

      // Record error in telemetry if enabled
      if (telemetry) {
        telemetry.recordMetric('extraction-error', 0, {
          url,
          error: evalError.message,
          type: evalError.name
        });
      }

      return {
        success: false,
        error: {
          message: evalError.message,
          type: evalError.name,
          stack: evalError.stack
        },
        telemetry: telemetry ? telemetry.getMetrics() : null
      };
    }
  } catch (error) {
    // Use logger if available or fall back to console
    (logger || console).error(`Error navigating to page: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('navigation-error', 0, {
        url,
        error: error.message,
        type: error.name
      });
    }

    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      },
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  }
}

/**
 * Extract components from crawled pages
 * @param {Object} [customConfig] - Custom configuration
 * @param {import('@playwright/test').Browser} [browser] - Playwright browser instance
 * @param {Object} [logger] - Logger object
 * @returns {Promise<Object>} Extracted components
 */
export async function extractComponentsFromCrawledPages(customConfig = {}, browser = null, logger = null) {
  // If logger is not provided, get a configured logger from config
  if (!logger) {
    const { getLogger } = await import('../utils/console-manager.js');
    logger = getLogger(customConfig, 'components');
  }
  // Merge configurations
  const config = { ...defaultConfig, ...customConfig };

  // Initialize telemetry if enabled
  let telemetry = null;
  if (config.telemetry && config.telemetry.enabled) {
    telemetry = telemetryManager.initTelemetry(config.telemetry);
    logger.log('Telemetry collection enabled');
  }

  logger.log('Starting component extraction...');

  // Variable to track if we should close the browser
  let shouldCloseBrowser = false;

  try {
    // Create screenshots directory if needed and enabled
    if (config.generateVisualizations && !fs.existsSync(config.screenshotsDir)) {
      fs.mkdirSync(config.screenshotsDir, { recursive: true });
    }

    // Read crawl results
    if (!fs.existsSync(config.inputFile)) {
      logger.error(`Input file not found: ${config.inputFile}`);
      return {
        success: false,
        error: {
          message: `Input file not found: ${config.inputFile}`,
          type: 'FileNotFoundError'
        }
      };
    }

    const crawlResults = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
    const pages = crawlResults.crawledPages.filter(page => page.status === 200);

    // Limit the number of pages if needed
    const pagesToAnalyze = config.maxPages === -1 ? pages : pages.slice(0, config.maxPages);

    logger.log(`Analyzing components on ${pagesToAnalyze.length} pages...`);

    // Use provided browser or create a new one
    shouldCloseBrowser = !browser;

    // Record browser creation in telemetry if enabled
    let browserTimerId;
    if (telemetry && !browser) {
      browserTimerId = telemetry.startTimer('browser-launch', {});
    }

    browser = browser || await chromium.launch();

    // Stop browser timer if started
    if (telemetry && browserTimerId) {
      telemetry.stopTimer(browserTimerId);
    }

    // Record context creation in telemetry if enabled
    let contextTimerId;
    if (telemetry) {
      contextTimerId = telemetry.startTimer('context-creation', {});
    }

    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      viewport: { width: 1920, height: 1080 }
    });

    // Stop context timer if started
    if (telemetry && contextTimerId) {
      telemetry.stopTimer(contextTimerId);
    }

    // Create a new page
    const page = await context.newPage();

    // Results object
    const results = {
      baseUrl: crawlResults.baseUrl,
      pagesAnalyzed: [],
      components: []
    };

    // Analyze each page
    for (let i = 0; i < pagesToAnalyze.length; i++) {
      const pageInfo = pagesToAnalyze[i];
      logger.log(`Analyzing page ${i + 1}/${pagesToAnalyze.length}: ${pageInfo.url}`);

      try {
        // Extract components from page with telemetry if enabled
        let result;
        if (telemetry) {
          result = await telemetryManager.withTelemetry(
            () => extractComponentsFromPage(page, pageInfo.url, config),
            'extract-components-page',
            { url: pageInfo.url, index: i },
            telemetry
          );
        } else {
          result = await extractComponentsFromPage(page, pageInfo.url, config);
        }

        const { success, data, error } = result;

        if (!success) {
          logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
          continue;
        }

        // Add to results
        results.pagesAnalyzed.push({
          url: pageInfo.url,
          title: pageInfo.title,
          path: pageInfo.path || new URL(pageInfo.url).pathname,
          bodyClasses: pageInfo.bodyClasses || ''
        });

        // Add components
        if (data && data.length > 0) {
          results.components.push({
            url: pageInfo.url,
            path: pageInfo.path || new URL(pageInfo.url).pathname,
            title: pageInfo.title,
            bodyClasses: pageInfo.bodyClasses || '',
            components: data
          });
        }
      } catch (error) {
        logger.error(`Error analyzing ${pageInfo.url}: ${error.message}`);
      }
    }

    // Generate component library
    logger.log('\nGenerating component library...');

    // Record component library generation in telemetry if enabled
    let componentLibrary;
    if (telemetry) {
      componentLibrary = await telemetryManager.withTelemetry(
        () => generateComponentLibrary(results.components),
        'generate-component-library',
        { componentsCount: results.components.reduce((total, page) => total + page.components.length, 0) },
        telemetry
      );
    } else {
      componentLibrary = generateComponentLibrary(results.components);
    }

    // Save component library to JSON file if enabled
    if (config.writeToFile) {
      // Record file writing in telemetry if enabled
      if (telemetry) {
        await telemetryManager.withTelemetry(
          () => {
            saveComponentLibrary(componentLibrary, config.outputFile);
            return true;
          },
          'save-component-library',
          { outputFile: config.outputFile },
          telemetry
        );
      } else {
        saveComponentLibrary(componentLibrary, config.outputFile);
      }

      logger.log(`Component library saved to: ${config.outputFile}`);

      // Generate HTML report with telemetry if enabled
      if (telemetry) {
        await telemetryManager.withTelemetry(
          () => {
            generateComponentReport(componentLibrary, config.reportFile);
            return true;
          },
          'generate-component-report',
          { reportFile: config.reportFile },
          telemetry
        );
      } else {
        generateComponentReport(componentLibrary, config.reportFile);
      }

      logger.log(`Component report saved to: ${config.reportFile}`);
    }

    // Generate telemetry report if enabled
    if (telemetry) {
      try {
        const report = telemetry.generateReport('component-extraction', {
          writeToFile: true
        });
        logger.log(`Telemetry report generated with ${report.summary.operationCount} operations`);
      } catch (error) {
        logger.error(`Error generating telemetry report: ${error.message}`);
      }
    }

    logger.log('\nComponent extraction completed!');
    logger.log(`Pages analyzed: ${results.pagesAnalyzed.length}`);
    logger.log(`Components found: ${results.components.reduce((total, page) => total + page.components.length, 0)}`);
    logger.log(`Component types: ${componentLibrary.types.length}`);

    return {
      success: true,
      data: {
        results,
        componentLibrary
      },
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } catch (error) {
    logger.error(`Component extraction failed: ${error.message}`);

    // Record error in telemetry if enabled
    if (telemetry) {
      telemetry.recordMetric('extraction-process-error', 0, {
        error: error.message,
        type: error.name
      });

      // Generate error telemetry report if enabled
      try {
        telemetry.generateReport('component-extraction-error', {
          writeToFile: true
        });
      } catch (reportError) {
        logger.error(`Error generating telemetry report: ${reportError.message}`);
      }
    }

    return {
      success: false,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      },
      telemetry: telemetry ? telemetry.getMetrics() : null
    };
  } finally {
    // Only close the browser if we created it
    if (browser && shouldCloseBrowser) {
      await browser.close();
    }
  }
}

/**
 * Generate a component library from extracted components
 * @param {Array} components - Array of components from different pages
 * @returns {Object} - Component library
 */
function generateComponentLibrary(components) {
  // Initialize component library
  const library = {
    types: [],
    components: {}
  };

  // Process each page's components
  for (const page of components) {
    for (const component of page.components) {
      // Add component type if it doesn't exist
      if (!library.types.includes(component.type)) {
        library.types.push(component.type);
      }

      // Add component to library
      if (!library.components[component.type]) {
        library.components[component.type] = [];
      }

      // Add page info to component
      const componentWithPage = {
        ...component,
        page: {
          url: page.url,
          path: page.path,
          title: page.title
        }
      };

      // Check if this component is already in the library
      const isDuplicate = library.components[component.type].some(existingComponent => {
        return existingComponent.html === component.html;
      });

      if (!isDuplicate) {
        library.components[component.type].push(componentWithPage);
      }
    }
  }

  return library;
}

/**
 * Save component library to a file
 * @param {Object} library - Component library
 * @param {string} outputFile - Output file path
 */
function saveComponentLibrary(library, outputFile) {
  // Create directory if it doesn't exist
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputFile, JSON.stringify(library, null, 2));
}

/**
 * Generate a recommended component structure
 * @param {Object} component - Component object
 * @returns {Object} - Recommended structure
 */
function generateRecommendedStructure(component) {
  // This is a simple heuristic and could be improved with more sophisticated analysis
  const structure = {
    name: component.type.charAt(0).toUpperCase() + component.type.slice(1),
    props: {},
    children: []
  };

  // Extract potential props from attributes
  for (const [key, value] of Object.entries(component.attributes)) {
    if (key !== 'class' && key !== 'id' && !key.startsWith('data-')) {
      structure.props[key] = value;
    }
  }

  // Extract data attributes as props
  for (const [key, value] of Object.entries(component.attributes)) {
    if (key.startsWith('data-') && key !== 'data-component' && key !== 'data-block' && key !== 'data-module') {
      const propName = key.replace('data-', '');
      structure.props[propName] = value;
    }
  }

  return structure;
}

/**
 * Generate CSS for a component
 * @param {Object} component - Component object
 * @returns {string} - CSS code
 */
function generateCssForComponent(component) {
  let css = `.${component.type} {\n`;

  // Add important styles
  const importantStyles = [
    'display', 'position', 'width', 'height', 'margin', 'padding',
    'background-color', 'color', 'font-family', 'font-size', 'font-weight',
    'border', 'border-radius', 'box-shadow', 'flex', 'grid'
  ];

  for (const style of importantStyles) {
    if (component.styles[style] && component.styles[style] !== 'none' && component.styles[style] !== 'normal') {
      css += `  ${style}: ${component.styles[style]};\n`;
    }
  }

  css += '}\n';
  return css;
}

/**
 * Generate JavaScript for a component
 * @param {Object} component - Component object
 * @returns {string} - JavaScript code
 */
function generateJsForComponent(component) {
  // Extract component name
  const componentName = component.type.charAt(0).toUpperCase() + component.type.slice(1).replace(/-([a-z])/g, g => g[1].toUpperCase());

  // Generate a simple component class
  let js = `class ${componentName} {\n`;
  js += '  constructor(element) {\n';
  js += '    this.element = element;\n';
  js += '    this.init();\n';
  js += '  }\n\n';
  js += '  init() {\n';
  js += '    // Initialize component\n';
  js += '    console.log("Initializing ' + componentName + '");\n';
  js += '  }\n';
  js += '}\n\n';
  js += `// Initialize all ${component.type} components\n`;
  js += `document.querySelectorAll('.${component.type}').forEach(element => {\n`;
  js += `  new ${componentName}(element);\n`;
  js += '});\n';

  return js;
}

/**
 * Generate a component report
 * @param {Object} library - Component library
 * @param {string} outputFile - Output file path
 */
function generateComponentReport(library, outputFile) {
  // Create report directory if it doesn't exist
  const reportDir = path.dirname(outputFile);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Use handlebars to generate the report
  const template = handlebars.compile(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Library</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      margin-top: 2em;
    }
    .component {
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 20px;
      margin-bottom: 20px;
    }
    .component-preview {
      border: 1px dashed #ccc;
      padding: 20px;
      margin-bottom: 10px;
      overflow: auto;
    }
    .component-code {
      background: #f5f5f5;
      padding: 15px;
      border-radius: 4px;
      overflow: auto;
      font-family: monospace;
      white-space: pre;
    }
    .component-info {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 20px;
    }
    .component-pages {
      margin-top: 10px;
    }
    .component-pages a {
      display: block;
      margin-bottom: 5px;
    }
    .tabs {
      display: flex;
      border-bottom: 1px solid #ddd;
      margin-bottom: 15px;
    }
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      border: 1px solid transparent;
      border-bottom: none;
      margin-bottom: -1px;
    }
    .tab.active {
      border-color: #ddd;
      border-radius: 4px 4px 0 0;
      background: #f5f5f5;
    }
    .tab-content {
      display: none;
    }
    .tab-content.active {
      display: block;
    }
  </style>
</head>
<body>
  <h1>Component Library</h1>
  <p>This report shows the components extracted from the site.</p>

  <h2>Component Types</h2>
  <ul>
    {{#each types}}
      <li><a href="#{{this}}">{{this}}</a> ({{lookup ../componentCounts this}})</li>
    {{/each}}
  </ul>

  {{#each types}}
    <h2 id="{{this}}">{{this}}</h2>
    <p>Found {{lookup ../componentCounts this}} instances of this component.</p>

    {{#each (lookup ../components this)}}
      <div class="component">
        <h3>{{../this}} #{{@index}}</h3>

        <div class="tabs">
          <div class="tab active" onclick="showTab(this, 'preview-{{../this}}-{{@index}}')">Preview</div>
          <div class="tab" onclick="showTab(this, 'html-{{../this}}-{{@index}}')">HTML</div>
          <div class="tab" onclick="showTab(this, 'css-{{../this}}-{{@index}}')">CSS</div>
          <div class="tab" onclick="showTab(this, 'js-{{../this}}-{{@index}}')">JavaScript</div>
          <div class="tab" onclick="showTab(this, 'structure-{{../this}}-{{@index}}')">Structure</div>
        </div>

        <div id="preview-{{../this}}-{{@index}}" class="tab-content active">
          <div class="component-preview">
            {{{html}}}
          </div>
        </div>

        <div id="html-{{../this}}-{{@index}}" class="tab-content">
          <div class="component-code">{{htmlEscaped}}</div>
        </div>

        <div id="css-{{../this}}-{{@index}}" class="tab-content">
          <div class="component-code">{{css}}</div>
        </div>

        <div id="js-{{../this}}-{{@index}}" class="tab-content">
          <div class="component-code">{{js}}</div>
        </div>

        <div id="structure-{{../this}}-{{@index}}" class="tab-content">
          <div class="component-code">{{structure}}</div>
        </div>

        <div class="component-info">
          <div>
            <h4>Properties</h4>
            <ul>
              {{#if id}}<li><strong>ID:</strong> {{id}}</li>{{/if}}
              <li><strong>Classes:</strong> {{classesJoined}}</li>
              <li><strong>Children:</strong> {{children}}</li>
              <li><strong>Text:</strong> {{textContent}}</li>
            </ul>
          </div>
          <div>
            <h4>Found on Pages</h4>
            <div class="component-pages">
              <a href="{{page.url}}" target="_blank">{{page.title}}</a>
            </div>
          </div>
        </div>
      </div>
    {{/each}}
  {{/each}}

  <script>
    function showTab(tabElement, contentId) {
      // Hide all tab contents in this component
      const component = tabElement.closest('.component');
      const tabContents = component.querySelectorAll('.tab-content');
      tabContents.forEach(content => content.classList.remove('active'));

      // Deactivate all tabs in this component
      const tabs = component.querySelectorAll('.tab');
      tabs.forEach(tab => tab.classList.remove('active'));

      // Activate selected tab and content
      tabElement.classList.add('active');
      document.getElementById(contentId).classList.add('active');
    }
  </script>
</body>
</html>
  `);

  // Prepare data for the template
  const templateData = {
    types: library.types,
    components: {},
    componentCounts: {}
  };

  // Process components for the template
  for (const type of library.types) {
    templateData.componentCounts[type] = library.components[type].length;
    templateData.components[type] = library.components[type].map(component => {
      return {
        ...component,
        htmlEscaped: component.html.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        css: generateCssForComponent(component).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        js: generateJsForComponent(component).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        structure: JSON.stringify(generateRecommendedStructure(component), null, 2).replace(/</g, '&lt;').replace(/>/g, '&gt;'),
        classesJoined: component.classes.join(', ')
      };
    });
  }

  // Generate the HTML and write to file
  const html = template(templateData);
  fs.writeFileSync(outputFile, html);
}

// Main export function for the components extractor
export default extractComponentsFromCrawledPages;

// For named exports
export {
  extractComponents,
  generateComponentLibrary,
  saveComponentLibrary,
  generateRecommendedStructure,
  generateCssForComponent,
  generateJsForComponent,
  generateComponentReport,
  COMPONENT_SELECTORS,
  prospectiveComponentMachineNames
};

